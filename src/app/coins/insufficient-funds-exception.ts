
export class InsufficientFundsException {
  message: string;
  code: string;
  constructor() {
    this.code = "insufficient_funds";
    this.message = "Insufficient funds to pay fees";
  }
}
