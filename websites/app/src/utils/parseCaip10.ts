import { chains } from 'utils/chains'
import type { NetworkOption } from 'pages/Registries/SubmitItems/AddItemModal/RichAddressForm'

export const parseCaip10 = (
  caip10: string,
): { network: NetworkOption; address: string } => {
  const separatorIndex = caip10.lastIndexOf(':')
  const networkIdentifier = caip10.substring(0, separatorIndex)
  const address = caip10.substring(separatorIndex + 1)

  const match = chains.find(
    (c) => `${c.namespace}:${c.id}` === networkIdentifier,
  )

  return {
    network: { value: networkIdentifier, label: match?.label ?? '' },
    address,
  }
}
