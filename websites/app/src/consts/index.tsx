export const EMAIL_REGEX =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
export const TELEGRAM_REGEX = /^@\w{5,32}$/
export const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
export const ETH_SIGNATURE_REGEX = /^0x[a-fA-F0-9]{130}$/

const dapplookerApiKey = import.meta.env.REACT_APP_DAPPLOOKER_API_KEY
if (!dapplookerApiKey) {
  throw new Error('REACT_APP_DAPPLOOKER_API_KEY environment variable is not set.')
}
export const DAPPLOOKER_API_KEY = dapplookerApiKey

const subgraphGnosisEndpoint = import.meta.env.REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT
if (!subgraphGnosisEndpoint) {
  throw new Error('REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT environment variable is not set.')
}
export const SUBGRAPH_GNOSIS_ENDPOINT = subgraphGnosisEndpoint

const subgraphKlerosDisplayGnosisEndpoint = import.meta.env.REACT_APP_SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT
if (!subgraphKlerosDisplayGnosisEndpoint) {
  throw new Error('REACT_APP_SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT environment variable is not set.')
}
export const SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT = subgraphKlerosDisplayGnosisEndpoint

export const KLEROS_CDN_BASE = 'https://cdn.kleros.link'

export const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com'

// xDAI Curation Court ID on Kleros
export const XDAI_CURATION_COURT_ID = '1'

// DappLooker chart IDs
export const CURATORS_CHART_ID = 'f531beb6-120f-4fa9-b71d-5176488785d4'
export const TOTAL_SUBMISSIONS_CHART_ID = '70035d4e-d24c-43db-85e9-d66e60aaa1f9'
