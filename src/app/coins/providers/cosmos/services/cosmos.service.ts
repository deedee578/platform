import { Inject, Injectable } from "@angular/core";
import { BehaviorSubject, combineLatest, forkJoin, from, interval, Observable, of, timer } from "rxjs";
import { HttpClient } from "@angular/common/http";
import BigNumber from "bignumber.js";
import { first, map, skipWhile, switchMap } from "rxjs/operators";
import { CosmosAccount, CosmosBroadcastResult, CosmosUtils } from "@trustwallet/rpc";
import { BlockatlasValidator } from "@trustwallet/rpc/src/blockatlas/models/BlockatlasValidator";
import { CosmosConfigService } from "./cosmos-config.service";
import { CosmosProviderConfig } from "../cosmos.descriptor";
import { CoinService } from "../../../services/coin.service";
import {
  BALANCE_REFRESH_INTERVAL,
  STAKE_REFRESH_INTERVAL,
  StakeAction,
  StakeHolderList,
  TX_WAIT_CHECK_INTERVAL
} from "../../../coin-provider-config";
import { ExchangeRateService } from "../../../../shared/services/exchange-rate.service";
import { CoinType } from "@trustwallet/types";
import { CosmosRpcService } from "./cosmos-rpc.service";
import { CosmosUnboundInfoService } from "./cosmos-unbound-info.service";
import { CosmosStakingInfo } from "@trustwallet/rpc/lib/cosmos/models/CosmosStakingInfo";
import { CoinAtlasService } from "../../../services/coin-atlas.service";
import { AuthService } from "../../../../auth/services/auth.service";
import { CosmosTx } from "@trustwallet/rpc/lib/cosmos/models/CosmosTx";
import { Delegation } from "../../../../dto";

// TODO: There is plenty of old boilerplate here yet. Need to be refactored.

// Used for creating Cosmos service manually bypassing regular routing flow
export const CosmosServiceInjectable = [
  CosmosConfigService,
  HttpClient,
  AuthService,
  ExchangeRateService,
  CosmosRpcService,
  CosmosUnboundInfoService,
  CoinAtlasService
];

interface IAggregatedDelegationMap {
  [address: string]: BigNumber;
}

@Injectable()
export class CosmosService implements CoinService {
  private _manualRefresh: BehaviorSubject<boolean> = new BehaviorSubject(true);
  private readonly balance$: Observable<BigNumber>;
  private readonly stakedAmount$: Observable<BigNumber>;

  constructor(
    @Inject(CosmosConfigService)
    private config: Observable<CosmosProviderConfig>,
    private http: HttpClient,
    private authService: AuthService,
    private exchangeRateService: ExchangeRateService,
    private cosmosRpc: CosmosRpcService,
    private cosmosUnboundInfoService: CosmosUnboundInfoService,
    private atlasService: CoinAtlasService
  ) {
    this.cosmosRpc.setConfig(config);
    // Fires on address change or manual refresh
    const buildPipeline = (milliSeconds): Observable<string> =>
      combineLatest([this.getAddress(), this._manualRefresh]).pipe(
        switchMap((x: any[]) => {
          const [address, skip] = x;
          return timer(0, milliSeconds).pipe(map(() => address));
        })
      );

    this.balance$ = buildPipeline(BALANCE_REFRESH_INTERVAL).pipe(
      switchMap(address => {
        return this.requestBalance(address);
      }),
      map(uAtom => CosmosUtils.toAtom(uAtom))
    );

    this.stakedAmount$ = buildPipeline(STAKE_REFRESH_INTERVAL).pipe(
      switchMap(address => {
        return this.requestStakedAmount(address);
      }),
      map(uAtom => CosmosUtils.toAtom(uAtom) || new BigNumber(0))
    );
  }

  private requestBalance(address: string): Observable<BigNumber> {
    return this.getAccountOnce(address).pipe(
      map((account: CosmosAccount) => {
        // TODO: add type annotation once it exported by library (Coin)
        const balances = (account as CosmosAccount).coins;

        // TODO: check, probably with library toUpperCase is no needed here
        const result = balances.find(
          coin => coin.denom.toUpperCase() === "UATOM"
        );
        return result.amount;
      })
    );
  }

  private requestStakedAmount(address: string): Observable<BigNumber> {
    return this.getAddressDelegations(address).pipe(
      map(delegations => {
        const shares = (delegations && delegations.map(d => d.amount)) || [];
        return shares && shares.length
          ? BigNumber.sum(...shares)
          : new BigNumber(0);
      })
    );
  }

