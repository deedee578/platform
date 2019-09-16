import { Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-success-popup",
  templateUrl: "./success-popup.component.html",
  styleUrls: ["./success-popup.component.scss"]
})
export class SuccessPopupComponent {
  @Input() text;

  constructor(public activeModal: NgbActiveModal) {}
}
