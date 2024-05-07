export const getIPFSPath = (ipfsEvidenceObject: { cids: string[] }): string =>
  `/ipfs/${ipfsEvidenceObject.cids[0].split('ipfs://')[1]}`
