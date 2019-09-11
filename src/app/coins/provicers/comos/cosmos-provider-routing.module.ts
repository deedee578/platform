import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { DetailsComponent } from "./components/details/details.component";
import { StakingComponent } from "./components/staking/staking.component";
import { DelegatorsComponent } from "./components/delegators/delegators.component";

const routes: Routes = [
  {
    path: "",
    component: DelegatorsComponent
  },
  {
    path: "delegators",
    component: DelegatorsComponent
  },
  {
    path: "details/:validatorId",
    component: DetailsComponent
  },
  {
    path: "details/:validatorId/:action",
    component: StakingComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)]
})
export class CosmosProviderRoutingModule {}
