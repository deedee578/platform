import { CoinDescriptor, CoinProviderConfig } from "./coin-provider-config";
import { CoinType } from "@trustwallet/types";
import { environment } from "../../environments/environment";
import {
  CosmosChainId,
  CosmosCoinConfig,
  CosmosProviderConfig
} from "./providers/cosmos/cosmos.descriptor";

export const Coins: CoinProviderConfig[] = [
  CoinDescriptor<CosmosProviderConfig>({
    network: "cosmos",
    coin: CoinType.cosmos,
    chainId: CosmosChainId,
    endpoint: environment.cosmosEndpoint,
    currencyName: "Cosmos",
    currencySymbol: "ATOM",
    iconUri:
      "https://assets.trustwalletapp.com/blockchains/cosmos/info/logo.png",
    config: CosmosCoinConfig,
    gas: 20000,
    fee: 5000
  })
];
