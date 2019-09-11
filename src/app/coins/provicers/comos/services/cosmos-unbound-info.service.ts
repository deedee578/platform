import { Injectable } from "@angular/core";
import { AccountService } from "../../../../shared/services/account.service";
import { CosmosRpcService } from "./cosmos-rpc.service";
import { combineLatest, Observable } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { CoinType } from "@trustwallet/types";
import { fromPromise } from "rxjs/internal-compatibility";
import BigNumber from "bignumber.js";
import { CosmosUnbond } from "@trustwallet/rpc/lib/cosmos/models/CosmosUnbond";
import { CosmosUtils } from "@trustwallet/rpc";

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
    return this.getUnbonds().pipe(
      map(unbounds => {
        return unbounds.reduce(
          (acc, unbond) =>
            Math.max(
              acc,
              unbond.entries.reduce(
                (acc, entry) => Math.max(acc, entry.completionTime.getTime()),
                0
              )
            ),
          0
        );
      }),
      map(max => new Date(max))
    );
  }

  getPendingBalance(): Observable<BigNumber> {
    // TODO: temp fix until Webcore fix merged
    const f = (entries: any[]) => {
      return entries.filter(
        entry => entry.completionTime.getTime() > Date.now()
      );
    };
    return this.getUnbonds().pipe(
      map(unbounds => {
        return unbounds.reduce(
          (acc, unbound) =>
            acc.plus(
              CosmosUtils.toAtom(
                f(unbound.entries).reduce(
                  (acc, entry) => acc.plus(entry.balance),
                  new BigNumber(0)
                )
              )
            ),
          new BigNumber(0)
        );
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
