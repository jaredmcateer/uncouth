import { convertVuexComputedFactory } from "./convertComputedFactory";

/**
 * @example
 * \@Getter('myNamespace/someGetter') getSomething: boolean;
 * // converts to
 * const getSomething = computed<boolean>(() => {
 *  return store.getter('myNamespace/someGetter');
 * })
 */
export const convertVuexGetter = convertVuexComputedFactory("Getter", "getters");
