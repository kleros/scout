import { createElement } from "react";
import { toast, type Id, type ToastPosition, type Theme } from "react-toastify";
import { PublicClient, TransactionReceipt } from "viem";

import { TransactionToast } from "components/TransactionToast";
import { GNOSIS_CHAIN_ID, getTxExplorerUrl } from "./chains";
import { isUserRejection, parseWagmiError } from "./parseWagmiError";

export const OPTIONS = {
  position: "top-center" as ToastPosition,
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "colored" as Theme,
};

export const ERROR_OPTIONS = {
  ...OPTIONS,
  autoClose: false as const,
};

/** Options for a toast that turns from "in progress" into a final state. */
const DONE_OPTIONS = { ...OPTIONS, isLoading: false, closeButton: true };
const DONE_ERROR_OPTIONS = { ...ERROR_OPTIONS, isLoading: false, closeButton: true };

export type WrapWithToastReturnType = {
  status: boolean;
  result?: TransactionReceipt;
};

export const infoToast = (message: string) => toast.info(message, OPTIONS);
export const successToast = (message: string) => toast.success(message, OPTIONS);
export const errorToast = (message: string) => toast.error(message, ERROR_OPTIONS);

const txBody = (message: string, hash?: `0x${string}`) =>
  createElement(TransactionToast, {
    message,
    explorerUrl: hash ? getTxExplorerUrl(GNOSIS_CHAIN_ID, hash) : undefined,
  });

/**
 * One toast that follows a multi-step action (uploads, sign-in, then a transaction) instead of
 * a new toast per step. Start it, move it along with `step`, and hand its id to wrapWithToast
 * (`{ toastId }`) so the transaction continues in the same toast.
 */
export const progressToast = {
  start: (message: string): Id =>
    toast.loading(message, { position: OPTIONS.position, theme: OPTIONS.theme }),
  step: (id: Id, message: string) => toast.update(id, { render: message }),
  succeed: (id: Id, message: string) =>
    toast.update(id, { ...DONE_OPTIONS, render: message, type: "success" }),
  fail: (id: Id, message: string) =>
    toast.update(id, { ...DONE_ERROR_OPTIONS, render: message, type: "error" }),
  /** For a choice the user made (such as declining in the wallet): close without a message. */
  dismiss: (id: Id) => toast.dismiss(id),
};

/**
 * Sends a transaction and follows it in a single toast: "Confirm in your wallet", then "sent"
 * with an explorer link, then confirmed or reverted. Declining in the wallet closes the toast
 * quietly. A receipt that is late is reported as still pending, not as a failure.
 *
 * The returned shape is unchanged: `status` is true only for a transaction confirmed (two blocks)
 * with success, and `result` is its receipt.
 */
export async function wrapWithToast(
  contractWrite: () => Promise<`0x${string}`>,
  publicClient: PublicClient,
  { toastId }: { toastId?: Id } = {}
): Promise<WrapWithToastReturnType> {
  const confirmInWallet = txBody("Confirm the transaction in your wallet.");
  const id =
    toastId ?? toast.loading(confirmInWallet, { position: OPTIONS.position, theme: OPTIONS.theme });
  if (toastId !== undefined) toast.update(id, { render: confirmInWallet });

  let hash: `0x${string}`;
  try {
    hash = await contractWrite();
  } catch (error) {
    if (isUserRejection(error)) toast.dismiss(id);
    else toast.update(id, { ...DONE_ERROR_OPTIONS, render: parseWagmiError(error), type: "error" });
    return { status: false };
  }

  toast.update(id, { render: txBody("Transaction sent. Waiting for confirmation...", hash) });

  try {
    const res: TransactionReceipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
    const status = res.status === "success";

    if (status) {
      toast.update(id, { ...DONE_OPTIONS, render: txBody("Transaction confirmed.", hash), type: "success" });
    } else {
      toast.update(id, {
        ...DONE_ERROR_OPTIONS,
        render: txBody("Transaction reverted: nothing changed, only the network fee was spent.", hash),
        type: "error",
      });
    }

    return { status, result: res };
  } catch {
    // The transaction was sent, but its receipt did not arrive in time. It may still confirm.
    toast.update(id, {
      ...DONE_ERROR_OPTIONS,
      render: txBody("Still waiting for confirmation. Follow the transaction on the explorer.", hash),
      type: "warning",
    });
    return { status: false };
  }
}

export async function catchShortMessage(promise: Promise<any>) {
  return await promise.catch((error) => toast.error(parseWagmiError(error), ERROR_OPTIONS));
}
