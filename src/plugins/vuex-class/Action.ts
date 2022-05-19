import { convertVuexMethodFactory } from "./convertMethodFactory";

/**
 * @example
 * \@Action('myNamespace/someAction') doSomeAction: (text: string) => Promise<void>
 * // converts to
 * const doSomeAction = async (text: string): Promise<void> => {
 *   return await store.dispatch('myNamespace/someAction', text);
 * }
 * @param node
 * @param options
 * @returns
 */
export const convertVuexAction = convertVuexMethodFactory("Action", "dispatch");
