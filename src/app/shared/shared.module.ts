import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NgxLoadersCssModule } from "ngx-loaders-css";
import { HttpClientModule } from "@angular/common/http";
import { ComponentsModule } from "./components/components.module";

const modules = [
  CommonModule,
  HttpClientModule,
  NgxLoadersCssModule,
  ComponentsModule
];

@NgModule({
  imports: [...modules],
  exports: [...modules],
  providers: []
})
export class SharedModule {}
