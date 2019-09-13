import { Component, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CosmosService } from "../../services/cosmos.service";
import { map, switchMap } from "rxjs/operators";
import { Observable, Subscription } from "rxjs";
import { BlockatlasValidator } from "@trustwallet/rpc/lib/blockatlas/models/BlockatlasValidator";
import { CosmosDelegation } from "@trustwallet/rpc/src/cosmos/models/CosmosDelegation";

@Component({
  selector: "app-details",
  templateUrl: "./details.component.html",
  styleUrls: ["./details.component.scss"]
})
export class DetailsComponent implements OnDestroy {
  validatorId: string;
  validator: BlockatlasValidator;
  stakedSum$: Observable<string>;
  subscription: Subscription;

  constructor(
    private router: Router,
    private cosmos: CosmosService,
    private activatedRoute: ActivatedRoute
  ) {
    this.validatorId = activatedRoute.snapshot.params.validatorId;

    this.stakedSum$ = this.cosmos.getAddress().pipe(
      switchMap((address: string) => {
        return this.getStakedAmount(address);
      })
    );

    // TODO: use async pipe and template variable definition, pluck from loaded before
    this.subscription = cosmos
      .getValidatorFromBlockatlasById(this.validatorId)
      .subscribe((validator: BlockatlasValidator) => {
        this.validator = validator;
      });
  }

  // Staked amount per validator - we have that
  getStakedAmount(address: string): Observable<string> {
    return this.cosmos.getAddressDelegations(address).pipe(
      map((response: CosmosDelegation[]) => {
        if (!response) {
          return "0";
        }

        // TODO: make it one reduce call, we have that functionality in main component
        const stakedSumArray = [];
        response.forEach((i: CosmosDelegation) => {
          if (i.validatorAddress === this.validatorId) {
            stakedSumArray.push(Number(i.shares) / 1000000);
          }
        });

        return stakedSumArray.reduce((a, b) => a + b, 0).toFixed(6);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  navigateToStake() {
    this.router.navigate([`stake`], { relativeTo: this.activatedRoute });
  }

  navigateToUnStake() {
    this.router.navigate([`unstake`], { relativeTo: this.activatedRoute });
  }
}
