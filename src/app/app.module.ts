import "reflect-metadata";
import { version } from "../../package.json";
import { BrowserModule } from "@angular/platform-browser";
import { NgModule, ErrorHandler, Injectable, Injector } from "@angular/core";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { RouterModule } from "@angular/router";
import { CoreModule } from "./core/core.module";
import { SharedModule } from "./shared/shared.module";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import * as Sentry from "@sentry/browser";
import { SentryErrorHandler } from "./sentry.service";

Sentry.init({
  dsn: "https://2083a18ff4264ba2a86704ee8d8bc445@sentry.io/1678583",
  release: version
});

@NgModule({
  declarations: [AppComponent],
  imports: [
    AppRoutingModule,
    CoreModule,
    SharedModule,
    RouterModule,
    BrowserModule,
    NgbModule
  ],
  providers: [{ provide: ErrorHandler, useClass: SentryErrorHandler }],
  bootstrap: [AppComponent]
})
export class AppModule {}
