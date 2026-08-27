import { scValToNative } from '@stellar/stellar-sdk'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CONTRACT_ID, type AuctionState, getAuctionCount, getAuctionState, server } from '../lib/contract'

export type { AuctionState }

export function useAuction() {
  const [auctionId, setAuctionId] = useState<bigint | null>(null)
  const [state, setState] = useState<AuctionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentLedger, setCurrentLedger] = useState(0)
  const nextStartLedger = useRef<number | null>(null)

  const fetchState = useCallback(async () => {
    try {
      const count = await getAuctionCount()
      if (count === 0n) {
        setError('No auctions have been created yet.')
        setLoading(false)
        return
      }
      const latestId = count - 1n
      setAuctionId(latestId)
      const data = await getAuctionState(latestId)
      setState(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll getEvents every 3s; refetch auction state when a BidPlaced event
  // for the current auction appears so the UI updates live.
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
          // topics: [Symbol("BidPlaced"), u64(auction_id), Address(bidder)]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const topics: unknown[] = (event as any).topic ?? []
          if (topics.length < 2) return false
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eventAuctionId = BigInt(scValToNative(topics[1] as any) as string | number | bigint)
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

  return { auctionId, state, loading, error, currentLedger, refetch: fetchState }
}
