import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import BigNumber from "bignumber.js";
import { catchError, first, map, switchMap, tap } from "rxjs/operators";
import { CoinService } from "../../../services/coin.service";
import { StakeAction, StakeHolderList } from "../../../coin-provider-config";
import { ExchangeRateService } from "../../../../shared/services/exchange-rate.service";
import { TezosRpcService } from "./tezos-rpc.service";
import { TezosUnboundInfoService } from "./tezos-unbound-info.service";
import { AuthService } from "../../../../auth/services/auth.service";
import { ProviderUtils } from "../../provider-utils";
import { CoinAtlasService } from "../../../services/atlas/coin-atlas.service";
import { TezosConfigService } from "./tezos-config.service";
import { TezosProviderConfig } from "../tezos.descriptor";
import {
  BlockatlasDelegation,
  BlockatlasValidator,
  TezosContract,
  TezosHead
} from "@trustwallet/rpc";
import { combineLatest, forkJoin, from, Observable, of } from "rxjs";
import { CoinType } from "@trustwallet/types";
import { InsufficientFundsException } from "../../../insufficient-funds-exception";

export const TezosServiceInjectable = [
  TezosConfigService,
  HttpClient,
  AuthService,
  ExchangeRateService,
  TezosRpcService,
  TezosUnboundInfoService,
  CoinAtlasService,
  ProviderUtils
];

@Injectable()
export class TezosService implements CoinService {
  private readonly balance$: Observable<BigNumber>;
  private readonly stakedAmount$: Observable<BigNumber>;

  constructor(
    @Inject(TezosConfigService)
    private config: Observable<TezosProviderConfig>,
    private http: HttpClient,
    private authService: AuthService,
    private exchangeRateService: ExchangeRateService,
    private tezosRpc: TezosRpcService,
    private tronUnboundInfoService: TezosUnboundInfoService,
    private atlasService: CoinAtlasService,
    private providerUtils: ProviderUtils
  ) {
    this.tezosRpc.setConfig(config);

    this.balance$ = this.providerUtils.updatableBalance(
      this.getAddress.bind(this),
      this.requestBalance.bind(this),
      this.config
    );

    this.stakedAmount$ = this.providerUtils.updatableStakedAmount(
      this.getAddress.bind(this),
      this.requestStakedAmount.bind(this),
      this.config
    );
  }

  getAddress(): Observable<string> {
    return this.config.pipe(
      switchMap(config =>
        this.authService.getAddressFromAuthorized(config.coin)
      )
    );
  }

  getAddressDelegations(address: string): Observable<BlockatlasDelegation[]> {
    return this.config.pipe(
      switchMap(config =>
        this.atlasService.getDelegations(config.coin, address)
      ),
      map(batch => batch.delegations)
    );
  }

  getAnnualPercent(): Observable<number> {
    return of(7.0);
  }

  getBalanceCoins(): Observable<BigNumber> {
    return this.balance$;
  }

  getBalanceUSD(): Observable<BigNumber> {
    return this.balance$.pipe(
      switchMap(balance =>
        forkJoin([of(balance), this.getPriceUSD(), this.getStakedUSD()])
      ),
      map(([balance, price, staked]) =>
        balance.multipliedBy(price).minus(staked)
      )
    );
  }

  getBalanceUnits(): Observable<BigNumber> {
    return this.balance$.pipe(
      switchMap(balance => forkJoin([this.config, of(balance)])),
      map(([config, balance]) => config.toUnits(balance))
    );
  }

  getPriceUSD(): Observable<BigNumber> {
    return this.config.pipe(
      switchMap(config => this.exchangeRateService.getRate(config.coin))
    );
  }

  getStakeHolders(): Observable<StakeHolderList> {
    return this.providerUtils.address2StakeMap<BlockatlasDelegation>(
      this.config,
      this.getValidators.bind(this),
      this.getAddressDelegations.bind(this),
      delegation => delegation.delegator.id,
      delegation => delegation.value
    );
  }

  getStakePendingBalance(): Observable<BigNumber> {
    return of(new BigNumber(0));
  }

