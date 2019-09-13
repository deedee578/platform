import { Injectable } from "@angular/core";
import { TrustProvider } from "@trustwallet/provider";
import { Account, CoinType } from "@trustwallet/types";
import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";
import { fromPromise } from "rxjs/internal-compatibility";

@Injectable({
  providedIn: "root"
})
export class AccountService {
  constructor() {}

  getAddress(coin: CoinType): Observable<string> {
    return fromPromise(TrustProvider.getAccounts()).pipe(
      map(accounts => {
        const account = accounts.find((a: Account) => a.network === coin);
        if (!account) {
          throw `No address found for ${coin}`;
        }
        return account.address;
      })
    );
  }
}
