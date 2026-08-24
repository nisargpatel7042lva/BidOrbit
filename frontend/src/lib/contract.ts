import {
  Account,
  Address,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk'

export const CONTRACT_ID = 'CCKH2P2QFWDKQTUALSEZJRT5WWAJPFKT5DD56VQKFAFDGVXIXW2ZHBMQ'
export const RPC_URL = 'https://soroban-testnet.stellar.org'
export const NETWORK_PASSPHRASE = Networks.TESTNET
const HORIZON_URL = 'https://horizon-testnet.stellar.org'

// Used as transaction source for read-only simulations (no account lookup needed).
const SIM_SOURCE = 'GAYBYZIU42OOYIUDZTVUTXPLHWSFNN236PHXG6GFDCQTZVI5WZRCDLKQ'

// Shared server for event polling only (no response XDR parsing in that path).
export const server = new rpc.Server(RPC_URL)

export interface AuctionState {
  item_name: string
  start_price: bigint
  current_highest_bid: bigint
  highest_bidder: string | null
  end_ledger: number
  admin: string
  token: string
  claimed: boolean
  withdrawn: boolean
}

// ---------------------------------------------------------------------------
// Raw JSON-RPC helper — bypasses stellar-sdk's browser bundle XDR parsing.
// The browser bundle (dist/stellar-sdk.min.js) embeds an older stellar-base
// that throws "Bad union switch: N" on Protocol-22 response types.
// We do the RPC call ourselves and only parse the specific ScVal we need.
// ---------------------------------------------------------------------------
async function rpcPost(method: string, params: Record<string, unknown>) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message ?? JSON.stringify(json.error))
  return json.result
}

export async function getAuctionState(auctionId: bigint): Promise<AuctionState> {
  // Use a fake account — sequence is irrelevant for read-only simulation.
  const fakeAccount = new Account(SIM_SOURCE, '0')
  const tx = new TransactionBuilder(fakeAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: 'get_auction_state',
        args: [nativeToScVal(auctionId, { type: 'u64' })],
      }),
    )
    .setTimeout(30)
    .build()

  const sim = await rpcPost('simulateTransaction', { transaction: tx.toXDR() })
  if (sim.error) throw new Error(sim.error)

  const retvalB64: string = sim.results?.[0]?.xdr
  if (!retvalB64) throw new Error('No return value from get_auction_state')

  // Parse only the ScVal we need — ScVal XDR is stable across protocol versions.
  const retval = xdr.ScVal.fromXDR(retvalB64, 'base64')
  return scValToNative(retval) as AuctionState
}

export async function buildPlaceBidTx(
  publicKey: string,
  auctionId: bigint,
  amount: bigint,
  tokenAddress: string,
) {
  // Fetch real account sequence via Horizon REST (pure JSON, no XDR parsing).
  const horizonRes = await fetch(`${HORIZON_URL}/accounts/${publicKey}`)
  if (!horizonRes.ok) throw new Error('Could not load account. Is this account funded on testnet?')
  const horizonData = await horizonRes.json()
  const sequence: string = horizonData.sequence

  const account = new Account(publicKey, sequence)
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: 'place_bid',
        args: [
          nativeToScVal(auctionId, { type: 'u64' }),
          new Address(publicKey).toScVal(),
          nativeToScVal(amount, { type: 'i128' }),
        ],
      }),
    )
    .setTimeout(30)
    .build()

  const sim = await rpcPost('simulateTransaction', { transaction: tx.toXDR() })
  if (sim.error) throw new Error(sim.error)

  const minFee = parseInt(sim.minResourceFee ?? '0', 10) + 100

  // The Soroban simulation runs in permissive (recording) auth mode and returns
  // zero auth entries when bidder == tx source. On-chain execution is stricter:
  // the cross-contract call tok.transfer(&bidder, …) requires an explicit
  // SorobanAuthorizationEntry or require_auth() panics → invokeHostFunctionTrapped.
  //
  // We use sourceAccount credentials — the wallet's tx envelope signature covers
  // this automatically, so no separate auth-entry signing step is needed.
  const simAuthEntries: xdr.SorobanAuthorizationEntry[] = (sim.auth ?? []).map(
    (a: string) => xdr.SorobanAuthorizationEntry.fromXDR(a, 'base64'),
  )
  const authEntries =
    simAuthEntries.length > 0
      ? simAuthEntries
      : [makeSourceAccountAuth(publicKey, auctionId, amount, tokenAddress)]

  // Fresh Account — TransactionBuilder.build() mutates the account's sequence.
  const account2 = new Account(publicKey, sequence)
  return new TransactionBuilder(account2, {
    fee: String(minFee),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: 'place_bid',
        args: [
          nativeToScVal(auctionId, { type: 'u64' }),
          new Address(publicKey).toScVal(),
          nativeToScVal(amount, { type: 'i128' }),
        ],
        auth: authEntries,
      }),
    )
    .setSorobanData(sim.transactionData)
    .setTimeout(30)
    .build()
}

