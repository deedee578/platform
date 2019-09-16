import { TrustProvider } from "@trustwallet/provider";
import { Injectable } from "@angular/core";

@Injectable({
    providedIn: "root"
})
export class AuthProviderService {
  constructor() {}

  get isProviderAvailable(): boolean {
    return TrustProvider.isAvailable;
  }
}
