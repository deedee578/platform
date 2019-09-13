import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NgxLoadersCssModule } from "ngx-loaders-css";
import { HttpClientModule } from "@angular/common/http";
import { ComponentsModule } from "./components/components.module";
import { ReactiveFormsModule } from "@angular/forms";

const modules = [
  CommonModule,
  HttpClientModule,
  NgxLoadersCssModule,
  ComponentsModule,
  ReactiveFormsModule
];

@NgModule({
  imports: [...modules],
  exports: [...modules],
  providers: []
})
export class SharedModule {}
