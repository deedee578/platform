import { forkJoin, Observable, of, ReplaySubject } from "rxjs";
import { Router } from "@angular/router";
import { catchError, map, shareReplay } from "rxjs/operators";
import { Component, OnInit } from "@angular/core";
import { Coins } from "../../../coins/coins";
import {
  CoinProviderConfig,
  StakeHolder,
  StakeHolderList
} from "../../../coins/coin-provider-config";
import { CoinsReceiverService } from "../../../shared/services/coins-receiver.service";
import BigNumber from "bignumber.js";

@Component({
  selector: "app-main",
  templateUrl: "./main.component.html",
  styleUrls: ["./main.component.scss"]
})
export class MainComponent implements OnInit {
  myStakeHolders$: Observable<StakeHolderList> = new ReplaySubject();
  annuals: { [key: string]: Observable<number> };
  addresses: { [key: string]: Observable<number> };
  pending: { [key: string]: Observable<BigNumber> };
  releaseDate: { [key: string]: Observable<Date> };
  info: { [key: string]: Observable<any> };
  blockchains = Coins;

  constructor(
    private router: Router,
    private coinsReceiverService: CoinsReceiverService
  ) {
    this.annuals = Coins.reduce(
      (annuals, coin, index) => ({
        ...annuals,
        [coin.network]: this.coinsReceiverService.blochchainServices[
          index
        ].getAnnualPercent()
      }),
      {}
    );
    this.addresses = Coins.reduce(
      (annuals, coin, index) => ({
        ...annuals,
        [coin.network]: this.coinsReceiverService.blochchainServices[index]
          .getAddress()
          .pipe(catchError(_ => of(true)))
      }),
      {}
    );
    this.pending = Coins.reduce(
      (annuals, coin, index) => ({
        ...annuals,
        [coin.network]: this.coinsReceiverService.blochchainServices[
          index
        ].getStakePendingBalance()
      }),
      {}
    );
    this.releaseDate = Coins.reduce(
      (annuals, coin, index) => ({
        ...annuals,
        [coin.network]: this.coinsReceiverService.blochchainServices[
          index
        ].getUnstakingDate()
      }),
      {}
    );
    this.info = Coins.reduce(
      (annuals, coin, index) => ({
        ...annuals,
        [coin.network]: this.coinsReceiverService.blochchainServices[
          index
        ].getStakingInfo()
      }),
      {}
    );
  }

  ngOnInit(): void {
    this.myStakeHolders$ = forkJoin(
      this.coinsReceiverService.blochchainServices.map(service =>
        service.getStakeHolders()
      )
    ).pipe(
      map(holder => {
        return holder.reduce((acc, stakeHolders, index) => {
          stakeHolders.forEach(sh => {
            sh.coin = Coins[index];
          });
          return [...acc, ...stakeHolders];
        }, []);
      }),
      shareReplay(1)
    ) as Observable<StakeHolderList>;
  }

  navigateToPosDelegatorsList(item: CoinProviderConfig) {
    this.router.navigate([`/blockchain/${item.network}`]);
  }

  navigateToMyStakeHoldersList(holder: StakeHolder) {
    this.router.navigate([
      `/blockchain/${holder.coin.network}/details/${holder.id}`
    ]);
  }
}
