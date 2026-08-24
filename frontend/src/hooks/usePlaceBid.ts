import { useCallback, useState } from 'react'
import { getSigningClient } from '../lib/contract'
import { StellarWalletsKit } from '../lib/wallet'
import { useWallet } from './useWallet'

export type BidStatus =
  | { phase: 'idle' }
  | { phase: 'building' }
  | { phase: 'signing' }
  | { phase: 'submitting' }
  | { phase: 'success'; txHash: string }
  | { phase: 'error'; message: string; kind: 'bid_too_low' | 'user_rejected' | 'other' }

function classifyError(raw: unknown): BidStatus & { phase: 'error' } {
  const msg = String(raw)

  if (
    msg.includes('4001') ||
    /user (rejected|declined|cancelled|denied)/i.test(msg) ||
    /rejected by user/i.test(msg) ||
    /request was rejected/i.test(msg)
  ) {
    return {
      phase: 'error',
      kind: 'user_rejected',
      message: 'You cancelled the signing request.',
    }
  }

  if (
    msg.includes('BidTooLow') ||
    /#5\b/.test(msg) ||
    /bid.{0,20}too.{0,10}low/i.test(msg)
  ) {
    return {
      phase: 'error',
      kind: 'bid_too_low',
      message: 'Bid too low — your amount must exceed the current highest bid.',
    }
  }

  return {
    phase: 'error',
    kind: 'other',
    message: msg || 'Transaction failed. Please try again.',
  }
}

export function usePlaceBid(auctionId: bigint, onSuccess?: () => void) {
  const { address } = useWallet()
  const [status, setStatus] = useState<BidStatus>({ phase: 'idle' })

  const placeBid = useCallback(
    async (amount: bigint) => {
      if (!address) return

      setStatus({ phase: 'building' })
      try {
        const client = await getSigningClient(address)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await (client as any).place_bid({
          auction_id: auctionId,
          bidder: address,
          amount,
        })

        setStatus({ phase: 'signing' })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sent = await (tx as any).signAndSend({
          signTransaction: async (xdr: string, opts?: Record<string, string>) => {
            const result = await StellarWalletsKit.signTransaction(xdr, {
              networkPassphrase: opts?.networkPassphrase ?? opts?.network,
              address: opts?.accountToSign ?? address,
            })
            // Transition to submitting only after the wallet signs successfully
            setStatus({ phase: 'submitting' })
            return result
          },
        })

        setStatus({ phase: 'success', txHash: sent?.hash ?? '' })
        onSuccess?.()
      } catch (raw) {
        setStatus(classifyError(raw))
      }
    },
    [address, auctionId, onSuccess],
  )

  const reset = useCallback(() => setStatus({ phase: 'idle' }), [])

  return { status, placeBid, reset }
}
