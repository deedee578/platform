import { Component, Inject } from "@angular/core";
import { Observable } from "rxjs";
import { CosmosService } from "../../services/cosmos.service";
import { ActivatedRoute, Router } from "@angular/router";
import { StakeAction } from "../../../../coin-provider-config";
import { CosmosStakingInfo } from "@trustwallet/rpc/lib/cosmos/models/CosmosStakingInfo";
import { FormBuilder, FormGroup } from "@angular/forms";
import { StakeValidator } from "../../validators/stake.validator";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SuccessPopupComponent } from "../../../../../shared/components/success-popup/success-popup.component";
import { tap } from "rxjs/operators";
import BigNumber from "bignumber.js";
import { DialogsService } from "../../../../../shared/services/dialogs.service";
import { CosmosConfigService } from "../../services/cosmos-config.service";
import { CosmosProviderConfig } from "../../cosmos.descriptor";

@Component({
  selector: "app-test",
  templateUrl: "./staking.component.html",
  styleUrls: ["./staking.component.scss"]
})
export class StakingComponent {
  myAddress: Observable<string>;
  validatorId: string;
  info: Observable<CosmosStakingInfo>;
  stakeForm: FormGroup;
  max$ = this.cosmos.getBalance();
  Math = Math;
  isLoading = false;

  constructor(
    @Inject(CosmosConfigService)
    private config: Observable<CosmosProviderConfig>,
    private cosmos: CosmosService,
    private activatedRoute: ActivatedRoute,
    private fb: FormBuilder,
    private dialogService: DialogsService,
    private router: Router
  ) {
    this.myAddress = this.cosmos.getAddress();
    this.validatorId = activatedRoute.snapshot.params.validatorId;
    this.info = this.cosmos.getStakingInfo();
    const s = this.config.subscribe(config => {
      this.stakeForm = this.fb.group({
        amount: [
          "",
          [],
          [StakeValidator(true, config, this.cosmos, this.validatorId)]
        ]
      });
    });
  }

  stake() {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    const amount = new BigNumber(this.stakeForm.get("amount").value).times(
      new BigNumber(1000000)
    );

    this.cosmos
      .sendTx(StakeAction.STAKE, this.validatorId, amount)
      .pipe(tap(() => (this.isLoading = false), e => (this.isLoading = false)))
      .subscribe(_ => {
        this.congratulate(this.stakeForm.get("amount").value);
      });
  }

  setMax() {
    const s = this.cosmos.getBalance().subscribe(balance => {
      this.stakeForm.get("amount").setValue(balance);
      s.unsubscribe();
    });
  }

  congratulate(sum: number) {
    const modalRef = this.dialogService.showSuccess(
      `You have successfully staked ${sum} ATOMs`
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
}
