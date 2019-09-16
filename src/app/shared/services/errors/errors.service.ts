import Errors from "../../../../errors.json";

import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ErrorModel } from "./error.model";
import { DialogsService } from "../dialogs.service";

@Injectable({
  providedIn: "root"
})
export class ErrorsService {
  constructor(private dialogService: DialogsService) {}

  // TODO: There are raw errors values for each error code now. They gonna be replaced with translation codes in the future
  showError(error: ErrorModel): void {
    if (Errors[error.code]) {
      this.dialogService.showError(Errors[error.code]);
    } else {
      this.dialogService.showError((Errors as any).default);
    }
  }
}
