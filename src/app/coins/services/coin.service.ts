// Interface should be implemented by each coin provider
import {Observable} from "rxjs";
import {StakeHolderList} from "../coin-provider-config";
import BigNumber from "bignumber.js";
import {CosmosStakingInfo} from "@trustwallet/rpc/lib/cosmos/models/CosmosStakingInfo";

export interface CoinService {
  getAnnualPercent(): Observable<number>;
  getBalance(): Observable<BigNumber>;
  getBalanceUSD(): Observable<BigNumber>;
  getStaked(): Observable<BigNumber>;
  getStakedUSD(): Observable<BigNumber>;
  getStakeHolders(): Observable<StakeHolderList>;
  getPriceUSD(): Observable<BigNumber>;
  getAddress(): Observable<string>;
  stake(account: any, to: string, amount: BigNumber): Observable<string>;
  unstake(account: any, to: string, amount: BigNumber): Observable<string>;
  getStakePendingBalance(): Observable<BigNumber>;
  getStakingRewards(): Observable<BigNumber>;
  getUnstakingDate(): Observable<Date>;
  getStakingInfo(): Observable<CosmosStakingInfo>;
  broadcastTx(tx: string): Observable<any>;
}
