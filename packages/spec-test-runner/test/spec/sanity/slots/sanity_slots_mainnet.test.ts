import {join} from "path";
import {expect} from "chai";
import {config} from "@chainsafe/lodestar-config/lib/presets/mainnet";
import {BeaconState} from "@chainsafe/lodestar-types";
import {processSlots} from "@chainsafe/lodestar-beacon-state-transition";
import {describeDirectorySpecTest, InputType} from "@chainsafe/lodestar-spec-test-util/lib/single";
import {IProcessSlotsTestCase} from "./type";
import {SPEC_TEST_LOCATION} from "../../../utils/specTestCases";

describeDirectorySpecTest<IProcessSlotsTestCase, BeaconState>(
  "slot sanity mainnet",
  join(SPEC_TEST_LOCATION, "/tests/mainnet/phase0/sanity/slots/pyspec_tests"),
  (testcase) => {
    const state = testcase.pre;
    processSlots(config, state, state.slot + Number(testcase.slots));
    return state;
  },
  {
    // @ts-ignore
    inputTypes: {
      slots: InputType.YAML,
    },
    // @ts-ignore
    sszTypes: {
      pre: config.types.BeaconState,
      post: config.types.BeaconState,
    },
    shouldError: (testCase) => {
      return !testCase.post;
    },
    timeout: 10000000,
    getExpected: (testCase) => testCase.post,
    expectFunc: (testCase, expected, actual) => {
      expect(config.types.BeaconState.equals(actual, expected)).to.be.true;
    },
  }
);
