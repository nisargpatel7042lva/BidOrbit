import { contract, Networks, rpc } from '@stellar/stellar-sdk'

export const CONTRACT_ID = 'CCKH2P2QFWDKQTUALSEZJRT5WWAJPFKT5DD56VQKFAFDGVXIXW2ZHBMQ'
export const RPC_URL = 'https://soroban-testnet.stellar.org'
export const NETWORK_PASSPHRASE = Networks.TESTNET

// Cached read-only client — fetches contract spec once from the RPC.
let _readClient: contract.Client | null = null

export async function getReadClient(): Promise<contract.Client> {
  if (!_readClient) {
    _readClient = await contract.Client.from({
      contractId: CONTRACT_ID,
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
  }
  return _readClient
}

export function getSigningClient(publicKey: string): Promise<contract.Client> {
  return contract.Client.from({
    contractId: CONTRACT_ID,
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    publicKey,
  })
}

export const server = new rpc.Server(RPC_URL)
