// Interface should be implemented by each coin provider
import { Observable } from "rxjs";
import { StakeHolderList } from "../coin-provider-config";
import BigNumber from "bignumber.js";

export interface CoinService {
  getAnnualPercent(): Observable<number>;
  getBalanceUSD(): Observable<BigNumber>;
  getStakedUSD(): Observable<BigNumber>;
  getStakeHolders(): Observable<StakeHolderList>;
  getPriceUSD(): Observable<BigNumber>;
  getAddress(): Observable<string>;
  stake(account: any, to: string, amount: string): Observable<string>;
  unstake(account: any, to: string, amount: string): Observable<string>;
  unstake(account: any, to: string, amount: string): Observable<string>;
  getStakePendingBalance(): Observable<BigNumber>;
  getStakingRewards(): Observable<BigNumber>;
  getUnstakingDate(): Observable<Date>;
}
