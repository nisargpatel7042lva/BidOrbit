import './index.css'
import { BidForm } from './components/BidForm'
import { WalletButton } from './components/WalletButton'

const TICKER = 'BIDORBIT — LIVE AUCTIONS — STELLAR TESTNET — SOROBAN POWERED — PLACE YOUR BID — '

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-dots overflow-hidden">

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <header className="border-b-4 border-black bg-white shrink-0">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="border-4 border-black bg-neo-yellow neo-shadow-sm px-3 py-1.5 -rotate-1">
              <span className="font-black text-base uppercase tracking-tight">BidOrbit</span>
            </div>
            <div className="border-2 border-black bg-neo-accent px-2 py-0.5 rotate-1">
              <span className="font-black text-[10px] uppercase tracking-widest">Testnet</span>
            </div>
          </div>
          <WalletButton />
        </div>
      </header>

      {/* ── TICKER ──────────────────────────────────────────── */}
      <div className="border-b-4 border-black bg-black overflow-hidden shrink-0" aria-hidden="true">
        <div className="flex animate-ticker whitespace-nowrap">
          {[0, 1].map(i => (
            <span
              key={i}
              className="inline-block py-2 px-8 font-black text-[10px] uppercase tracking-[0.35em] text-neo-yellow"
            >
              {TICKER.repeat(5)}
            </span>
          ))}
        </div>
      </div>

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto flex items-center justify-center px-4 sm:px-6 py-4">
        <div className="w-full max-w-xl">
          <BidForm />
          <p className="mt-4 text-center font-bold text-[10px] uppercase tracking-widest text-black/40">
            Bids are on-chain and irreversible · Stellar Testnet only
          </p>
        </div>
      </main>
    </div>
  )
}
