import { CosmosRPC } from "@trustwallet/rpc";
import { Injectable } from "@angular/core";
import { Observable, ReplaySubject } from "rxjs";
import { CosmosProviderConfig } from "../cosmos.descriptor";

@Injectable({
  providedIn: "root"
})
export class CosmosRpcService {
  private _rpc = new ReplaySubject<CosmosRPC>();
  get rpc(): Observable<CosmosRPC> {
    return this._rpc;
  }

  setConfig(config: Observable<CosmosProviderConfig>): CosmosRpcService {
    config.subscribe(config => {
      this._rpc.next(new CosmosRPC(config.endpoint));
    });
    return this;
  }
}
