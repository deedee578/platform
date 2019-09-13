/**
 * This is not a real service, but it looks like it from the outside.
 * It's just an InjectionTToken used to import the config object, provided from the outside
 */
import { InjectionToken } from "@angular/core";
import { CosmosProviderConfig } from "../cosmos.descriptor";

export const CosmosConfigService = new InjectionToken<CosmosProviderConfig>(
  "CosmosProviderConfig"
);
