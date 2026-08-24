import './index.css'
import { BidForm } from './components/BidForm'
import { WalletButton } from './components/WalletButton'

const TICKER = 'BIDORBIT — LIVE AUCTIONS — STELLAR TESTNET — SOROBAN POWERED — PLACE YOUR BID — '

export default function App() {
  return (
    <div className="min-h-screen bg-dots">

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <header className="border-b-4 border-black bg-white sticky top-0 z-50">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Logo */}
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
      <div className="border-b-4 border-black bg-black overflow-hidden" aria-hidden="true">
        <div className="flex animate-ticker whitespace-nowrap">
          {/* Duplicate for seamless loop */}
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

      {/* ── MAIN ────────────────────────────────────────────── */}
      <main className="mx-auto max-w-xl px-4 sm:px-6 py-10">

        {/* Page headline */}
        <div className="mb-8">
          <h1 className="font-black text-4xl sm:text-5xl uppercase tracking-tighter leading-[0.9] mb-4">
            DECENTRALISED
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 bg-neo-accent border-4 border-black neo-shadow-sm px-2 -rotate-1 inline-block">
                AUCTIONS
              </span>
            </span>
          </h1>
          <p className="font-bold text-xs uppercase tracking-[0.25em] text-black/50">
            On Stellar · Powered by Soroban Smart Contracts
          </p>
        </div>

        {/* The auction card */}
        <BidForm />

        {/* Footer note */}
        <p className="mt-6 text-center font-bold text-[10px] uppercase tracking-widest text-black/40">
          Bids are on-chain and irreversible · Stellar Testnet only
        </p>
      </main>
    </div>
  )
}
