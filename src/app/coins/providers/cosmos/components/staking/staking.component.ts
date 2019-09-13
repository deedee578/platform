import {Component} from "@angular/core";
import {Observable} from "rxjs";
import {CosmosService} from "../../services/cosmos.service";
import {ActivatedRoute, Router} from "@angular/router";
import {StakeAction} from "../../../../coin-provider-config";
import {CosmosStakingInfo} from "@trustwallet/rpc/lib/cosmos/models/CosmosStakingInfo";
import {FormBuilder, FormGroup} from "@angular/forms";
import {StakeValidator} from "../../validators/stake.validator";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {SuccessPopupComponent} from "../success-popup/success-popup.component";
import {tap} from "rxjs/operators";
import BigNumber from "bignumber.js";

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
    private cosmos: CosmosService,
    private activatedRoute: ActivatedRoute,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private router: Router
  ) {
    this.myAddress = this.cosmos.getAddress();
    this.validatorId = activatedRoute.snapshot.params.validatorId;
    this.info = this.cosmos.getStakingInfo();
    this.stakeForm = this.fb.group({
      amount: ["", [], [StakeValidator(true, this.cosmos, this.validatorId)]]
    });
  }

  stake() {
    if (this.isLoading) { return; }

    this.isLoading = true;
    const amount = new BigNumber(this.stakeForm.get("amount").value)
      .times(new BigNumber(1000000));

    this.cosmos
      .sendTx(StakeAction.STAKE, this.validatorId, amount)
      .pipe(tap(() => this.isLoading = false, e => this.isLoading = false))
      .subscribe(_ => {
        this.congratulate(this.stakeForm.get("amount").value);
      }, e => {
        alert(e);
      });
  }

  setMax() {
    const s = this.cosmos.getBalance().subscribe(balance => {
      this.stakeForm.get("amount").setValue(balance);
      s.unsubscribe();
    });
  }

  congratulate(sum: number) {
    const modalRef = this.modalService.open(SuccessPopupComponent);
    modalRef.componentInstance.text = `You have successfully staked ${sum} ATOMs`;
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
