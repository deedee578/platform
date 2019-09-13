import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NgxLoadersCssModule } from "ngx-loaders-css";
import { HttpClientModule } from "@angular/common/http";
import { LoadingButtonComponent } from "./loading-button/loading-button";

const components = [
  LoadingButtonComponent
];

@NgModule({
  declarations: [...components],
  imports: [CommonModule, HttpClientModule, NgxLoadersCssModule],
  exports: [...components]
})
export class ComponentsModule {}
