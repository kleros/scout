export const EMAIL_REGEX =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
export const TELEGRAM_REGEX = /^@\w{5,32}$/
export const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
export const ETH_SIGNATURE_REGEX = /^0x[a-fA-F0-9]{130}$/

export const DAPPLOOKER_API_KEY =
  import.meta.env.REACT_APP_DAPPLOOKER_API_KEY || ''
export const SUBGRAPH_GNOSIS_ENDPOINT =
  import.meta.env.REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT ||
  'https://indexer.hyperindex.xyz/1a2f51c/v1/graphql'
export const SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT =
  import.meta.env.REACT_APP_SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT ||
  'https://api.studio.thegraph.com/query/61738/kleros-display-gnosis/version/latest'

export const KLEROS_CDN_BASE = 'https://cdn.kleros.link'

// xDAI Curation Court ID on Kleros
export const XDAI_CURATION_COURT_ID = '1'

// DappLooker chart IDs
export const CURATORS_CHART_ID = 'f531beb6-120f-4fa9-b71d-5176488785d4'
export const TOTAL_SUBMISSIONS_CHART_ID = '70035d4e-d24c-43db-85e9-d66e60aaa1f9'
