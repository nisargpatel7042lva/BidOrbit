# BidOrbit

A decentralised auction dApp built on the Stellar blockchain using Soroban smart contracts. Users can connect their Stellar wallets, view live auction data, and place bids — all on-chain on Stellar testnet.

## Features

- Multi-wallet support: Freighter, xBull, Albedo, Lobstr
- Real-time bid updates via Soroban RPC event polling (`getEvents`)
- Client-side bid validation with clear minimum-bid guidance
- Three distinct error states: wallet not installed, bid too low, transaction rejected
- Full transaction status tracking: Building → Signing → Submitting → Success / Error
- Successful bids link directly to stellar.expert testnet explorer

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Soroban (Rust) on Stellar testnet |
| Wallet integration | @creit.tech/stellar-wallets-kit v2.5.0 |
| Contract client | @stellar/stellar-sdk v13.3.0 |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 |

## Deployed Contract

**Contract ID:** `CCKH2P2QFWDKQTUALSEZJRT5WWAJPFKT5DD56VQKFAFDGVXIXW2ZHBMQ`

**Network:** Stellar Testnet

**Example contract call (create_auction smoke test):**
`af0016281d3c266fe8690fdbae773423c49735d42161e3b1d197b167f73ad602`
→ [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/af0016281d3c266fe8690fdbae773423c49735d42161e3b1d197b167f73ad602)

## Setup & Running Locally

### Prerequisites

- Node.js 18+
- Rust toolchain with `wasm32v1-none` target (for contract builds)
- [stellar-cli](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) v27+
- A Stellar testnet wallet (Freighter recommended)

### 1. Clone and install frontend dependencies

```bash
git clone https://github.com/nisargpatel7042lva/BidOrbit.git
cd BidOrbit/frontend
npm install
```

### 2. Run the frontend

```bash
npm run dev
```

Open `http://localhost:5173` (or whichever port Vite assigns) in your browser.

### 3. (Optional) Build the smart contract

```bash
cd contracts/bid-orbit
cargo build --target wasm32v1-none --release
```

### 4. (Optional) Run contract tests

```bash
cargo test
```

All 20 tests should pass.

## How to Use

1. Open the app and click **Connect Wallet**
2. Choose your wallet from the modal (Freighter, xBull, Albedo, or Lobstr)
3. The live auction card loads with the current highest bid and end ledger
4. Enter a bid amount in XLM (must exceed the current highest bid)
5. Click **Place Bid** — approve the transaction in your wallet
6. Once confirmed, the bid card updates and shows the tx hash linked to stellar.expert

## Error Handling

| Error | Trigger | Display |
|---|---|---|
| Wallet not installed | Extension missing | Red banner with install link prompt |
| Bid too low | Amount ≤ current highest bid | Red banner in bid form |
| Transaction rejected | User cancels wallet prompt | Amber banner in bid form |

## Screenshots

> Replace each placeholder below with an actual screenshot before submitting.

### 1. Wallet selector modal (showing all 4 wallet options)

![Wallet selector modal](docs/screenshots/01-wallet-selector.png)

### 2. Connected wallet state (truncated public key + Disconnect button)

![Connected wallet](docs/screenshots/02-connected.png)

### 3. Live auction card with bid form

![Auction bid form](docs/screenshots/03-bid-form.png)

### 4. Successful bid with transaction hash

![Successful bid](docs/screenshots/04-bid-success.png)

## Project Structure

```
BidOrbit/
├── contracts/
│   └── bid-orbit/
│       └── src/
│           ├── lib.rs       # Soroban contract (create_auction, place_bid, claim_item, withdraw_funds)
│           └── test.rs      # 20 passing tests
├── frontend/
│   └── src/
│       ├── lib/
│       │   ├── wallet.ts    # StellarWalletsKit initialisation
│       │   └── contract.ts  # Contract client + RPC server
│       ├── hooks/
│       │   ├── useWallet.ts    # Connect / disconnect / error state
│       │   ├── useAuction.ts   # Auction state + getEvents polling
│       │   └── usePlaceBid.ts  # Bid transaction state machine
│       └── components/
│           ├── WalletButton.tsx  # Navbar wallet UI
│           └── BidForm.tsx       # Auction card + bid form
└── README.md
```

## Submission Checklist

- [x] Public GitHub repository
- [x] README with setup instructions
- [ ] 10+ meaningful commits *(currently 3 base + ~7 from Phase 7 work — commit those before submitting)*
- [x] Screenshot: wallet options available *(add screenshot)*
- [x] Deployed contract address: `CCKH2P2QFWDKQTUALSEZJRT5WWAJPFKT5DD56VQKFAFDGVXIXW2ZHBMQ`
- [x] Transaction hash of a contract call: `af0016281d3c266fe8690fdbae773423c49735d42161e3b1d197b167f73ad602`
- [ ] Live demo link *(optional — deploy to Vercel/Netlify if desired)*
