import { truncate } from '../lib/format'
import { useWallet } from '../hooks/useWallet'

export function WalletButton() {
  const { address, error, connecting, connect, disconnect, clearError } = useWallet()

  return (
    <div className="flex flex-col items-end gap-2">

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-start gap-2 border-4 border-black bg-neo-accent neo-shadow-sm p-3 max-w-xs">
          <span className="font-black text-sm shrink-0">⚠</span>
          <p className="font-bold text-xs uppercase tracking-wide flex-1">{error}</p>
          <button
            onClick={clearError}
            aria-label="Dismiss"
            className="shrink-0 border-2 border-black w-5 h-5 flex items-center justify-center font-black text-xs
                       hover:bg-black hover:text-neo-accent transition-colors duration-100"
          >
            ✕
          </button>
        </div>
      )}

      {address ? (
        /* ── Connected ── */
        <div className="flex items-center gap-2">
          <div className="border-4 border-black bg-neo-yellow neo-shadow-sm px-3 py-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-black animate-pulse" />
            <span className="font-black text-xs uppercase tracking-wide font-mono">
              {truncate(address)}
            </span>
          </div>
          <button
            onClick={disconnect}
            className="border-4 border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-wide
                       neo-shadow-sm hover:bg-black hover:text-white
                       active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                       transition-all duration-100"
          >
            DISCONNECT
          </button>
        </div>
      ) : (
        /* ── Disconnected ── */
        <button
          onClick={connect}
          disabled={connecting}
          className="border-4 border-black bg-neo-accent px-5 py-2.5 text-sm font-black uppercase tracking-widest
                     neo-shadow hover:bg-black hover:text-neo-accent
                     active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-100"
        >
          {connecting ? 'CONNECTING…' : 'CONNECT WALLET'}
        </button>
      )}
    </div>
  )
}
