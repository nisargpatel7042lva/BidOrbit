import { scValToNative } from '@stellar/stellar-sdk'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CONTRACT_ID, getReadClient, server } from '../lib/contract'

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

export function useAuction(auctionId: bigint) {
  const [state, setState] = useState<AuctionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentLedger, setCurrentLedger] = useState(0)
  const nextStartLedger = useRef<number | null>(null)

  const fetchState = useCallback(async () => {
    try {
      const client = await getReadClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = await (client as any).get_auction_state({ auction_id: auctionId })
      setState(tx.result as AuctionState)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  // Poll getEvents; when a BidPlaced for this auction appears, refetch state.
  const pollEvents = useCallback(async () => {
    try {
      const { sequence } = await server.getLatestLedger()
      setCurrentLedger(sequence)

      const startLedger = nextStartLedger.current ?? Math.max(1, sequence - 20)
      const response = await server.getEvents({
        startLedger,
        filters: [{ type: 'contract', contractIds: [CONTRACT_ID] }],
        limit: 100,
      })

      nextStartLedger.current = sequence + 1

      const hasBidForAuction = response.events.some(event => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const topics: unknown[] = (event as any).topic ?? []
          if (topics.length < 2) return false
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawId = topics[1] as any
          const eventAuctionId = BigInt(scValToNative(rawId) as string | number | bigint)
          return eventAuctionId === auctionId
        } catch {
          return false
        }
      })

      if (hasBidForAuction) await fetchState()
    } catch {
      // silently ignore transient RPC errors
    }
  }, [auctionId, fetchState])

  useEffect(() => {
    fetchState()
    const id = setInterval(pollEvents, 3_000)
    return () => clearInterval(id)
  }, [fetchState, pollEvents])

  return { state, loading, error, currentLedger, refetch: fetchState }
}
