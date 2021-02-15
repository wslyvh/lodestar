import {IBeaconConfig} from "@chainsafe/lodestar-config";
import {Lightclient} from "@chainsafe/lodestar-types";
import {GENESIS_EPOCH} from "@chainsafe/lodestar-params";
import {getCurrentEpoch} from "../..";
import {getFlagsAndNumerators} from "../misc";
import {getFlagDeltas, getInactivityPenaltyDeltas} from "./balance_utils";
import {increaseBalance, decreaseBalance} from "../../util/balance";

export function processRewardsAndPenalties(config: IBeaconConfig, state: Lightclient.BeaconState): void {
  if (getCurrentEpoch(config, state) == GENESIS_EPOCH) {
    return;
  }

  const flagDeltas = getFlagsAndNumerators().map(([flag, numerator]) => getFlagDeltas(config, state, flag, numerator));
  const inactivityPenaltyDeltas = getInactivityPenaltyDeltas(config, state);
  flagDeltas.push(inactivityPenaltyDeltas);
  for (const [rewards, penalties] of flagDeltas) {
    for (let vIndex = 0; vIndex <= state.validators.length; vIndex++) {
      increaseBalance(state, vIndex, rewards[vIndex]);
      decreaseBalance(state, vIndex, penalties[vIndex]);
    }
  }
}