  private map2List(
    config: CosmosProviderConfig,
    address2stake: IAggregatedDelegationMap,
    validators: Array<BlockatlasValidator>
  ): StakeHolderList {
    return Object.keys(address2stake).map(address => {
      const validator = validators.find(v => v.id === address);
      return {
        ...validator,
        amount: config.toCoin(address2stake[address]),
        coin: config
      };
    });
  }

  private validatorsAndDelegations(): any[] {
    return [
      this.getValidators(),
      this.authService
        .getAddressFromAuthorized(CoinType.cosmos)
        .pipe(switchMap(address => this.getAddressDelegations(address)))
    ];
  }

  private address2StakeMap(): Observable<StakeHolderList> {
    return combineLatest([
      ...this.validatorsAndDelegations(),
      this.config
    ]).pipe(
      map((data: any[]) => {
        const approvedValidators: BlockatlasValidator[] = data[0];
        const myDelegations: Delegation[] = data[1];
        const config: CosmosProviderConfig = data[2];

        // TODO: double check most probably we no need that check
        if (!approvedValidators || !myDelegations) {
          return [];
        }

        const addresses = approvedValidators.map(d => d.id);

        // Ignore delegations to validators that isn't in a list of approved validators
        const filteredDelegations = myDelegations.filter(delegation => {
            // TODO: use map(Object) in case we have more that 10 approved validators
            return addresses.includes(delegation.address);
          }
        );

        const address2stakeMap = filteredDelegations.reduce((acc: IAggregatedDelegationMap, delegation) => {
            // TODO: Use BN or native browser BigInt() + polyfill
            const aggregatedAmount = acc[delegation.address] || new BigNumber(0);
            const sharesAmount = delegation.amount || new BigNumber(0);
            acc[delegation.address] = aggregatedAmount.plus(sharesAmount);
            return acc;
          }, {});

        return this.map2List(config, address2stakeMap, approvedValidators);
      }),
      first()
    );
  }

  private selectValidatorWithBestInterestRate(
    validators: BlockatlasValidator[]
  ) {
    return validators.reduce(
      (maxRate: number, validator: BlockatlasValidator) => {
        return maxRate < validator.reward.annual
          ? validator.reward.annual
          : maxRate;
      },
      0
    );
  }

  private getTxPayload(
    addressFrom: string,
    addressTo: string,
    amount: BigNumber
  ): any {
    return this.config.pipe(
      map(cfg => ({
        delegatorAddress: addressFrom,
        validatorAddress: addressTo,
        amount: {
          denom: "uatom",
          amount: amount.toFixed()
        }
      }))
    );
  }

  private getCosmosTxSkeleton(account: CosmosAccount): Observable<any> {
    return this.config.pipe(
      switchMap(config =>
        combineLatest([config.chainId(this.http, config.endpoint), of(config)])
      ),
      map(([chain, config]) => ({
        typePrefix: "auth/StdTx",
        accountNumber: account.accountNumber,
        sequence: account.sequence,
        chainId: chain,
        fee: {
          amounts: [
            {
              denom: "uatom",
              amount: new BigNumber(config.fee).toFixed()
            }
          ],
          gas: config.gas.toFixed()
        }
      }))
    );
  }

  getAddressDelegations(address: string): Observable<Delegation[]> {
    return this.cosmosRpc.rpc.pipe(
      switchMap(rpc => from(rpc.listDelegations(address))),
      map(list => list.map(d => ({
        address: d.validatorAddress,
        amount: d.shares
      })))
    );
  }

  private getAccountOnce(address: string): Observable<CosmosAccount> {
    return this.cosmosRpc.rpc.pipe(
      switchMap(rpc => from(rpc.getAccount(address)))
    );
  }

  getAnnualPercent(): Observable<number> {
    return this.getValidators().pipe(
      map(validators => this.selectValidatorWithBestInterestRate(validators))
    );
  }
  getBalanceUSD(): Observable<BigNumber> {
    return this.balance$.pipe(
      switchMap(balance => forkJoin([of(balance), this.getPriceUSD()])),
      map(([balance, price]) => balance.multipliedBy(price))
    );
  }
  getBalance(): Observable<BigNumber> {
    return this.balance$;
  }
  getStakedUSD(): Observable<BigNumber> {
    return this.stakedAmount$.pipe(
      switchMap(balance => forkJoin([of(balance), this.getPriceUSD()])),
      map(([balance, price]) => balance.multipliedBy(price))
    );
  }

