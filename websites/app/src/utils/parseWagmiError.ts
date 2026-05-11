type ViemError = {
  name?: string;
  shortMessage?: string;
  metaMessages?: string[];
  message?: string;
  cause?: unknown;
};

/**
 * Walks the cause chain looking for well-known error shapes so we can show a
 * legible message instead of viem's full multi-line dump (which embeds the raw
 * RPC request body and "Raw Call Arguments" — useless to end users).
 */
const friendlyForCommonErrors = (error: ViemError): string | null => {
  let current: ViemError | undefined = error;
  while (current) {
    if (current.name === "UserRejectedRequestError")
      return "Transaction rejected.";

    const text = ((current.shortMessage ?? "") + " " + (current.message ?? "")).toLowerCase();
    if (text.includes("insufficient funds") || text.includes("exceeds the balance"))
      return "Insufficient balance in your wallet to cover the deposit and gas.";
    if (text.includes("user rejected") || text.includes("user denied"))
      return "Transaction rejected.";

    current = current.cause as ViemError | undefined;
  }
  return null;
};

/**
 * @param error
 * @description Extracts a human-readable single-line message from a viem/wagmi
 * error. Falls back to error.message for non-viem errors.
 * @returns Human readable error if possible
 */
export const parseWagmiError = (error: unknown): string => {
  if (!error) return "";

  const err = error as ViemError;

  const friendly = friendlyForCommonErrors(err);
  if (friendly) return friendly;

  return (
    err.shortMessage ??
    err.metaMessages?.[0] ??
    err.message?.split("\n")[0] ??
    "Unknown error"
  );
};
