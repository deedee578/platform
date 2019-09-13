import { NgModule } from "@angular/core";
import { MainComponent } from "./components/main/main.component";
import { RouterDataModule } from "../router-data/router-data.module";
import { SharedModule } from "../shared/shared.module";
import { CoinAccountInfoComponent } from "./components/coin-account-info/coin-account-info.component";
import { UseTrustWalletComponent } from "./components/use-trust-wallet/use-trust-wallet.component";

const components = [
  CoinAccountInfoComponent,
  UseTrustWalletComponent
];

@NgModule({
  declarations: [MainComponent, ...components],
  imports: [SharedModule, RouterDataModule],
  exports: [...components],
  providers: []
})
export class CoreModule {}
