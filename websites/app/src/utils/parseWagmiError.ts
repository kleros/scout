type ViemError = {
  name?: string;
  code?: number;
  shortMessage?: string;
  metaMessages?: string[];
  message?: string;
  cause?: unknown;
};

/** Walks an error and its `cause` chain. */
const walk = (error: unknown, visit: (current: ViemError) => boolean): boolean => {
  let current = error as ViemError | undefined;
  let depth = 0;
  while (current && depth < 10) {
    if (visit(current)) return true;
    current = current.cause as ViemError | undefined;
    depth++;
  }
  return false;
};

/**
 * True when the user declined the request in their wallet (a transaction or a signature).
 * Declining is a choice, not a failure: callers should close their feedback quietly.
 */
export const isUserRejection = (error: unknown): boolean =>
  walk(error, (current) => {
    if (current.name === "UserRejectedRequestError" || current.code === 4001) return true;
    const text = ((current.shortMessage ?? "") + " " + (current.message ?? "")).toLowerCase();
    return text.includes("user rejected") || text.includes("user denied") || text.includes("rejected the request");
  });

/** True when a request never reached the server (offline, DNS, CORS, a service that is down). */
export const isNetworkFailure = (error: unknown): boolean =>
  walk(error, (current) => {
    const text = ((current.shortMessage ?? "") + " " + (current.message ?? "")).toLowerCase();
    return text.includes("failed to fetch") || text.includes("networkerror") || text.includes("load failed");
  });

/**
 * Walks the cause chain looking for well-known error shapes so we can show a
 * legible message instead of viem's full multi-line dump (which embeds the raw
 * RPC request body and "Raw Call Arguments" — useless to end users).
 */
const friendlyForCommonErrors = (error: ViemError): string | null => {
  if (isUserRejection(error)) return "Transaction rejected.";
  let message: string | null = null;
  walk(error, (current) => {
    const text = ((current.shortMessage ?? "") + " " + (current.message ?? "")).toLowerCase();
    if (text.includes("insufficient funds") || text.includes("exceeds the balance")) {
      message = "Insufficient balance in your wallet to cover the deposit and gas.";
      return true;
    }
    return false;
  });
  if (message) return message;
  if (isNetworkFailure(error)) return "The service did not answer. Check your connection and try again.";
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
