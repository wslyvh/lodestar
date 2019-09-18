import {getBeaconProposerIndex} from "../../../chain/stateTransition/util";
import {assembleValidatorDuty} from "../../../chain/factory/duties";
import {BLSPubkey, Epoch, ValidatorDuty, ValidatorIndex} from "@chainsafe/eth2.0-types";
import {IBeaconDb} from "../../../db/api";
import {IBeaconConfig} from "@chainsafe/eth2.0-config";

export async function getValidatorDuties(
  config: IBeaconConfig,
  db: IBeaconDb,
  validatorPublicKeys: BLSPubkey[],
  epoch: Epoch
): Promise<ValidatorDuty[]> {
  const state = await db.state.getLatest();

  const validatorIndexes = await Promise.all(validatorPublicKeys.map(async publicKey => {
    return  await db.getValidatorIndex(publicKey);
  }));

  const blockProposerIndex = getBeaconProposerIndex(config, state);

  return validatorPublicKeys.map(
    (validatorPublicKey: BLSPubkey, index: number) => {
      const validatorIndex: ValidatorIndex = validatorIndexes[index] as ValidatorIndex;
      return assembleValidatorDuty(
        config,
        {
          publicKey: validatorPublicKey,
          index: validatorIndex
        },
        state,
        epoch,
        blockProposerIndex
      );
    }
  );
}