  getStaked(): Observable<BigNumber> {
    return this.stakedAmount$;
  }

  getStakeHolders(): Observable<StakeHolderList> {
    return this.address2StakeMap();
  }

  getPriceUSD(): Observable<BigNumber> {
    return this.config.pipe(
      switchMap(config => this.exchangeRateService.getRate(config.coin))
    );
  }

  getAddress(): Observable<string> {
    return this.config.pipe(
      switchMap(config =>
        this.authService.getAddressFromAuthorized(config.coin)
      )
    );
  }

  private stake(
    account: CosmosAccount,
    to: string,
    amount: BigNumber
  ): Observable<string> {
    return combineLatest([
      this.getTxPayload(account.address, to, amount),
      this.getCosmosTxSkeleton(account)
    ]).pipe(
      map(([payload, txSkeleton]) => ({
        ...txSkeleton,
        ["stakeMessage"]: {
          ...payload
        }
      })),
      switchMap(tx => this.authService.signTransaction(CoinType.cosmos, tx))
    );
  }

  private unstake(
    account: CosmosAccount,
    to: string,
    amount: BigNumber
  ): Observable<string> {
    return combineLatest([
      this.getTxPayload(account.address, to, amount),
      this.getCosmosTxSkeleton(account)
    ]).pipe(
      map(([payload, txSkeleton]) => ({
        ...txSkeleton,
        ["unstakeMessage"]: {
          ...payload
        }
      })),
      switchMap(tx => this.authService.signTransaction(CoinType.cosmos, tx))
    );
  }

  getStakePendingBalance(): Observable<BigNumber> {
    return this.cosmosUnboundInfoService.getPendingBalance();
  }

  getStakingRewards(): Observable<BigNumber> {
    return this.cosmosUnboundInfoService.getRewards();
  }

  getUnstakingDate(): Observable<Date> {
    return this.cosmosUnboundInfoService.getReleaseDate();
  }

  getStakingInfo(): Observable<CosmosStakingInfo> {
    return this.cosmosUnboundInfoService.getStakingInfo();
  }

  broadcastTx(tx: string): Observable<CosmosBroadcastResult> {
    return this.cosmosRpc.rpc.pipe(
      switchMap(rpc => {
        console.log("broadcast tx");
        return from(rpc.broadcastTransaction(tx));
      })
    );
  }

  prepareStakeTx(
    action: StakeAction,
    addressTo: string,
    amount: BigNumber
  ): Observable<CosmosTx> {
    return this.getAddress().pipe(
      switchMap(address => {
        return this.getAccountOnce(address);
      }),
      switchMap((account: CosmosAccount) => {
        if (action === StakeAction.STAKE) {
          return this.stake(account, addressTo, amount);
        } else {
          return this.unstake(account, addressTo, amount);
        }
      }),
      switchMap(result => {
        return this.broadcastTx(result);
      }),
      switchMap(result => this.waitForTx(result.txhash))
    );
  }

  getStakedToValidator(validator: string): Observable<BigNumber> {
    return this.getStakeHolders().pipe(
      map(stakeholders => {
        const validatorStaked = stakeholders.find(
          holder => holder.id === validator
        );
        if (validatorStaked) {
          return validatorStaked.amount;
        }
        return new BigNumber(0);
      }),
      first()
    );
  }

  getValidators(): Observable<BlockatlasValidator[]> {
    return this.atlasService.getValidatorsFromBlockatlas(CoinType.cosmos);
  }
  getValidatorsById(validatorId: string): Observable<BlockatlasValidator> {
    return this.atlasService.getValidatorFromBlockatlasById(
      CoinType.cosmos,
      validatorId
    );
  }

  hasProvider(): Observable<boolean> {
    return this.authService.hasProvider(CoinType.cosmos);
  }

  isUnstakeEnabled(): Observable<boolean> {
    return of(true);
  }

  waitForTx(txhash: string): Observable<CosmosTx> {
    return interval(TX_WAIT_CHECK_INTERVAL).pipe(
      switchMap(() => this.getStakingTransactions()),
      map(txs => txs.find(tx => tx.txhash === txhash)),
      skipWhile(tx => !tx),
      first()
    );
  }

  getStakingTransactions(): Observable<CosmosTx[]> {
    return combineLatest([this.cosmosRpc.rpc, this.getAddress()]).pipe(
      switchMap(([rpc, address]) => rpc.listStakingTransactions(address))
    );
  }

  getConfig(): Observable<CosmosProviderConfig> {
    return this.config;
  }
}
