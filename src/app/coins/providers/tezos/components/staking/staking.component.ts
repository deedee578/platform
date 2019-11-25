import { Component, Inject, OnDestroy } from "@angular/core";
import { combineLatest, Observable, of, throwError, timer } from "rxjs";
import { TezosService } from "../../services/tezos.service";
import { TezosConfigService } from "../../services/tezos-config.service";
import { TezosProviderConfig } from "../../tezos.descriptor";
import BigNumber from "bignumber.js";
import { catchError, map, switchMap, tap } from "rxjs/operators";
import { BlockatlasValidator, TronTransaction } from "@trustwallet/rpc/lib";
import { StakeAction } from "../../../../coin-provider-config";
import { DialogsService } from "../../../../../shared/services/dialogs.service";
import { NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import { StakingStatusComponent } from "../staking-status/staking-status.component";

@Component({
  selector: "app-test",
  templateUrl: "./staking.component.html",
  styleUrls: ["./staking.component.scss"]
})
export class StakingComponent implements OnDestroy {
  stakingStatusRef: NgbModalRef;
  hasProvider = this.tezos.hasProvider();
  price = this.tezos.getPriceUSD();
  validators: Observable<Array<BlockatlasValidator>> = this.tezos.getValidators();
  balance = combineLatest([
    this.config,
    this.tezos.getBalanceCoins()
  ]).pipe(
    map(([config, balance]) => balance.toFormat(config.digits)),
    catchError(_ => of(new BigNumber(0)))
  );
  info = this.tezos.getStakingInfo();
  prepareTx = (
    action: StakeAction,
    addressTo: string,
    amount: BigNumber
  ): Observable<TronTransaction> => {
    this.stakingStatusRef = this.dialogsService.showModal(
      StakingStatusComponent,
      {
        backdrop: "static",
        keyboard: false
      }
    );
    return this.tezos.prepareStakeTx(action, addressTo, amount).pipe(
      tap(() => {
        this.stakingStatusRef.componentInstance.steps[0] = true;
      }),
      switchMap(result => timer(300).pipe(map(() => result))),
      tap(() => {
        this.stakingStatusRef.close();
      }),
      catchError(err => {
        this.stakingStatusRef.close();
        return throwError(err);
      })
    );
  };

  constructor(
    @Inject(TezosConfigService)
    public config: Observable<TezosProviderConfig>,
    public tezos: TezosService,
    public dialogsService: DialogsService
  ) {}

  formatMax(max: BigNumber): string {
    return (Math.floor(max.toNumber() * 1000) / 1000).toString();
  }

  ngOnDestroy(): void {
    if (this.stakingStatusRef) {
      this.stakingStatusRef.close();
    }
  }
}
