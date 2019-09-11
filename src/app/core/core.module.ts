import { NgModule } from "@angular/core";
import { MainComponent } from "./components/main/main.component";
import { RouterDataModule } from "../router-data/router-data.module";
import { SharedModule } from "../shared/shared.module";
import { CoinAccountInfoComponent } from "./components/coin-account-info/coin-account-info.component";

@NgModule({
  declarations: [MainComponent, CoinAccountInfoComponent],
  imports: [SharedModule, RouterDataModule],
  exports: [CoinAccountInfoComponent],
  providers: []
})
export class CoreModule {}
