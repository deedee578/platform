import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { DetailsComponent } from "./components/details/details.component";
import { StakingComponent } from "./components/staking/staking.component";
import { DelegatorsComponent } from "./components/delegators/delegators.component";
import { UnstakingComponent } from "./components/unstaking/unstaking.component";

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
    path: "details/:validatorId/stake",
    component: StakingComponent
  },
  {
    path: "details/:validatorId/unstake",
    component: UnstakingComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)]
})
export class CosmosProviderRoutingModule {}
