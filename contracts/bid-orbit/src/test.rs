#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events, Ledger},
    token, Address, Env, Event, String,
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

fn setup() -> (Env, BidOrbitContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);
    let contract_id = env.register(BidOrbitContract, ());
    let client = BidOrbitContractClient::new(&env, &contract_id);
    (env, client)
}

/// Registers a Stellar Asset Contract and returns its address plus a minting client.
fn make_token<'a>(env: &'a Env) -> (Address, token::StellarAssetClient<'a>) {
    let token_admin = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let addr = sac.address();
    let sac_client = token::StellarAssetClient::new(env, &addr);
    (addr, sac_client)
}

/// Creates a live auction and returns (auction_id, token_addr, token_sac).
fn open_auction<'a>(
    env: &'a Env,
    client: &BidOrbitContractClient<'a>,
    start_price: i128,
) -> (u64, Address, token::StellarAssetClient<'a>) {
    let admin = Address::generate(env);
    let (token_addr, token_sac) = make_token(env);
    let auction_id = client.create_auction(
        &admin,
        &String::from_str(env, "Test Item"),
        &start_price,
        &200_u32,
        &token_addr,
    );
    (auction_id, token_addr, token_sac)
}

// ---------------------------------------------------------------------------
// auction_count — baseline
// ---------------------------------------------------------------------------

#[test]
fn auction_counter_starts_at_zero() {
    let (_env, client) = setup();
    assert_eq!(client.auction_count(), 0u64);
}

// ---------------------------------------------------------------------------
// create_auction — happy path
// ---------------------------------------------------------------------------

#[test]
fn create_auction_returns_correct_id() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let (token_addr, _) = make_token(&env);

    let id = client.create_auction(
        &admin,
        &String::from_str(&env, "Vintage Guitar"),
        &1000_i128,
        &200_u32,
        &token_addr,
    );

    assert_eq!(id, 0u64);
    assert_eq!(client.auction_count(), 1u64);
}

#[test]
fn second_auction_increments_id() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let (token_addr, _) = make_token(&env);

    client.create_auction(
        &admin,
        &String::from_str(&env, "Rare Coin"),
        &500_i128,
        &200_u32,
        &token_addr,
    );
    let second_id = client.create_auction(
        &admin,
        &String::from_str(&env, "Signed Jersey"),
        &750_i128,
        &300_u32,
        &token_addr,
    );

    assert_eq!(second_id, 1u64);
    assert_eq!(client.auction_count(), 2u64);
}

