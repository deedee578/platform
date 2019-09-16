import {Injectable} from "@angular/core";
import {NgbModal, NgbModalRef} from "@ng-bootstrap/ng-bootstrap";
import {SuccessPopupComponent} from "../components/success-popup/success-popup.component";
import {ErrorPopupComponent} from "../components/error-popup/error-popup.component";

@Injectable({providedIn: "root"})
export class DialogsService {
  constructor(private dialogService: NgbModal) {}

  showSuccess(text: string): NgbModalRef {
    const modalRef = this.dialogService.open(SuccessPopupComponent, { centered: true });
    modalRef.componentInstance.text = text;
    return modalRef;
  }

  showError(text: string): NgbModalRef {
    const modalRef = this.dialogService.open(ErrorPopupComponent, { centered: true });
    modalRef.componentInstance.text = text;
    return modalRef;
  }
}
