import { useWallet } from '../hooks/useWallet'

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`
}

export function WalletButton() {
  const { address, error, connecting, connect, disconnect, clearError } =
    useWallet()

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-sm">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span className="flex-1">{error}</span>
          <button
            onClick={clearError}
            className="ml-2 shrink-0 text-red-400 hover:text-red-600"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {address ? (
        /* Connected state — show truncated key + disconnect */
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-mono text-sm text-emerald-800">
              {truncate(address)}
            </span>
          </div>
          <button
            onClick={disconnect}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        /* Disconnected state — connect button */
        <button
          onClick={connect}
          disabled={connecting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
