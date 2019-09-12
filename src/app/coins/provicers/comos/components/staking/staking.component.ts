import { Component, ElementRef, ViewChild } from "@angular/core";
import { Observable, of } from "rxjs";
import { CosmosService } from "../../services/cosmos.service";
import { catchError, map, switchMap } from "rxjs/operators";
import { LoadersCSS } from "ngx-loaders-css";
import { ActivatedRoute } from "@angular/router";
import { CosmosAccount } from "@trustwallet/rpc";
import { StakeAction } from "../../../../coin-provider-config";
import { CosmosStakingInfo } from "@trustwallet/rpc/lib/cosmos/models/CosmosStakingInfo";

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
  info: Observable<CosmosStakingInfo>;

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
    this.info = this.cosmos.getStakingInfo();
  }

  sendTx(action: StakeAction) {
    const amount = this.inputElement.nativeElement.value * 1000000;

    this.myAddress
      .pipe(
        switchMap(address => {
          return this.cosmos.getAccountOnce(address);
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
        switchMap(result => {
          return this.cosmos.broadcastTx(result);
        }),
        catchError(error => {
          alert(error);
          return of(error);
        })
      )
      .subscribe(result => {
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
