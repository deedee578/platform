import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { combineLatest, Observable, Subscription } from "rxjs";
import { CosmosStakingInfo } from "@trustwallet/rpc/lib/cosmos/models/CosmosStakingInfo";
import { FormBuilder, FormGroup } from "@angular/forms";
import BigNumber from "bignumber.js";
import { ActivatedRoute, Router } from "@angular/router";
import { DialogsService } from "../../services/dialogs.service";
import { StakeValidator } from "../../../coins/validators/stake.validator";
import {
  CoinProviderConfig,
  StakeAction
} from "../../../coins/coin-provider-config";
import { map, shareReplay, switchMap, tap } from "rxjs/operators";
import { CosmosUtils } from "@trustwallet/rpc/lib";
import { CoinService } from "../../../coins/services/coin.service";

@Component({
  selector: "app-shared-staking",
  templateUrl: "./staking.component.html",
  styleUrls: ["./staking.component.scss"]
})
export class StakingComponent implements OnInit, OnDestroy {
  @Input() validatorId: string;
  @Input() dataSource: CoinService;
  @Input() config: Observable<CoinProviderConfig>;
  info: Observable<CosmosStakingInfo>;
  stakeForm: FormGroup;
  max$: Observable<any>;
  warn$: Observable<BigNumber>;
  monthlyEarnings$: Observable<BigNumber>;
  Math = Math;
  isLoading = false;

  confSubs: Subscription;

  constructor(
    private activatedRoute: ActivatedRoute,
    private fb: FormBuilder,
    private dialogService: DialogsService,
    private router: Router
  ) {}

  stake() {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    const amount = new BigNumber(this.stakeForm.get("amount").value).times(
      new BigNumber(1000000)
    );

    this.dataSource
      .prepareStakeTx(StakeAction.STAKE, this.validatorId, amount)
      .pipe(
        tap(() => (this.isLoading = false), e => (this.isLoading = false)),
        switchMap(_ => this.config)
      )
      .subscribe(config => {
        this.congratulate(config, this.stakeForm.get("amount").value);
      });
  }

  setMax() {
    this.max$.subscribe(({ normal }) => {
      this.stakeForm.get("amount").setValue(normal);
    });
  }

  warn(): Observable<BigNumber> {
    return combineLatest([
      this.stakeForm.get("amount").valueChanges,
      this.max$
    ]).pipe(
      map(([value, max]) => {
        const val = new BigNumber(value);
        if (val.isGreaterThan(max.normal) && val.isLessThan(max.min)) {
          return max.normal;
        }
        return null;
      }),
      shareReplay(1)
    );
  }

  getMonthlyEarnings(): Observable<BigNumber> {
    return combineLatest([
      this.stakeForm.get("amount").valueChanges,
      this.dataSource.getValidatorsById(this.validatorId)
    ]).pipe(
      map(([value, validator]) => {
        const val = new BigNumber(value);
        if (val.isNaN()) {
          return null;
        }
        return val.multipliedBy(validator.reward.annual / 100).dividedBy(12);
      }),
      shareReplay(1)
    );
  }
  getMax(): Observable<{ min: BigNumber; normal: BigNumber }> {
    return combineLatest([this.dataSource.getBalance(), this.config]).pipe(
      map(([balance, config]) => {
        const additional = CosmosUtils.toAtom(new BigNumber(config.fee));
        const normal = balance.minus(additional.multipliedBy(2));
        const min = balance.minus(additional);
        return {
          normal: normal.isGreaterThan(0) ? normal : new BigNumber(0),
          min: min.isGreaterThan(0) ? min : new BigNumber(0)
        };
      }),
      shareReplay(1)
    );
  }

  congratulate(config: CoinProviderConfig, sum: number) {
    const modalRef = this.dialogService.showSuccess(
      `You have successfully staked ${sum} ${config.currencySymbol}s`
    );
    modalRef.result.then(
      data => {
        this.router.navigate([`/`]);
      },
      reason => {
        this.router.navigate([`/`]);
      }
    );
  }

  ngOnInit(): void {
    this.info = this.dataSource.getStakingInfo();
    this.confSubs = this.config.subscribe(config => {
      this.stakeForm = this.fb.group({
        amount: [
          "",
          [],
          [StakeValidator(true, config, this.dataSource, this.validatorId)]
        ]
      });
    });

    this.max$ = this.getMax();
    this.warn$ = this.warn();
    this.monthlyEarnings$ = this.getMonthlyEarnings();
  }

  ngOnDestroy(): void {
    this.confSubs.unsubscribe();
  }
}
