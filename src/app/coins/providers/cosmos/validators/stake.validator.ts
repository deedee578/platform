import { CosmosService } from "../services/cosmos.service";
import { FormControl } from "@angular/forms";
import { timer } from "rxjs";
import { first, map, switchMap } from "rxjs/operators";
import BigNumber from "bignumber.js";

export const StakeValidator = (
  isStake: boolean,
  cosmos: CosmosService,
  validatorId: string
) => {
  return (input: FormControl) => {
    return timer(300).pipe(
      switchMap(() => {
        if (isStake) {
          return cosmos.getBalance();
        } else {
          return cosmos.getStakedToValidator(validatorId);
        }
      }),
      map(res => {
        if (input.value === "") {
          return null;
        }

        const val = new BigNumber(input.value);
        const minValue = new BigNumber(1);
        if (val.isLessThan(minValue) || val.isNaN()) {
          return { fill: true };
        }
        return val.isLessThanOrEqualTo(res) ? null : { max: res.toString() };
      }),
      first()
    );
  };
};
