import type { Address } from 'viem'
import { Roles } from '@kleros/kleros-app'
import type { DepositParams } from 'utils/fetchRegistryDeposits'
import type { Column } from 'utils/items'
import type { WrapWithToastReturnType } from 'utils/wrapWithToast'

interface Params {
  addItem: (
    registryAddress: Address,
    itemData: string,
    deposits: DepositParams,
  ) => Promise<WrapWithToastReturnType>
  uploadFile: (file: File, role: Roles) => Promise<string | null>
  registryAddress: Address
  columns: Column[]
  values: Record<string, string>
  deposits: DepositParams
}

export const publishAndAddItem = async ({
  addItem,
  uploadFile,
  registryAddress,
  columns,
  values,
  deposits,
}: Params) => {
  const item = { columns, values }
  const file = new File([JSON.stringify(item)], 'item.json', {
    type: 'application/json',
  })
  const ipfsPath = await uploadFile(file, Roles.Generic)
  if (!ipfsPath) throw new Error('Failed to upload item metadata to IPFS.')
  return addItem(registryAddress, ipfsPath, deposits)
}
