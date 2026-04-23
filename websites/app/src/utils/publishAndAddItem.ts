import type { Address } from 'viem'
import ipfsPublish from 'utils/ipfsPublish'
import { getIPFSPath } from 'utils/getIPFSPath'
import type { DepositParams } from 'utils/fetchRegistryDeposits'
import type { Column } from 'utils/items'
import type { WrapWithToastReturnType } from 'utils/wrapWithToast'

interface Params {
  addItem: (
    registryAddress: Address,
    itemData: string,
    deposits: DepositParams,
  ) => Promise<WrapWithToastReturnType>
  registryAddress: Address
  columns: Column[]
  values: Record<string, string>
  deposits: DepositParams
}

export const publishAndAddItem = async ({
  addItem,
  registryAddress,
  columns,
  values,
  deposits,
}: Params) => {
  const item = { columns, values }
  const fileData = new TextEncoder().encode(JSON.stringify(item))
  const ipfsObject = await ipfsPublish('item.json', fileData)
  const ipfsPath = getIPFSPath(ipfsObject)
  return addItem(registryAddress, ipfsPath, deposits)
}
