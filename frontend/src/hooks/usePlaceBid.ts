import { useCallback, useState } from 'react'
import { NETWORK_PASSPHRASE, buildPlaceBidTx, submitSignedTx } from '../lib/contract'
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
    return { phase: 'error', kind: 'user_rejected', message: 'You cancelled the signing request.' }
  }

  if (
    msg.includes('BidTooLow') ||
    /#5\b/.test(msg) ||
    /bid.{0,20}too.{0,10}low/i.test(msg) ||
    /Contract error: BidTooLow/.test(msg)
  ) {
    return {
      phase: 'error',
      kind: 'bid_too_low',
      message: 'Bid too low — your amount must exceed the current highest bid.',
    }
  }

  if (/Contract error: AuctionEnded/.test(msg)) {
    return { phase: 'error', kind: 'other', message: 'This auction has already ended.' }
  }

  return { phase: 'error', kind: 'other', message: msg || 'Transaction failed. Please try again.' }
}

export function usePlaceBid(auctionId: bigint, onSuccess?: () => void) {
  const { address } = useWallet()
  const [status, setStatus] = useState<BidStatus>({ phase: 'idle' })

  const placeBid = useCallback(
    async (amount: bigint, tokenAddress: string) => {
      if (!address) return

      setStatus({ phase: 'building' })
      try {
        // 1. Build + simulate the transaction (gets footprint and auth requirements)
        const assembled = await buildPlaceBidTx(address, auctionId, amount, tokenAddress)

        // 2. Hand XDR to wallet for signing
        setStatus({ phase: 'signing' })
        const { signedTxXdr } = await StellarWalletsKit.signTransaction(assembled.toXDR(), {
          networkPassphrase: NETWORK_PASSPHRASE,
          address,
        })

        // 3. Submit and poll for confirmation
        setStatus({ phase: 'submitting' })
        const hash = await submitSignedTx(signedTxXdr)

        setStatus({ phase: 'success', txHash: hash })
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
