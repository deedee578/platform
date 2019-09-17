import { Injectable } from "@angular/core";
import { AccountService } from "../../../../shared/services/account.service";
import { CosmosRpcService } from "./cosmos-rpc.service";
import { combineLatest, Observable } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { CoinType } from "@trustwallet/types";
import { fromPromise } from "rxjs/internal-compatibility";
import BigNumber from "bignumber.js";
import { CosmosUnbond } from "@trustwallet/rpc/lib/cosmos/models/CosmosUnbond";
import { CosmosStakingInfo } from "@trustwallet/rpc/lib/cosmos/models/CosmosStakingInfo";

@Injectable({
  providedIn: "root"
})
export class CosmosUnboundInfoService {
  constructor(
    private cosmosRpcService: CosmosRpcService,
    private accountService: AccountService
  ) {}

  getUnbonds(): Observable<CosmosUnbond[]> {
    return combineLatest([
      this.cosmosRpcService.rpc,
      this.accountService.getAddress(CoinType.cosmos)
    ]).pipe(
      switchMap(([rpc, address]) =>
        fromPromise(rpc.listUnbondDelegations(address))
      )
    );
  }

  getReleaseDate(): Observable<Date> {
    return combineLatest([
      this.cosmosRpcService.rpc,
      this.accountService.getAddress(CoinType.cosmos)
    ]).pipe(
      switchMap(([rpc, address]) =>
        fromPromise(rpc.unstakingReleaseDate(address))
      )
    );
  }

  getStakingInfo(): Observable<CosmosStakingInfo> {
    return this.cosmosRpcService.rpc.pipe(
      switchMap(rpc => fromPromise(rpc.getStakingParameters()))
    );
  }

  getPendingBalance(): Observable<BigNumber> {
    return this.getUnbonds().pipe(
      map(unbounds => {
        try {
          return unbounds.reduce(
            (acc, unbound) => acc.plus(acc.plus(unbound.getPendingBalance())),
            new BigNumber(0)
          );
        } catch (e) {
          return new BigNumber(0);
        }
      })
    );
  }

  getRewards(): Observable<BigNumber> {
    return combineLatest([
      this.cosmosRpcService.rpc,
      this.accountService.getAddress(CoinType.cosmos)
    ]).pipe(
      switchMap(([rpc, address]) => fromPromise(rpc.getRewards(address)))
    );
  }
}
