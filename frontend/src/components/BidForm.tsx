import { useState } from 'react'
import { useAuction } from '../hooks/useAuction'
import { usePlaceBid } from '../hooks/usePlaceBid'
import { useWallet } from '../hooks/useWallet'

const AUCTION_ID = 0n
const EXPERT_BASE = 'https://stellar.expert/explorer/testnet/tx'
const STROOPS_PER_XLM = 10_000_000n

function fmtXlm(stroops: bigint): string {
  const whole = stroops / STROOPS_PER_XLM
  const frac = (stroops % STROOPS_PER_XLM).toString().padStart(7, '0')
  const trimmed = frac.replace(/0+$/, '') || '0'
  return `${whole}.${trimmed} XLM`
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  )
}

export function BidForm() {
  const { address } = useWallet()
  const { state, loading, error: fetchError, currentLedger, refetch } = useAuction(AUCTION_ID)
  const { status, placeBid, reset } = usePlaceBid(AUCTION_ID, refetch)
  const [input, setInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const isEnded = state != null && currentLedger > 0 && currentLedger >= state.end_ledger
  // current_highest_bid is always >= start_price (contract initialises it there)
  const minBid = state != null ? state.current_highest_bid + 1n : 1n

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError(null)
    const xlm = parseFloat(input)
    if (!xlm || xlm <= 0) {
      setValidationError('Enter a valid amount.')
      return
    }
    const stroops = BigInt(Math.round(xlm * 10_000_000))
    if (stroops < minBid) {
      setValidationError(`Must be at least ${fmtXlm(minBid)}.`)
      return
    }
    placeBid(stroops)
    setInput('')
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-10 shadow text-center text-gray-400">
        Loading auction…
      </div>
    )
  }

  if (fetchError || !state) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-10 shadow text-center text-red-500">
        {fetchError ?? 'Auction not found.'}
      </div>
    )
  }

  const isBusy = ['building', 'signing', 'submitting'].includes(status.phase)

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white shadow overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-indigo-900">{state.item_name}</h2>
          <p className="mt-0.5 text-sm text-indigo-500">Auction #0 · Testnet</p>
        </div>
        {isEnded ? (
          <StatusBadge label="Ended" color="text-gray-600 bg-gray-100" />
        ) : (
          <StatusBadge label="Live" color="text-emerald-700 bg-emerald-100" />
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-gray-100 border-b border-gray-100">
        {[
          { label: 'Current Highest Bid', value: fmtXlm(state.current_highest_bid), large: true },
          {
            label: 'Highest Bidder',
            value: state.highest_bidder ? truncate(state.highest_bidder) : '—',
            mono: true,
          },
          { label: 'Start Price', value: fmtXlm(state.start_price) },
          {
            label: isEnded ? 'Ended at Ledger' : 'Ends at Ledger',
            value: `#${state.end_ledger.toLocaleString()}`,
          },
        ].map(({ label, value, large, mono }) => (
          <div key={label} className="bg-white px-6 py-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <p
              className={`mt-1 ${large ? 'text-2xl font-bold text-gray-900' : 'text-sm text-gray-700'} ${mono ? 'font-mono' : ''}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Bid area */}
      <div className="px-6 py-5">
        {!address ? (
          <p className="text-center text-sm text-gray-500 py-2">
            Connect your wallet to place a bid.
          </p>
        ) : isEnded ? (
          <p className="text-center text-sm text-gray-500 py-2">This auction has ended.</p>
        ) : status.phase === 'success' ? (
          /* ── Success state ── */
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <p className="font-semibold text-emerald-800 text-sm">Bid placed successfully!</p>
            <a
              href={`${EXPERT_BASE}/${status.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-xs text-emerald-600 hover:text-emerald-800 underline break-all font-mono"
            >
              {status.txHash || 'View on stellar.expert'}
            </a>
            <button
              onClick={reset}
              className="mt-3 text-xs text-emerald-600 hover:text-emerald-800 underline"
            >
              Place another bid
            </button>
          </div>
        ) : (
          <>
            {/* ── Error banner ── */}
            {status.phase === 'error' && (
              <div
                className={`mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
                  status.kind === 'user_rejected'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-red-300 bg-red-50 text-red-700'
                }`}
              >
                <span className="shrink-0 mt-0.5">
                  {status.kind === 'user_rejected' ? '✕' : '⚠'}
                </span>
                <span className="flex-1">{status.message}</span>
                <button
                  onClick={reset}
                  className="ml-2 shrink-0 opacity-60 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="bid-amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Your bid (XLM)
                </label>
                <input
                  id="bid-amount"
                  type="number"
                  step="0.0000001"
                  min="0"
                  value={input}
                  onChange={e => {
                    setInput(e.target.value)
                    setValidationError(null)
                  }}
                  placeholder={`Min ${fmtXlm(minBid)}`}
                  disabled={isBusy}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
                {validationError && (
                  <p className="mt-1 text-xs text-red-600">{validationError}</p>
                )}
              </div>

              {/* Transaction status indicator */}
              {isBusy && (
                <div className="flex items-center gap-2 text-sm text-indigo-600">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  {status.phase === 'building' && 'Building transaction…'}
                  {status.phase === 'signing' && 'Waiting for wallet signature…'}
                  {status.phase === 'submitting' && 'Submitting to network…'}
                </div>
              )}

              <button
                type="submit"
                disabled={isBusy || !input}
                className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isBusy ? 'Processing…' : 'Place Bid'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
