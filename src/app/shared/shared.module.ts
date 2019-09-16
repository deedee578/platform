import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NgxLoadersCssModule } from "ngx-loaders-css";
import { HttpClientModule } from "@angular/common/http";
import { ComponentsModule } from "./components/components.module";
import { ReactiveFormsModule } from "@angular/forms";
import {SuccessPopupComponent} from "./components/success-popup/success-popup.component";
import {ErrorPopupComponent} from "./components/error-popup/error-popup.component";

const modules = [
  CommonModule,
  HttpClientModule,
  NgxLoadersCssModule,
  ComponentsModule,
  ReactiveFormsModule
];

@NgModule({
  declarations: [SuccessPopupComponent, ErrorPopupComponent],
  entryComponents: [SuccessPopupComponent, ErrorPopupComponent],
  imports: [...modules],
  exports: [...modules],
  providers: []
})
export class SharedModule {}
