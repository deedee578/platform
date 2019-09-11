import { Injectable } from "@angular/core";
import { CoinService } from "../../coins/services/coin.service";
import { of } from "rxjs";
import { ServiceFactoryService } from "./service-factory.service";
import { Coins } from "../../coins/coins";

@Injectable({
  providedIn: "root"
})
export class CoinsReceiverService {
  private _blochchainServices: CoinService[];
  get blochchainServices(): CoinService[] {
    return this._blochchainServices;
  }

  constructor(si: ServiceFactoryService) {
    this._blochchainServices = Coins.map(coin =>
      si.getService(
        coin.config.injectClass,
        [
          {
            provide: coin.config.configToken,
            useValue: of(
              Object.keys(coin)
                .filter(key => key !== "config")
                .reduce((res, key) => {
                  res[key] = coin[key];
                  return res;
                }, {})
            )
          }
        ],
        coin.config.deps
      )
    );
  }
}