function makeSourceAccountAuth(
  publicKey: string,
  auctionId: bigint,
  amount: bigint,
  tokenAddress: string,
): xdr.SorobanAuthorizationEntry {
  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
          contractAddress: new Address(CONTRACT_ID).toScAddress(),
          functionName: 'place_bid',
          args: [
            nativeToScVal(auctionId, { type: 'u64' }),
            new Address(publicKey).toScVal(),
            nativeToScVal(amount, { type: 'i128' }),
          ],
        }),
      ),
      subInvocations: [
        new xdr.SorobanAuthorizedInvocation({
          function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
            new xdr.InvokeContractArgs({
              contractAddress: new Address(tokenAddress).toScAddress(),
              functionName: 'transfer',
              args: [
                new Address(publicKey).toScVal(),
                new Address(CONTRACT_ID).toScVal(),
                nativeToScVal(amount, { type: 'i128' }),
              ],
            }),
          ),
          subInvocations: [],
        }),
      ],
    }),
  })
}

export async function submitSignedTx(signedXdr: string): Promise<string> {
  const result = await rpcPost('sendTransaction', { transaction: signedXdr })

  if (result.status === 'ERROR') {
    throw new Error('Transaction rejected by network: ' + (result.errorResultXdr ?? ''))
  }

  const hash: string = result.hash

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2_000))
    const poll = await rpcPost('getTransaction', { hash })
    if (poll.status === 'SUCCESS') return hash
    if (poll.status === 'FAILED') {
      // Try to extract the specific contract error from the Soroban meta.
      const contractError = decodeSorobanError(poll.resultMetaXdr)
      if (contractError) throw new Error(contractError)
      const detail = poll.resultXdr ?? ''
      throw new Error(`Transaction failed on-chain [${hash}]` + (detail ? ': ' + detail : ''))
    }
  }

  throw new Error('Confirmation timeout — check stellar.expert for tx ' + hash)
}

function decodeSorobanError(resultMetaXdr: string | undefined): string | null {
  if (!resultMetaXdr) return null
  try {
    const meta = xdr.TransactionMeta.fromXDR(resultMetaXdr, 'base64')
    // v3 is the Soroban meta version
    const sorobanMeta = (meta as any).v3?.()?.sorobanMeta?.()
    if (!sorobanMeta) return null
    const retVal = sorobanMeta.returnValue()
    // Contract panics produce an ScError with type=contract and the error code
    if (retVal.switch().name === 'scvError') {
      const err = retVal.error()
      const code: number = err.code?.().value ?? err.value?.()
      const CONTRACT_ERRORS: Record<number, string> = {
        1: 'InvalidStartPrice',
        2: 'InvalidEndLedger',
        3: 'AuctionNotFound',
        4: 'AuctionEnded',
        5: 'BidTooLow',
        6: 'AuctionNotEnded',
        7: 'NotHighestBidder',
        8: 'AlreadyClaimed',
        9: 'NotAdmin',
        10: 'AlreadyWithdrawn',
        11: 'NoBids',
      }
      const name = CONTRACT_ERRORS[code] ?? `ContractError(${code})`
      return `Contract error: ${name}`
    }
  } catch { /* ignore parse failures */ }
  return null
}
