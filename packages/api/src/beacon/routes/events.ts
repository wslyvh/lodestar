import {Epoch, phase0, Slot, ssz, StringType, RootHex, altair, UintNum64} from "@lodestar/types";
import {ContainerType, Type, VectorCompositeType} from "@chainsafe/ssz";
import {FINALIZED_ROOT_DEPTH} from "@lodestar/params";
import {RouteDef, TypeJson} from "../../utils/index.js";

// See /packages/api/src/routes/index.ts for reasoning and instructions to add new routes

export enum EventType {
  /**
   * The node has finished processing, resulting in a new head. previous_duty_dependent_root is
   * `get_block_root_at_slot(state, compute_start_slot_at_epoch(epoch - 1) - 1)` and
   * current_duty_dependent_root is `get_block_root_at_slot(state, compute_start_slot_at_epoch(epoch) - 1)`.
   * Both dependent roots use the genesis block root in the case of underflow.
   */
  head = "head",
  /** The node has received a valid block (from P2P or API) */
  block = "block",
  /** The node has received a valid attestation (from P2P or API) */
  attestation = "attestation",
  /** The node has received a valid voluntary exit (from P2P or API) */
  voluntaryExit = "voluntary_exit",
  /** Finalized checkpoint has been updated */
  finalizedCheckpoint = "finalized_checkpoint",
  /** The node has reorganized its chain */
  chainReorg = "chain_reorg",
  /** The node has received a valid sync committee SignedContributionAndProof (from P2P or API) */
  contributionAndProof = "contribution_and_proof",
  /** New or better optimistic header update available */
  lightClientOptimisticUpdate = "light_client_optimistic_update",
  /** New or better finality update available */
  lightClientFinalityUpdate = "light_client_finality_update",
  /** New or better light client update available */
  lightClientUpdate = "light_client_update",
}

export type EventData = {
  [EventType.head]: {
    slot: Slot;
    block: RootHex;
    state: RootHex;
    epochTransition: boolean;
    previousDutyDependentRoot: RootHex;
    currentDutyDependentRoot: RootHex;
    executionOptimistic: boolean;
  };
  [EventType.block]: {
    slot: Slot;
    block: RootHex;
    executionOptimistic: boolean;
  };
  [EventType.attestation]: phase0.Attestation;
  [EventType.voluntaryExit]: phase0.SignedVoluntaryExit;
  [EventType.finalizedCheckpoint]: {
    block: RootHex;
    state: RootHex;
    epoch: Epoch;
    executionOptimistic: boolean;
  };
  [EventType.chainReorg]: {
    slot: Slot;
    depth: UintNum64;
    oldHeadBlock: RootHex;
    newHeadBlock: RootHex;
    oldHeadState: RootHex;
    newHeadState: RootHex;
    epoch: Epoch;
    executionOptimistic: boolean;
  };
  [EventType.contributionAndProof]: altair.SignedContributionAndProof;
  [EventType.lightClientOptimisticUpdate]: altair.LightClientOptimisticUpdate;
  [EventType.lightClientFinalityUpdate]: altair.LightClientFinalityUpdate;
  [EventType.lightClientUpdate]: altair.LightClientUpdate;
};

export type BeaconEvent = {[K in EventType]: {type: K; message: EventData[K]}}[EventType];

export type Api = {
  /**
   * Subscribe to beacon node events
   * Provides endpoint to subscribe to beacon node Server-Sent-Events stream.
   * Consumers should use [eventsource](https://html.spec.whatwg.org/multipage/server-sent-events.html#the-eventsource-interface)
   * implementation to listen on those events.
   *
   * @param topics Event types to subscribe to
   * @returns Opened SSE stream.
   */
  eventstream(topics: EventType[], signal: AbortSignal, onEvent: (event: BeaconEvent) => void): void;
};

export const routesData: {[K in keyof Api]: RouteDef} = {
  eventstream: {url: "/eth/v1/events", method: "GET"},
};

export type ReqTypes = {
  eventstream: {
    query: {topics: EventType[]};
  };
};

// It doesn't make sense to define a getReqSerializers() here given the exotic argument of eventstream()
// The request is very simple: (topics) => {query: {topics}}, and the test will ensure compatibility server - client

export function getTypeByEvent(): {[K in EventType]: Type<EventData[K]>} {
  const stringType = new StringType();
  return {
    [EventType.head]: new ContainerType(
      {
        slot: ssz.Slot,
        block: stringType,
        state: stringType,
        epochTransition: ssz.Boolean,
        previousDutyDependentRoot: stringType,
        currentDutyDependentRoot: stringType,
        executionOptimistic: ssz.Boolean,
      },
      {jsonCase: "eth2"}
    ),

    [EventType.block]: new ContainerType(
      {
        slot: ssz.Slot,
        block: stringType,
        executionOptimistic: ssz.Boolean,
      },
      {jsonCase: "eth2"}
    ),

    [EventType.attestation]: ssz.phase0.Attestation,
    [EventType.voluntaryExit]: ssz.phase0.SignedVoluntaryExit,

    [EventType.finalizedCheckpoint]: new ContainerType(
      {
        block: stringType,
        state: stringType,
        epoch: ssz.Epoch,
        executionOptimistic: ssz.Boolean,
      },
      {jsonCase: "eth2"}
    ),

    [EventType.chainReorg]: new ContainerType(
      {
        slot: ssz.Slot,
        depth: ssz.UintNum64,
        oldHeadBlock: stringType,
        newHeadBlock: stringType,
        oldHeadState: stringType,
        newHeadState: stringType,
        epoch: ssz.Epoch,
        executionOptimistic: ssz.Boolean,
      },
      {jsonCase: "eth2"}
    ),

    [EventType.contributionAndProof]: ssz.altair.SignedContributionAndProof,

    [EventType.lightClientOptimisticUpdate]: new ContainerType(
      {
        syncAggregate: ssz.altair.SyncAggregate,
        attestedHeader: ssz.phase0.BeaconBlockHeader,
        signatureSlot: ssz.Slot,
      },
      {jsonCase: "eth2"}
    ),
    [EventType.lightClientFinalityUpdate]: new ContainerType(
      {
        attestedHeader: ssz.phase0.BeaconBlockHeader,
        finalizedHeader: ssz.phase0.BeaconBlockHeader,
        finalityBranch: new VectorCompositeType(ssz.Bytes32, FINALIZED_ROOT_DEPTH),
        syncAggregate: ssz.altair.SyncAggregate,
        signatureSlot: ssz.Slot,
      },
      {jsonCase: "eth2"}
    ),
    [EventType.lightClientUpdate]: ssz.altair.LightClientUpdate,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/explicit-function-return-type
export function getEventSerdes() {
  const typeByEvent = getTypeByEvent();

  return {
    toJson: (event: BeaconEvent): unknown => {
      const eventType = typeByEvent[event.type] as TypeJson<BeaconEvent["message"]>;
      return eventType.toJson(event.message);
    },
    fromJson: (type: EventType, data: unknown): BeaconEvent["message"] => {
      const eventType = typeByEvent[type] as TypeJson<BeaconEvent["message"]>;
      return eventType.fromJson(data);
    },
  };
}
