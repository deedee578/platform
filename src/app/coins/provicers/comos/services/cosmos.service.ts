import { Inject, Injectable } from "@angular/core";
import {
  BehaviorSubject,
  combineLatest,
  forkJoin,
  from,
  Observable,
  of,
  timer
} from "rxjs";
import { HttpClient } from "@angular/common/http";
import BigNumber from "bignumber.js";
import { first, map, switchMap } from "rxjs/operators";
import {
  BlockatlasRPC,
  BlockatlasValidatorResult,
  CosmosAccount,
  CosmosBroadcastResult,
  CosmosUtils
} from "@trustwallet/rpc";
import { CosmosDelegation } from "@trustwallet/rpc/src/cosmos/models/CosmosDelegation";
import { AccountService } from "../../../../shared/services/account.service";
import { BlockatlasValidator } from "@trustwallet/rpc/src/blockatlas/models/BlockatlasValidator";
import { environment } from "../../../../../environments/environment";
import { CosmosConfigService } from "./cosmos-config.service";
import { CosmosProviderConfig } from "../cosmos.descriptor";
import { CoinService } from "../../../services/coin.service";
import { StakeHolderList } from "../../../coin-provider-config";
import { ExchangeRateService } from "../../../../shared/services/exchange-rate.service";
import { CoinType } from "@trustwallet/types";
import { TrustProvider } from "@trustwallet/provider/lib";
import { CosmosRpcService } from "./cosmos-rpc.service";
import { CosmosUnboundInfoService } from "./cosmos-unbound-info.service";
import { CosmosStakingInfo } from "@trustwallet/rpc/lib/cosmos/models/CosmosStakingInfo";

// TODO: There is plenty of old boilerplate here yet. Need to be refactored.

const BALANCE_REFRESH_INTERVAL = 60000;
const STAKE_REFRESH_INTERVAL = 115000;

// Used for creating Cosmos service manually bypassing regular routing flow
export const CosmosServiceInjectable = [
  CosmosConfigService,
  HttpClient,
  AccountService,
  ExchangeRateService,
  CosmosRpcService,
  CosmosUnboundInfoService
];

interface IAggregatedDelegationMap {
  [address: string]: BigNumber;
}

@Injectable()
export class CosmosService implements CoinService {
  private _manualRefresh: BehaviorSubject<boolean> = new BehaviorSubject(true);

  balance$: Observable<BigNumber>;
  stakedAmount$: Observable<BigNumber>;

