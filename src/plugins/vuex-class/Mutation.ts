import { convertVuexMethodFactory } from "./convertMethodFactory";

/**
 * @example
 * \@Mutation('myNamespace/SOME_MUTATION') mutateSomething: (text: string) => void
 * // converts to
 * const mutateSomething = (text: string): void => {
 *   return store.commit('myNamespace/SOME_MUTATION', text);
 * }
 * @param node
 * @param options
 * @returns
 */
export const convertVuexMutation = convertVuexMethodFactory("Mutation", "commit");
