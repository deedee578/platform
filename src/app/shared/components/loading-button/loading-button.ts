import {Component, Input} from "@angular/core";
import {LoadersCSS} from "ngx-loaders-css";

@Component({
  selector: "loading-button",
  templateUrl: "./loading-button.html",
  styleUrls: ["./loading-button.scss"]
})
export class LoadingButtonComponent {
  @Input() loading = false;
  @Input() disabled = false;
  @Input() click: () => void;

  loader: LoadersCSS = "ball-beat";
  constructor() {}
}
