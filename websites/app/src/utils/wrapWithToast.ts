import { toast, ToastPosition, Theme } from "react-toastify";
import { PublicClient, TransactionReceipt } from "viem";

import { parseWagmiError } from "./parseWagmiError";

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

type WrapWithToastReturnType = {
  status: boolean;
  result?: TransactionReceipt;
};

export const infoToast = (message: string) => toast.info(message, OPTIONS);
export const successToast = (message: string) => toast.success(message, OPTIONS);
export const errorToast = (message: string) => toast.error(message, OPTIONS);

export async function wrapWithToast(
  contractWrite: () => Promise<`0x${string}`>,
  publicClient: PublicClient
): Promise<WrapWithToastReturnType> {
  const loadingToast = toast.loading("Transaction initiated...", OPTIONS);
  
  try {
    const hash = await contractWrite();
    
    toast.update(loadingToast, {
      render: "Transaction is being mined...",
      type: "info",
      ...OPTIONS
    });
    
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash, 
      confirmations: 2 
    });
    
    if (receipt.status === "success") {
      toast.update(loadingToast, {
        render: "Transaction executed successfully!",
        type: "success",
        ...OPTIONS
      });
      return { status: true, result: receipt };
    } else {
      toast.update(loadingToast, {
        render: "Transaction reverted!",
        type: "error", 
        ...OPTIONS
      });
      return { status: false, result: receipt };
    }
  } catch (error) {
    const parsedError = parseWagmiError(error);
    toast.update(loadingToast, {
      render: parsedError,
      type: "error",
      ...OPTIONS
    });
    return { status: false };
  }
}

export async function catchShortMessage(promise: Promise<any>) {
  return await promise.catch((error) => toast.error(parseWagmiError(error), OPTIONS));
}
