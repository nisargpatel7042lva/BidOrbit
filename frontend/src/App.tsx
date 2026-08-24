import './index.css'
import { WalletButton } from './components/WalletButton'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-indigo-600">BidOrbit</span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            Testnet
          </span>
        </div>
        <WalletButton />
      </header>

      {/* Body */}
      <main className="mx-auto max-w-4xl px-6 py-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Decentralised Auctions on Stellar
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Connect your Stellar wallet to browse and place bids.
        </p>
      </main>
    </div>
  )
}
