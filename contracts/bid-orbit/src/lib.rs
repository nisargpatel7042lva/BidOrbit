#![no_std]
use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, contracterror, panic_with_error, token,
    Address, Env, String,
};

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum BidError {
    InvalidStartPrice  = 1,
    InvalidEndLedger   = 2,
    AuctionNotFound    = 3,
    AuctionEnded       = 4,
    BidTooLow          = 5,
    AuctionNotEnded    = 6,  // claim/withdraw attempted before end_ledger
    NotHighestBidder   = 7,  // claim attempted by a non-winner
    AlreadyClaimed     = 8,
    NotAdmin           = 9,
    AlreadyWithdrawn   = 10,
    NoBids             = 11, // withdraw attempted when no bids were placed
}

// ---------------------------------------------------------------------------
// Storage key space
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    AuctionCounter,
    Auction(u64),
}

// ---------------------------------------------------------------------------
// Core data structures
// ---------------------------------------------------------------------------

/// Tracks the full state of a single auction.
/// `highest_bidder` is None until the first bid is placed.
/// `token` is the Stellar asset used for bid escrow and refunds.
#[contracttype]
#[derive(Clone)]
pub struct AuctionState {
    pub item_name: String,
    pub start_price: i128,
    pub current_highest_bid: i128,
    pub highest_bidder: Option<Address>,
    pub end_ledger: u32,
    pub admin: Address,
    pub token: Address,
    pub claimed: bool,
    pub withdrawn: bool,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/// Emitted whenever a new highest bid is recorded.
/// `auction_id` and `bidder` are indexed topics; `amount` is event data.
#[contractevent]
pub struct BidPlaced {
    #[topic]
    pub auction_id: u64,
    #[topic]
    pub bidder: Address,
    pub amount: i128,
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn load_auction(env: &Env, auction_id: u64) -> AuctionState {
    match env.storage().persistent().get(&DataKey::Auction(auction_id)) {
        Some(s) => s,
        None => panic_with_error!(env, BidError::AuctionNotFound),
    }
}

fn save_auction(env: &Env, auction_id: u64, state: &AuctionState) {
    env.storage()
        .persistent()
        .set(&DataKey::Auction(auction_id), state);
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct BidOrbitContract;

#[contractimpl]
impl BidOrbitContract {
    // -----------------------------------------------------------------------
    // Read-only
    // -----------------------------------------------------------------------

    /// Returns the total number of auctions created so far.
    pub fn auction_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::AuctionCounter)
            .unwrap_or(0u64)
    }

    /// Returns a snapshot of an auction's current state.
    /// Panics if the auction_id does not exist.
    pub fn get_auction_state(env: Env, auction_id: u64) -> AuctionState {
        load_auction(&env, auction_id)
    }

    // -----------------------------------------------------------------------
    // Auction lifecycle
    // -----------------------------------------------------------------------

    /// Creates a new auction and returns its auction_id (0-indexed, u64).
    ///
    /// Panics if start_price <= 0 or end_ledger <= current ledger sequence.
    pub fn create_auction(
        env: Env,
        admin: Address,
        item_name: String,
        start_price: i128,
        end_ledger: u32,
        token: Address,
    ) -> u64 {
        admin.require_auth();

        if start_price <= 0 {
            panic_with_error!(&env, BidError::InvalidStartPrice);
        }
        if end_ledger <= env.ledger().sequence() {
            panic_with_error!(&env, BidError::InvalidEndLedger);
        }

        let auction_id: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::AuctionCounter)
            .unwrap_or(0u64);

        let state = AuctionState {
            item_name,
            start_price,
            current_highest_bid: start_price,
            highest_bidder: None,
            end_ledger,
            admin,
            token,
            claimed: false,
            withdrawn: false,
        };

        save_auction(&env, auction_id, &state);
        env.storage()
            .persistent()
            .set(&DataKey::AuctionCounter, &(auction_id + 1));

        auction_id
    }

    /// Places a bid on an active auction.
    ///
    /// Transfers `amount` from `bidder` into the contract (escrow) and refunds
    /// the previous highest bidder. Emits a `BidPlaced` event on success.
    ///
    /// Panics if the auction doesn't exist, has ended, or `amount` is not
    /// strictly greater than the current highest bid.
    pub fn place_bid(env: Env, auction_id: u64, bidder: Address, amount: i128) {
        bidder.require_auth();

        let mut state = load_auction(&env, auction_id);

        if env.ledger().sequence() > state.end_ledger {
            panic_with_error!(&env, BidError::AuctionEnded);
        }
        if amount <= state.current_highest_bid {
            panic_with_error!(&env, BidError::BidTooLow);
        }

        let tok = token::Client::new(&env, &state.token);
        let contract_addr = env.current_contract_address();

        // Escrow the new bid: bidder → contract.
        tok.transfer(&bidder, &contract_addr, &amount);

        // Refund the displaced leader: contract → previous highest bidder.
        if let Some(ref prev_bidder) = state.highest_bidder {
            tok.transfer(&contract_addr, prev_bidder, &state.current_highest_bid);
        }

        state.current_highest_bid = amount;
        state.highest_bidder = Some(bidder.clone());
        save_auction(&env, auction_id, &state);

        BidPlaced { auction_id, bidder, amount }.publish(&env);
    }

    /// Marks the item as claimed by the auction winner.
    ///
    /// Can only be called after `end_ledger`, by the highest bidder, and only
    /// once. The physical/digital item delivery is handled off-chain; this flag
    /// is the on-chain acknowledgement.
    ///
    /// Panics if: auction not found, auction not yet ended, no bids were placed,
    /// caller is not the highest bidder, or already claimed.
    pub fn claim_item(env: Env, auction_id: u64, caller: Address) {
        caller.require_auth();

        let mut state = load_auction(&env, auction_id);

        if env.ledger().sequence() <= state.end_ledger {
            panic_with_error!(&env, BidError::AuctionNotEnded);
        }

        let winner = match state.highest_bidder {
            Some(ref w) => w.clone(),
            None => panic_with_error!(&env, BidError::NoBids),
        };

        if caller != winner {
            panic_with_error!(&env, BidError::NotHighestBidder);
        }
        if state.claimed {
            panic_with_error!(&env, BidError::AlreadyClaimed);
        }

        state.claimed = true;
        save_auction(&env, auction_id, &state);
    }

    /// Transfers the winning bid amount from escrow to the auction admin.
    ///
    /// Can only be called after `end_ledger`, by the admin, when at least one
    /// bid was placed, and only once.
    ///
    /// Panics if: auction not found, caller is not the admin, auction not yet
    /// ended, no bids were placed, or funds already withdrawn.
    pub fn withdraw_funds(env: Env, auction_id: u64, admin: Address) {
        admin.require_auth();

        let mut state = load_auction(&env, auction_id);

        if admin != state.admin {
            panic_with_error!(&env, BidError::NotAdmin);
        }
        if env.ledger().sequence() <= state.end_ledger {
            panic_with_error!(&env, BidError::AuctionNotEnded);
        }
        if state.highest_bidder.is_none() {
            panic_with_error!(&env, BidError::NoBids);
        }
        if state.withdrawn {
            panic_with_error!(&env, BidError::AlreadyWithdrawn);
        }

        let tok = token::Client::new(&env, &state.token);
        tok.transfer(
            &env.current_contract_address(),
            &admin,
            &state.current_highest_bid,
        );

        state.withdrawn = true;
        save_auction(&env, auction_id, &state);
    }
}

mod test;
