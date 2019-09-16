import { Component } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { Router } from "@angular/router";
import { filter, map, startWith } from "rxjs/operators";
import { Location } from "@angular/common";
import {TrustProvider} from "@trustwallet/provider/lib";
import {AuthProviderService} from './shared/services/auth-provider.service';

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  showBackButton$: Observable<boolean>;

  constructor(
    private http: HttpClient,
    private router: Router,
    private location: Location,
    private auth: AuthProviderService,
  ) {
    this.showBackButton$ = this.router.events.pipe(
      filter((event: any) => event.url),
      map((event: any) => event.url !== "/"),
      startWith(false)
    );
  }

  get isTrustProviderAvailable(): boolean {
    return this.auth.isProviderAvailable;
  }

  goBack() {
    this.location.back();
  }
}
