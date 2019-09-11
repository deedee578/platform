import { Component, ElementRef, ViewChild } from "@angular/core";
import { Observable, of } from "rxjs";
import { CosmosService } from "../../services/cosmos.service";
import { catchError, map, switchMap } from "rxjs/operators";
import { LoadersCSS } from "ngx-loaders-css";
import { ActivatedRoute } from "@angular/router";
import { CosmosAccount } from "@trustwallet/rpc";
import { StakeAction } from "../../../../coin-provider-config";

@Component({
  selector: "app-test",
  templateUrl: "./staking.component.html",
  styleUrls: ["./staking.component.scss"]
})
export class StakingComponent {
  myAddress: Observable<string>;
  validatorId: string;
  action: string;
  isStakeAction: boolean;

  @ViewChild("input", { static: true })
  inputElement: ElementRef;

  loader: LoadersCSS = "ball-beat";
  bgColor = "white";
  isLoaded = true;

  constructor(
    private cosmos: CosmosService,
    private activatedRoute: ActivatedRoute
  ) {
    this.myAddress = this.cosmos.getAddress();
    this.validatorId = activatedRoute.snapshot.params.validatorId;
    this.action = activatedRoute.snapshot.params.action;
    this.isStakeAction = this.action === "stake";
  }

  sendTx(action: StakeAction) {
    const amount = this.inputElement.nativeElement.value * 1000000;

    this.myAddress
      .pipe(
        switchMap(address => {
          return this.cosmos.getAccountOnce$(address);
        }),
        switchMap((account: CosmosAccount) => {
          this.isLoaded = false;
          const addressTo = this.validatorId;
          if (action === StakeAction.STAKE) {
            return this.cosmos.stake(account, addressTo, amount.toString());
          } else {
            return this.cosmos.unstake(account, addressTo, amount.toString());
          }
        }),
        map(result => {
          try {
            return JSON.stringify(JSON.parse(result) as any);
          } catch (e) {
            // fix for iOS
            return result.substring(9, result.length - 2);
          }
        }),
        switchMap(result => {
          return this.cosmos.broadcastTx(result);
        }),
        catchError(error => {
          alert(JSON.stringify(error));
          return of(error);
        })
      )
      .subscribe(result => {
        // alert(result.txhash);
        this.isLoaded = true;
      });
  }

  stake() {
    this.sendTx(StakeAction.STAKE);
  }

  unStake() {
    this.sendTx(StakeAction.UNSTAKE);
  }
}
