import type { Address } from 'viem'
import type { Id } from 'react-toastify'
import { Roles } from '@kleros/kleros-app'
import type { DepositParams } from 'utils/fetchRegistryDeposits'
import type { Column } from 'utils/items'
import type { WrapWithToastReturnType } from 'utils/wrapWithToast'
import { JSON_UPLOAD_ROLE } from 'utils/atlasRoles'
import { assertIpfsFileAvailable } from 'utils/ipfs'
import { infoToast, progressToast } from 'utils/wrapWithToast'

interface Params {
  addItem: (
    registryAddress: Address,
    itemData: string,
    deposits: DepositParams,
    txOptions?: { toastId?: Id },
  ) => Promise<WrapWithToastReturnType>
  uploadFile: (file: File, role: Roles) => Promise<string | null>
  registryAddress: Address
  columns: Column[]
  values: Record<string, string>
  deposits: DepositParams
  /** The submission's progress toast: the steps below and the transaction continue in it. */
  toastId?: Id
  /** Called once every upload is done, right before the transaction is prepared. */
  onUploaded?: () => void
}

export const publishAndAddItem = async ({
  addItem,
  uploadFile,
  registryAddress,
  columns,
  values,
  deposits,
  toastId,
  onUploaded,
}: Params) => {
  const item = { columns, values }
  const file = new File([JSON.stringify(item)], 'item.json', {
    type: 'application/json',
  })
  const ipfsPath = await uploadFile(file, JSON_UPLOAD_ROLE)
  if (!ipfsPath)
    throw new Error(
      "Couldn't upload the entry to IPFS. No transaction was sent. Try again.",
    )
  const checking = 'Checking that the upload can be read back from IPFS...'
  if (toastId !== undefined) progressToast.step(toastId, checking)
  else infoToast(checking)
  await assertIpfsFileAvailable(ipfsPath, 'item metadata')
  onUploaded?.()
  return addItem(registryAddress, ipfsPath, deposits, { toastId })
}
