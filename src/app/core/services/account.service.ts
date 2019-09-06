import { Injectable } from "@angular/core";
import { TrustProvider } from "@trustwallet/provider";
import { Account, CoinType } from "@trustwallet/types";
import { BehaviorSubject, Observable } from "rxjs";
import { filter } from "rxjs/operators";

@Injectable({
  providedIn: "root"
})
export class AccountService {
  private addressSubject: BehaviorSubject<string> = new BehaviorSubject(null);
  address$: Observable<string>;

  get address(): string {
    return this.addressSubject.value;
  }

  constructor() {
    this.address$ = this.addressSubject.asObservable().pipe(
      // BehaviorSubject starts from null, so let's by pass only not null
      filter(addr => !!addr)
    );

    if (!TrustProvider.isAvailable) {
      // TODO: add input fields to the UI for debugging, or take / whath it from local storage
      // cosmos1nswq3fz33h8e84xw0tqxaxw4ggkmfgw5lxk4nt
      this.addressSubject.next("cosmos1cj7u0wpe45j0udnsy306sna7peah054upxtkzk");
      return;
    }

    TrustProvider.getAccounts().then(
      accounts => {
        try {
          // a.network on iOS
          // a.id on Android
          const account = accounts.find(
            (a: Account) => (a.network || (a as any).id) === CoinType.cosmos
          );
          this.addressSubject.next(account.address);
        } catch (err) {
          alert(err);
        }
      },
      err => {
        alert(err);
      }
    );
  }
}