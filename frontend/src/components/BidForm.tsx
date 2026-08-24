import { useState } from 'react'
import { fmtXlm, truncate } from '../lib/format'
import { useAuction } from '../hooks/useAuction'
import { usePlaceBid } from '../hooks/usePlaceBid'
import { useWallet } from '../hooks/useWallet'

const AUCTION_ID = 0n
const EXPERT_BASE = 'https://stellar.expert/explorer/testnet/tx'

/* ── Phase status pill ─────────────────────────────────── */
const PHASE_META = {
  building:   { bg: 'bg-neo-violet', icon: '⬡', label: 'BUILDING TRANSACTION…' },
  signing:    { bg: 'bg-neo-yellow', icon: '✍',  label: 'SIGN IN YOUR WALLET…' },
  submitting: { bg: 'bg-neo-accent', icon: '⟳',  label: 'SUBMITTING TO NETWORK…' },
} as const

export function BidForm() {
  const { address } = useWallet()
  const { state, loading, error: fetchError, currentLedger, refetch } = useAuction(AUCTION_ID)
  const { status, placeBid, reset } = usePlaceBid(AUCTION_ID, refetch)
  const [input, setInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const isEnded = state != null && currentLedger > 0 && currentLedger >= state.end_ledger
  const minBid   = state != null ? state.current_highest_bid + 1n : 1n
  const isBusy   = status.phase === 'building' || status.phase === 'signing' || status.phase === 'submitting'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError(null)
    const xlm = parseFloat(input)
    if (!xlm || xlm <= 0) { setValidationError('ENTER A VALID AMOUNT'); return }
    const stroops = BigInt(Math.round(xlm * 10_000_000))
    if (stroops < minBid) { setValidationError(`MINIMUM: ${fmtXlm(minBid)} XLM`); return }
    if (!state) return
    placeBid(stroops, state.token)
    setInput('')
  }

  /* ── Loading ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="border-4 border-black bg-white neo-shadow-lg p-12 text-center">
        <span className="font-black text-lg uppercase tracking-widest animate-pulse">
          LOADING AUCTION…
        </span>
      </div>
    )
  }

  /* ── Fetch error ──────────────────────────────────────── */
  if (fetchError || !state) {
    return (
      <div className="border-4 border-black bg-neo-accent neo-shadow-lg p-10 text-center">
        <p className="font-black text-base uppercase tracking-wide">
          {fetchError ?? 'AUCTION NOT FOUND'}
        </p>
      </div>
    )
  }

  const ledgersLeft = currentLedger > 0 ? Math.max(0, state.end_ledger - currentLedger) : null

  return (
    <div className="border-4 border-black bg-white neo-shadow-xl">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="bg-neo-yellow border-b-4 border-black px-6 py-5 flex items-start justify-between gap-4">
        <div>
          {/* badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="border-2 border-black bg-white px-2 py-0.5 font-black text-[10px] uppercase tracking-[0.25em]">
              AUCTION #0
            </span>
            {isEnded ? (
              <span className="border-2 border-black bg-black text-white px-2 py-0.5 font-black text-[10px] uppercase tracking-[0.25em]">
                ENDED
              </span>
            ) : (
              <span className="border-2 border-black bg-neo-accent px-2 py-0.5 font-black text-[10px] uppercase tracking-[0.25em] flex items-center gap-1 -rotate-1">
                <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <h2 className="font-black text-xl sm:text-2xl uppercase tracking-tight leading-none">
            {state.item_name}
          </h2>
        </div>

        {/* Sticker — TESTNET */}
        <div className="shrink-0 border-4 border-black bg-white neo-shadow-sm px-3 py-1.5 rotate-2">
          <span className="font-black text-xs uppercase tracking-widest">TESTNET</span>
        </div>
      </div>

      {/* ── CURRENT BID (hero number) ───────────────────────── */}
      <div className="border-b-4 border-black px-6 py-6">
        <p className="font-black text-[10px] uppercase tracking-[0.3em] text-black/50 mb-1">
          CURRENT HIGHEST BID
        </p>
        <div className="flex items-end gap-2 flex-wrap">
          <span className="font-black text-5xl sm:text-6xl leading-none tracking-tighter">
            {fmtXlm(state.current_highest_bid)}
          </span>
          <span className="font-bold text-xl text-black/50 pb-1">XLM</span>
        </div>
      </div>

      {/* ── STATS GRID ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 border-b-4 border-black divide-x-4 divide-black">
        <div className="px-4 py-4">
          <p className="font-black text-[9px] uppercase tracking-[0.2em] text-black/50 mb-1">
            HIGHEST BIDDER
          </p>
          <p className="font-black text-xs font-mono break-all leading-snug">
            {state.highest_bidder ? truncate(state.highest_bidder, 6, 4) : '—'}
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="font-black text-[9px] uppercase tracking-[0.2em] text-black/50 mb-1">
            START PRICE
          </p>
          <p className="font-black text-xs leading-snug">
            {fmtXlm(state.start_price)} XLM
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="font-black text-[9px] uppercase tracking-[0.2em] text-black/50 mb-1">
            {isEnded ? 'ENDED AT' : 'LEDGERS LEFT'}
          </p>
          <p className="font-black text-xs leading-snug tabular-nums">
            {isEnded
              ? `#${state.end_ledger.toLocaleString()}`
              : ledgersLeft !== null
              ? ledgersLeft.toLocaleString()
              : `#${state.end_ledger.toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* ── BID AREA ────────────────────────────────────────── */}
      <div className="px-6 py-6">

        {/* No wallet */}
        {!address && (
          <div className="border-4 border-black bg-neo-violet neo-shadow-sm p-5 text-center">
            <p className="font-black text-sm uppercase tracking-widest">
              CONNECT YOUR WALLET TO BID
            </p>
          </div>
        )}

        {/* Auction ended */}
        {address && isEnded && (
          <div className="border-4 border-black bg-black p-5 text-center">
            <p className="font-black text-sm uppercase tracking-widest text-neo-yellow">
              THIS AUCTION HAS ENDED
            </p>
          </div>
        )}

        {/* Success */}
        {address && !isEnded && status.phase === 'success' && (
          <div className="border-4 border-black bg-neo-yellow neo-shadow-sm p-5">
            <p className="font-black text-xl uppercase tracking-tight mb-3">
              ✓ BID PLACED!
            </p>
            <a
              href={`${EXPERT_BASE}/${status.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs break-all underline decoration-2 underline-offset-2
                         hover:bg-black hover:text-neo-yellow px-0.5 transition-colors duration-100"
            >
              {status.txHash || 'VIEW ON STELLAR.EXPERT →'}
            </a>
            <button
              onClick={reset}
              className="mt-4 w-full border-4 border-black bg-white py-3 font-black text-xs uppercase tracking-widest
                         neo-shadow-sm hover:bg-black hover:text-white
                         active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                         transition-all duration-100"
            >
              PLACE ANOTHER BID →
            </button>
          </div>
        )}

        {/* Error + Form */}
        {address && !isEnded && status.phase !== 'success' && (
          <>
            {/* Error banner */}
            {status.phase === 'error' && (
              <div className={`border-4 border-black neo-shadow-sm p-4 mb-5 flex items-start gap-3
                ${status.kind === 'user_rejected' ? 'bg-neo-yellow' : 'bg-neo-accent'}`}
              >
                <span className="font-black text-base shrink-0">
                  {status.kind === 'user_rejected' ? '✕' : '⚠'}
                </span>
                <p className="font-black text-xs uppercase tracking-wide flex-1">{status.message}</p>
                <button
                  onClick={reset}
                  aria-label="Dismiss"
                  className="shrink-0 border-2 border-black w-5 h-5 flex items-center justify-center
                             font-black text-xs hover:bg-black hover:text-neo-accent transition-colors duration-100"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount input */}
              <div>
                <label htmlFor="bid-amount" className="block font-black text-[10px] uppercase tracking-[0.25em] mb-2">
                  YOUR BID (XLM)
                </label>

                <div className="relative border-4 border-black neo-shadow-sm focus-within:neo-shadow-md
                                focus-within:bg-neo-yellow transition-all duration-100">
                  <input
                    id="bid-amount"
                    type="number"
                    step="0.0000001"
                    min="0"
                    value={input}
                    onChange={e => { setInput(e.target.value); setValidationError(null) }}
                    placeholder={fmtXlm(minBid)}
                    disabled={isBusy}
                    className="w-full bg-transparent px-4 py-4 pr-16 text-2xl font-black
                               placeholder:text-black/30 focus:outline-none
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-sm text-black/40 pointer-events-none">
                    XLM
                  </span>
                </div>

                {validationError
                  ? <p className="mt-2 font-black text-xs uppercase tracking-wide text-neo-accent">⚠ {validationError}</p>
                  : <p className="mt-2 font-bold text-[10px] uppercase tracking-[0.2em] text-black/50">
                      MIN: {fmtXlm(minBid)} XLM
                    </p>
                }
              </div>

              {/* Transaction phase indicator */}
              {isBusy && (() => {
                const meta = PHASE_META[status.phase as keyof typeof PHASE_META]
                return (
                  <div className={`border-4 border-black p-3 flex items-center gap-3 ${meta.bg}`}>
                    <span className="font-black text-base animate-spin-slow inline-block leading-none">
                      {meta.icon}
                    </span>
                    <span className="font-black text-xs uppercase tracking-widest">{meta.label}</span>
                  </div>
                )
              })()}

              {/* CTA */}
              <button
                type="submit"
                disabled={isBusy || !input}
                className="w-full border-4 border-black bg-neo-accent py-4 font-black text-sm uppercase tracking-widest
                           neo-shadow-md hover:bg-black hover:text-neo-accent
                           active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all duration-100"
              >
                {isBusy ? 'PROCESSING…' : 'PLACE BID →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
