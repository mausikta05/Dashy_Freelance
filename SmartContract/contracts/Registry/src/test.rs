#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, symbol_short};
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient as TokenAdminClient};

#[test]
fn test_registration() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let company = Address::generate(&env);

    // Register Contract
    let contract_id = env.register(RegistryContract, ());
    let client = RegistryContractClient::new(&env, &contract_id);

    // Initialize
    client.initialize(&admin);

    // Setup Mock Token (XLM)
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = TokenClient::new(&env, &token_id);
    let token_admin_client = TokenAdminClient::new(&env, &token_id);

    // Mint tokens to users
    token_admin_client.mint(&user, &2000_0000000); // 2000 XLM
    token_admin_client.mint(&company, &15000_0000000); // 15000 XLM

    // 1. Test User Registration (1,000 XLM)
    client.register(&user, &token_id, &symbol_short!("user"));
    assert_eq!(token_client.balance(&user), 1000_0000000);
    assert_eq!(token_client.balance(&contract_id), 1000_0000000);
    assert!(client.is_registered(&user));
    assert_eq!(client.get_total_registrations(), 1);

    // 2. Test Company Registration (10,000 XLM)
    client.register(&company, &token_id, &symbol_short!("company"));
    assert_eq!(token_client.balance(&company), 5000_0000000);
    assert_eq!(token_client.balance(&contract_id), 11000_0000000);
    assert!(client.is_registered(&company));
    assert_eq!(client.get_total_registrations(), 2);
    assert_eq!(client.get_balance(&token_id), 11000_0000000);

    // 3. Test Withdraw
    client.withdraw(&token_id, &admin, &5000_0000000);
    assert_eq!(token_client.balance(&admin), 5000_0000000);
    assert_eq!(token_client.balance(&contract_id), 6000_0000000);
}

#[test]
#[should_panic(expected = "Invalid registration type")]
fn test_invalid_type() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(RegistryContract, ());
    let client = RegistryContractClient::new(&env, &contract_id);
    let user = Address::generate(&env);
    let token_id = Address::generate(&env);
    client.register(&user, &token_id, &symbol_short!("invalid"));
}
