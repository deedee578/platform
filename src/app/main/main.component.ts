import {combineLatest, Observable, of, timer} from 'rxjs';
import {IBlockchainDto} from '../dto';
import {Router} from '@angular/router';
import {CosmosService, CosmosServiceInstance} from '../services/cosmos.service';
import {map, shareReplay, switchMap} from 'rxjs/operators';
import {Component} from '@angular/core';
import {CosmosDelegation} from '@trustwallet/rpc/lib';
import {toAtom} from '../helpers';
import {BlockatlasValidator} from '@trustwallet/rpc/lib/blockatlas/models/BlockatlasValidator';

interface IAggregatedDelegationMap {
  // TODO: Use BN or native browser BigInt() + polyfill
  // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-2.html
  [address: string]: number;
}

interface IValidatorWithAmount extends BlockatlasValidator {
  amount: number; // TODO: Use big number or BigInt, show on UI using pipe
}

type StakeHolderList = Array<IValidatorWithAmount>;

function map2List(address2stake: IAggregatedDelegationMap, validators: Array<IValidatorWithAmount>): Array<IValidatorWithAmount> {
  return Object.keys(address2stake).map((address) => {
    const validator = validators.find(v => v.id === address);
    return {
      ...validator,
      amount: toAtom(address2stake[address]),
    };
  });
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent {

  blockchains: Array<IBlockchainDto> = [];
  myStakeHolders$: Observable<StakeHolderList>;
  cosmosInstance: CosmosServiceInstance;

  constructor(private router: Router, private cosmos: CosmosService) {

    this.cosmosInstance = this.cosmos.getInstance('cosmos1cj7u0wpe45j0udnsy306sna7peah054upxtkzk');

    const validatorsAndDelegations = [
      this.cosmosInstance.getValidators(),
      this.cosmosInstance.getDelegations()
    ];

//
    this.blockchains = [
      {
        blockchainId: 'cosmos',
        currencyName: 'Cosmos',
        currencySymbol: 'ATOM',
        annualRate: undefined,
        iconUri: 'https://assets.trustwalletapp.com/blockchains/cosmos/info/logo.png'
      }
    ];

    const address2StakeMap$: Observable<StakeHolderList> = combineLatest(validatorsAndDelegations).pipe(
      map((data: any[]) => {
          const [approvedValidators, myDelegations] = data;

          if (!approvedValidators || !myDelegations) {
            return [];
          }


          const bestCosmosInterestRate = approvedValidators.docs.reduce((bestRate: number, validator: BlockatlasValidator) => {
            return bestRate < validator.reward.annual
              ? validator.reward.annual
              : bestRate;
          }, 0);
          this.blockchains[0].annualRate = bestCosmosInterestRate;

          const addresses = approvedValidators.docs.map((d) => d.id);

          // Ignore delegations to validators that isn't in a list of approved validators
          const filteredDelegations = myDelegations.filter((delegation: CosmosDelegation) => {
            // TODO: use map(Object) in case we have more that 10 approved validators
            return addresses.includes(delegation.validatorAddress);
          });

          const address2stakeMap = filteredDelegations.reduce((acc: IAggregatedDelegationMap, delegation: CosmosDelegation) => {
            // TODO: Use BN or native browser BigInt() + polyfill
            const aggregatedAmount = acc[delegation.validatorAddress] || 0;
            const sharesAmount = +(delegation.shares) || 0;
            acc[delegation.validatorAddress] = aggregatedAmount + sharesAmount;
            return acc;
          }, {});

          return map2List(address2stakeMap, approvedValidators.docs);
        }
      ));


    this.myStakeHolders$ = timer(0, 10000).pipe(
      switchMap(() => {
        return address2StakeMap$;
      }),
      shareReplay(1)
    );
  }

  navigateToPosDelegatorsList(item: IBlockchainDto) {
    this.router.navigate([`/delegators/${item.blockchainId}`]);
  }

  navigateToMyStakeHoldersList(validator: BlockatlasValidator) {
    this.router.navigate([`/details/${validator.id}`]);
  }

}
