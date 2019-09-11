import { Component } from "@angular/core";
import { combineLatest, Observable } from "rxjs";
import { map, shareReplay } from "rxjs/operators";
import { CoinsReceiverService } from "../../../shared/services/coins-receiver.service";

@Component({
  selector: "app-coin-account-info",
  templateUrl: "./coin-account-info.component.html",
  styleUrls: ["./coin-account-info.component.scss"]
})
export class CoinAccountInfoComponent {
  fiatBalance$: Observable<string>;
  fiatStaked$: Observable<string>;

  constructor(private coinsReceiverService: CoinsReceiverService) {
    this.fiatBalance$ = combineLatest(
      this.coinsReceiverService.blochchainServices.map(service =>
        service.getBalanceUSD()
      )
    ).pipe(
      map(balances => balances.reduce((acc, balance) => acc.plus(balance))),
      map(balance => balance.toString()),
      shareReplay(1)
    );

    this.fiatStaked$ = combineLatest(
      this.coinsReceiverService.blochchainServices.map(service =>
        service.getStakedUSD()
      )
    ).pipe(
      map(staked => staked.reduce((acc, balance) => acc.plus(balance))),
      map(staked => staked.toString()),
      shareReplay(1)
    );
  }
}
