import { CosmosService } from "../services/cosmos.service";
import { FormControl } from "@angular/forms";
import { timer } from "rxjs";
import { first, map, switchMap } from "rxjs/operators";
import BigNumber from "bignumber.js";
import { CosmosProviderConfig } from "../cosmos.descriptor";
import { CosmosUtils } from "@trustwallet/rpc/lib";

export const StakeValidator = (
  isStake: boolean,
  config: CosmosProviderConfig,
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
        const minValue = CosmosUtils.toAtom(
          new BigNumber(config.gas + config.fee)
        );
        if (val.isLessThan(minValue) || val.isNaN()) {
          return { min: minValue.toString() };
        }
        return val.isLessThanOrEqualTo(res) ? null : { max: res.toString() };
      }),
      first()
    );
  };
};
