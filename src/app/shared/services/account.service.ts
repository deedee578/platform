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
    if (!TrustProvider.isAvailable) {
      return of("cosmos1cj7u0wpe45j0udnsy306sna7peah054upxtkzk");
      // return of("cosmos1xcn6f52mall95cw798qgftsvxvqrrdj535t8pm");
    }

    return fromPromise(TrustProvider.getAccounts()).pipe(
      map(accounts => {
        // a.network on iOS
        // a.id on Android
        const account = accounts.find(
          (a: Account) => (a.network || (a as any).id) === coin
        );
        if (!account) {
          throw `No address found for ${coin}`;
        }
        return account.address;
      })
    );
  }
}
