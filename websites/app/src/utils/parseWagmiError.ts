type ErrorWithMetaMessages = {
  metaMessages?: string[];
  shortMessage?: string;
  message?: string;
};

/**
 * @param error
 * @description Tries to extract the human readable error message, otherwise reverts to error.message
 * @returns Human readable error if possible
 */
export const parseWagmiError = (error: unknown) => {
  if (!error) return "";
  
  const { metaMessages, shortMessage, message } = error as ErrorWithMetaMessages;
  const metaMessage = metaMessages?.[0];
  
  return metaMessage ?? shortMessage ?? message ?? "Unknown error";
};