// ---------------------------------------------------------------------------
// create_auction — validation failures
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn create_auction_rejects_zero_start_price() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let (token_addr, _) = make_token(&env);

    client.create_auction(
        &admin,
        &String::from_str(&env, "Mystery Box"),
        &0_i128,
        &200_u32,
        &token_addr,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn create_auction_rejects_negative_start_price() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let (token_addr, _) = make_token(&env);

    client.create_auction(
        &admin,
        &String::from_str(&env, "Mystery Box"),
        &-100_i128,
        &200_u32,
        &token_addr,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn create_auction_rejects_end_ledger_in_the_past() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let (token_addr, _) = make_token(&env);

    client.create_auction(
        &admin,
        &String::from_str(&env, "Old Watch"),
        &1000_i128,
        &50_u32,
        &token_addr,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn create_auction_rejects_end_ledger_equal_to_current() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let (token_addr, _) = make_token(&env);

    client.create_auction(
        &admin,
        &String::from_str(&env, "Old Watch"),
        &1000_i128,
        &100_u32,
        &token_addr,
    );
}

// ---------------------------------------------------------------------------
// place_bid — first bid above start price succeeds
// ---------------------------------------------------------------------------

#[test]
fn first_bid_above_start_price_succeeds() {
    let (env, client) = setup();
    let (auction_id, token_addr, token_sac) = open_auction(&env, &client, 1000_i128);

    let bidder = Address::generate(&env);
    token_sac.mint(&bidder, &5000_i128);

    let tok = token::Client::new(&env, &token_addr);
    let contract_addr = client.address.clone();

    client.place_bid(&auction_id, &bidder, &1500_i128);

    // Bidder paid 1500; contract now escrows it.
    assert_eq!(tok.balance(&bidder), 3500_i128);
    assert_eq!(tok.balance(&contract_addr), 1500_i128);
}

// ---------------------------------------------------------------------------
// place_bid — bids at or below current highest are rejected
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn bid_below_current_highest_is_rejected() {
    let (env, client) = setup();
    let (auction_id, _, token_sac) = open_auction(&env, &client, 1000_i128);

    let bidder1 = Address::generate(&env);
    let bidder2 = Address::generate(&env);
    token_sac.mint(&bidder1, &5000_i128);
    token_sac.mint(&bidder2, &5000_i128);

    client.place_bid(&auction_id, &bidder1, &2000_i128);
    // 1800 < 2000 — must be rejected (BidTooLow = #5).
    client.place_bid(&auction_id, &bidder2, &1800_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn bid_equal_to_start_price_is_rejected() {
    let (env, client) = setup();
    let (auction_id, _, token_sac) = open_auction(&env, &client, 1000_i128);

    let bidder = Address::generate(&env);
    token_sac.mint(&bidder, &5000_i128);

    // 1000 == current_highest_bid (start_price) — strictly greater is required.
    client.place_bid(&auction_id, &bidder, &1000_i128);
}

// ---------------------------------------------------------------------------
// place_bid — bid after end_ledger is rejected
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn bid_after_end_ledger_is_rejected() {
    let (env, client) = setup();
    let (auction_id, _, token_sac) = open_auction(&env, &client, 1000_i128);

    let bidder = Address::generate(&env);
    token_sac.mint(&bidder, &5000_i128);

    // Advance ledger past the auction's end_ledger (200).
    env.ledger().set_sequence_number(201);

    client.place_bid(&auction_id, &bidder, &1500_i128);
}

// ---------------------------------------------------------------------------
// place_bid — second bidder outbids and first bidder is fully refunded
// ---------------------------------------------------------------------------

#[test]
fn second_bidder_outbids_and_first_bidder_is_refunded() {
    let (env, client) = setup();
    let (auction_id, token_addr, token_sac) = open_auction(&env, &client, 1000_i128);

    let bidder1 = Address::generate(&env);
    let bidder2 = Address::generate(&env);
    token_sac.mint(&bidder1, &5000_i128);
    token_sac.mint(&bidder2, &5000_i128);

    let tok = token::Client::new(&env, &token_addr);
    let contract_addr = client.address.clone();

    // First bid: bidder1 locks 1500 in escrow.
    client.place_bid(&auction_id, &bidder1, &1500_i128);
    assert_eq!(tok.balance(&bidder1), 3500_i128);
    assert_eq!(tok.balance(&contract_addr), 1500_i128);

    // Second bid: bidder2 outbids with 2500; bidder1 gets their 1500 back.
    client.place_bid(&auction_id, &bidder2, &2500_i128);

    // bidder1 refunded 1500 → net zero change from their mint.
    assert_eq!(tok.balance(&bidder1), 5000_i128);
    // bidder2 paid 2500.
    assert_eq!(tok.balance(&bidder2), 2500_i128);
    // Contract escrows only the winning bid.
    assert_eq!(tok.balance(&contract_addr), 2500_i128);
}

// ---------------------------------------------------------------------------
// place_bid — BidPlaced event is emitted with correct data
// ---------------------------------------------------------------------------

#[test]
fn bid_emits_event_with_correct_data() {
    let (env, client) = setup();
    let (auction_id, _, token_sac) = open_auction(&env, &client, 1000_i128);

    let bidder = Address::generate(&env);
    token_sac.mint(&bidder, &5000_i128);

    client.place_bid(&auction_id, &bidder, &1500_i128);

    let contract_addr = client.address.clone();
    let expected = BidPlaced {
        auction_id,
        bidder: bidder.clone(),
        amount: 1500_i128,
    };

    // filter_by_contract isolates auction events from token transfer events.
    // Array literal avoids std::vec! in a no_std crate; matches PartialEq<[ContractEvent; N]>.
    assert_eq!(
        env.events().all().filter_by_contract(&contract_addr),
        [expected.to_xdr(&env, &contract_addr)],
    );
}
