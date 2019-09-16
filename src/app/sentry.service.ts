import { ErrorHandler, Injectable, Injector } from "@angular/core";
import { ErrorsService } from "./shared/services/errors/errors.service";
import * as Sentry from "@sentry/browser";

@Injectable({ providedIn: "root" })
export class SentryErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}
  handleError(error) {
    console.error(error);
    this.injector.get(ErrorsService).showError(error);
    const eventId = Sentry.captureException(error.originalError || error);
    // Sentry.showReportDialog({ eventId });
  }
}
