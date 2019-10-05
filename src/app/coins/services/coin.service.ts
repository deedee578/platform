// Interface should be implemented by each coin provider
import { Observable } from "rxjs";
import { CoinProviderConfig, StakeAction, StakeHolderList } from "../coin-provider-config";
import BigNumber from "bignumber.js";
import { BlockatlasValidator } from "@trustwallet/rpc/src/blockatlas/models/BlockatlasValidator";
import { CosmosDelegation } from "@trustwallet/rpc/src/cosmos/models/CosmosDelegation";
import { Delegation } from "../../dto";

export interface CoinService {
  getAnnualPercent(): Observable<number>;
  getBalance(): Observable<BigNumber>;
  getBalanceUSD(): Observable<BigNumber>;
  getStaked(): Observable<BigNumber>;
  getStakedUSD(): Observable<BigNumber>;
  getStakedToValidator(validator: string): Observable<BigNumber>;
  getAddressDelegations(address: string): Observable<Delegation[]>;
  getStakeHolders(): Observable<StakeHolderList>;
  getPriceUSD(): Observable<BigNumber>;
  getAddress(): Observable<string>;
  prepareStakeTx(
    action: StakeAction,
    addressTo: string,
    amount: BigNumber
  ): Observable<any>;
  getStakePendingBalance(): Observable<BigNumber>;
  getStakingRewards(): Observable<BigNumber>;
  getUnstakingDate(): Observable<Date>;
  getStakingInfo(): Observable<any>;
  broadcastTx(tx: string): Observable<any>;
  getValidators(): Observable<BlockatlasValidator[]>;
  getValidatorsById(validatorId: string): Observable<BlockatlasValidator>;
  hasProvider(): Observable<boolean>;
  isUnstakeEnabled(): Observable<boolean>;
  getConfig(): Observable<CoinProviderConfig>;
}
