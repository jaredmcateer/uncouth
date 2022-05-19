import { convertVuexComputedFactory } from "./convertComputedFactory";

/**
 * @example
 * \@State('myNamespace/stateA') sA: number;
 * // converts to
 * const sA = computed(() => {
 *  return store.state.stateA;
 * });
 */
export const convertVuexState = convertVuexComputedFactory("State", "state");
