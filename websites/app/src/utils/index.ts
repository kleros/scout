import { getTxExplorerUrl, GNOSIS_CHAIN_ID } from "utils/chains";

export const isUndefined = (maybeObject: any): maybeObject is undefined | null =>
  typeof maybeObject === "undefined" || maybeObject === null;

/**
 * Checks if a string is empty or contains only whitespace.
 */
export const isEmpty = (str: string): boolean => str.trim() === "";

export const getTxnExplorerLink = (hash: string) =>
  getTxExplorerUrl(GNOSIS_CHAIN_ID, hash);
