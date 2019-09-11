import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { IPriceResponse } from "../../dto";
import { CoinType, FiatCoinType } from "@trustwallet/types";
import { HttpClient } from "@angular/common/http";
import BigNumber from "bignumber.js";
import { Utils } from "@trustwallet/api";

export const priceUri = "https://api.trustwallet.com/prices";

@Injectable({
  providedIn: "root"
})
export class ExchangeRateService {
  constructor(private http: HttpClient) {}

  getRate(coinType: CoinType): Observable<BigNumber> {
    return this.requestCoin2UsdRate(coinType);
  }

  private requestCoin2UsdRate(coinType: CoinType): Observable<BigNumber> {
    const addr = Utils.coinToAddress(coinType);
    const body = {
      currency: FiatCoinType.USD,
      tokens: [
        {
          contract: addr
        }
      ]
    };

    return this.http.post(priceUri, body).pipe(
      map((result: IPriceResponse) => {
        const coins = result.docs;
        const coin = coins.find(coin => coin.contract === addr);
        return new BigNumber(coin.price);
      })
    );
  }
}
