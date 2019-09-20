import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CosmosService } from "../../services/cosmos.service";
import { map } from "rxjs/operators";

@Component({
  selector: "app-details",
  templateUrl: "./details.component.html",
  styleUrls: ["./details.component.scss"]
})
export class DetailsComponent {
  validatorId = this.activatedRoute.snapshot.params.validatorId;
  additionalInfo = this.cosmos.getStakingInfo().pipe(
    map(info => [
      {
        name: "Lock Time",
        value: `${info.timeFrame.day} days`
      }
    ])
  );

  constructor(
    public cosmos: CosmosService,
    private activatedRoute: ActivatedRoute
  ) {}
}