  constructor(
    @Inject(CosmosConfigService)
    private config: Observable<CosmosProviderConfig>,
    private http: HttpClient,
    private accountService: AccountService,
    private exchangeRateService: ExchangeRateService,
    private cosmosRpc: CosmosRpcService,
    private cosmosUnboundInfoService: CosmosUnboundInfoService
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
      map((delegations: CosmosDelegation[]) => {
        const shares =
          (delegations && delegations.map((d: CosmosDelegation) => d.shares)) ||
          [];
        return BigNumber.sum(...shares);
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
        amount: CosmosUtils.toAtom(address2stake[address]),
        coin: config
      };
    });
  }

  private validatorsAndDelegations(): any[] {
    return [
      this.getValidatorsFromBlockatlas(),
      this.accountService
        .getAddress(CoinType.cosmos)
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
        const myDelegations: CosmosDelegation[] = data[1];
        const config: CosmosProviderConfig = data[2];

        // TODO: double check most probably we no need that check
        if (!approvedValidators || !myDelegations) {
          return [];
        }

        const addresses = approvedValidators.map(d => d.id);

        // Ignore delegations to validators that isn't in a list of approved validators
        const filteredDelegations = myDelegations.filter(
          (delegation: CosmosDelegation) => {
            // TODO: use map(Object) in case we have more that 10 approved validators
            return addresses.includes(delegation.validatorAddress);
          }
        );

        const address2stakeMap = filteredDelegations.reduce(
          (acc: IAggregatedDelegationMap, delegation: CosmosDelegation) => {
            // TODO: Use BN or native browser BigInt() + polyfill
            const aggregatedAmount =
              acc[delegation.validatorAddress] || new BigNumber(0);
            const sharesAmount = +delegation.shares || new BigNumber(0);
            acc[delegation.validatorAddress] = aggregatedAmount.plus(
              sharesAmount
            );
            return acc;
          },
          {}
        );

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
    amount: string
  ): any {
    return {
      delegatorAddress: addressFrom,
      validatorAddress: addressTo,
      amount: {
        denom: "uatom",
        amount: amount
      }
    };
  }

  private getCosmosTxSkeleton(account: CosmosAccount): Observable<any> {
    return this.config.pipe(
      switchMap(config => config.chainId(this.http)),
      map(chain => ({
        typePrefix: "auth/StdTx",
        accountNumber: account.accountNumber,
        sequence: account.sequence,
        chainId: chain,
        fee: {
          amounts: [
            {
              denom: "uatom",
              amount: "5000"
            }
          ],
          gas: "200000"
        }
      }))
    );
  }

  getAddressDelegations(address: string): Observable<CosmosDelegation[]> {
    return this.cosmosRpc.rpc.pipe(
      switchMap(rpc => from(rpc.listDelegations(address)))
    );
  }

  getValidatorsFromBlockatlas(): Observable<BlockatlasValidator[]> {
    return this.config.pipe(
      switchMap(config =>
        from(
          new BlockatlasRPC(
            environment.blockatlasEndpoint,
            "cosmos"
          ).listValidators()
        )
      ),
      map((resp: BlockatlasValidatorResult) => {
        return resp.docs;
      })
    );
  }

  getValidatorFromBlockatlasById(validatorId): Observable<BlockatlasValidator> {
    return this.getValidatorsFromBlockatlas().pipe(
      map((validators: BlockatlasValidator[]) => {
        return validators.find((validator: BlockatlasValidator) => {
          return validator.id === validatorId;
        });
      })
    );
  }

  getAccountOnce(address: string): Observable<CosmosAccount> {
    return this.cosmosRpc.rpc.pipe(
      switchMap(rpc => from(rpc.getAccount(address)))
    );
  }

  broadcastTx(tx: string): Observable<CosmosBroadcastResult> {
    return this.cosmosRpc.rpc.pipe(
      switchMap(rpc => from(rpc.broadcastTransaction(tx)))
    );
  }

  getAnnualPercent(): Observable<number> {
    return this.getValidatorsFromBlockatlas().pipe(
      map(validators => this.selectValidatorWithBestInterestRate(validators))
    );
  }
  getBalanceUSD(): Observable<BigNumber> {
    return this.balance$.pipe(
      switchMap(balance => forkJoin([of(balance), this.getPriceUSD()])),
      map(([balance, price]) => balance.multipliedBy(price))
    );
  }
  getStakedUSD(): Observable<BigNumber> {
    return this.stakedAmount$.pipe(
      switchMap(balance => forkJoin([of(balance), this.getPriceUSD()])),
      map(([balance, price]) => balance.multipliedBy(price))
    );
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
    return this.accountService.getAddress(CoinType.cosmos);
  }

  stake(
    account: CosmosAccount,
    to: string,
    amount: string
  ): Observable<string> {
    const payload = this.getTxPayload(account.address, to, amount);
    return this.getCosmosTxSkeleton(account)
      .pipe(
        map(txSkeleton =>
          ({
            ...txSkeleton,
            ["stakeMessage"]: {
              ...payload
            }
          })
        ),
        switchMap(tx =>
          from(TrustProvider.signTransaction(CoinType.cosmos, tx))
        )
      );
  }

  unstake(
    account: CosmosAccount,
    to: string,
    amount: string
  ): Observable<string> {
    const payload = this.getTxPayload(account.address, to, amount);
    return this.getCosmosTxSkeleton(account)
      .pipe(
        map(txSkeleton =>
          ({
            ...txSkeleton,
            ["unstakeMessage"]: {
              ...payload
            }
          })
        ),
        switchMap(tx => from(TrustProvider.signTransaction(CoinType.cosmos, tx)))
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
}
