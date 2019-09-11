import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NgxLoadersCssModule } from "ngx-loaders-css";
import { HttpClientModule } from "@angular/common/http";

const components = [];

@NgModule({
  declarations: [...components],
  imports: [CommonModule, HttpClientModule, NgxLoadersCssModule],
  exports: [...components]
})
export class ComponentsModule {}
