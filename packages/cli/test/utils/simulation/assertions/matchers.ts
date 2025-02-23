import {AssertionMatcher} from "../interfaces.js";

export const everySlotMatcher: AssertionMatcher = ({slot}) => slot >= 0;
export const everyEpochMatcher: AssertionMatcher = ({slot, clock}) => clock.isLastSlotOfEpoch(slot);
export const neverMatcher: AssertionMatcher = () => false;