  getStaked(): Observable<BigNumber> {
    return this.stakedAmount$;
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

  getStakedUSD(): Observable<BigNumber> {
    return this.stakedAmount$.pipe(
      switchMap(balance =>
        forkJoin([this.config, of(balance), this.getPriceUSD()])
      ),
      map(([config, balance, price]) =>
        config.toCoin(balance).multipliedBy(price)
      )
    );
  }

  getStakingInfo(): Observable<any> {
    return of({});
  }

  getStakingRewards(): Observable<BigNumber> {
    return of(new BigNumber(0));
  }

  getUnstakingDate(): Observable<Date> {
    return of(new Date());
  }

  getValidators(): Observable<BlockatlasValidator[]> {
    return this.atlasService.getValidatorsFromBlockatlas(CoinType.tezos);
  }

  getValidatorsById(validatorId: string): Observable<BlockatlasValidator> {
    return this.atlasService.getValidatorFromBlockatlasById(
      CoinType.tezos,
      validatorId
    );
  }

  hasProvider(): Observable<boolean> {
    return this.authService.hasProvider(CoinType.tezos);
  }

  isUnstakeEnabled(): Observable<boolean> {
    return this.getAddress().pipe(
      switchMap(address => this.getAccountOnce(address)),
      map(account => account.delegate != null),
      catchError(() => of(false))
    );
  }

  prepareStakeTx(
    action: StakeAction,
    addressTo: string,
    amount: BigNumber
  ): Observable<any> {
    return this.getAddress().pipe(
      switchMap(address => {
        switch (action) {
          case StakeAction.STAKE:
            return this.stake(address, addressTo);
          case StakeAction.UNSTAKE:
            return this.unstake(address);
        }
      }),
      tap(hash => console.log(`Tezos tx hash: ${hash}`))
    );
  }

  broadcastTx(tx: string): Observable<string> {
    return this.tezosRpc.rpc.pipe(
      switchMap(rpc => from(rpc.broadcastTransaction(tx)))
    );
  }

  private getAccountOnce(address: string): Observable<TezosContract> {
    return this.tezosRpc.rpc.pipe(
      switchMap(rpc => from(rpc.getAccount(address)))
    );
  }

  private requestBalance(address: string): Observable<BigNumber> {
    return this.getAccountOnce(address).pipe(map(account => account.balance));
  }

  private getHead(): Observable<TezosHead> {
    return this.tezosRpc.rpc.pipe(switchMap(rpc => from(rpc.getHead())));
  }

  private getManagerKey(account: string): Observable<string> {
    return this.tezosRpc.rpc.pipe(
      switchMap(rpc => from(rpc.getManagerKey(account)))
    );
  }

  private requestStakedAmount(address: string): Observable<BigNumber> {
    return combineLatest([
      this.config,
      this.getAddressDelegations(address)
    ]).pipe(
      map(([config, delegations]) =>
        delegations.reduce(
          (acc, d) => acc.plus(config.toUnits(d.value)),
          new BigNumber(0)
        )
      )
    );
  }

  private unstake(fromAccount: string) {
    return combineLatest([
      this.config,
      this.getBalanceUnits()
    ]).pipe(
      map(([config, balance]) => {
        if (balance <= config.fee) {
          throw new InsufficientFundsException();
        }
        return balance;
      }),
      switchMap(_ => this.stake(fromAccount, null))
    );
  }

  private stake(fromAccount: string, toAccount: string): Observable<string> {
    return combineLatest([
      this.config,
      this.getHead(),
      this.getManagerKey(fromAccount),
      this.getAccountOnce(fromAccount)
    ]).pipe(
      map(([config, head, managerKey, account]) => {
        let reveal = [];
        let counter = account.counter.toNumber();
        if (managerKey == null) {
          reveal = [
            {
              source: fromAccount,
              fee: config.fee.toNumber(),
              counter: ++counter,
              gasLimit: config.gas.toNumber(),
              storageLimit: 0,
              kind: 107,
              revealOperationData: {
                publicKey: ""
              }
            }
          ];
        }

        return {
          operationList: {
            branch: head.hash,
            operations: [
              ...reveal,
              {
                source: fromAccount,
                fee: config.fee.toNumber(),
                counter: ++counter,
                gasLimit: config.gas.toNumber(),
                storageLimit: 0,
                kind: 110,
                delegationOperationData: {
                  delegate: toAccount
                }
              }
            ]
          }
        };
      }),
      switchMap(tx => this.authService.signTransaction(CoinType.tezos, tx)),
      switchMap(result => this.broadcastTx(result))
    );
  }
}
