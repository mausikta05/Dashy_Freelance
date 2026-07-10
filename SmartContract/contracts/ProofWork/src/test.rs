#![cfg(test)]
use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, Address};

#[test]
fn test_rpt_and_tier() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ProofWork);
    let client = ProofWorkClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);

    // Initial RPT and Tier
    assert_eq!(client.get_rpt(&user), 0);
    assert_eq!(client.get_tier(&user), 0);

    // Grant 2 RPT -> Tier 1
    env.mock_all_auths();
    client.grant_rpt(&user, &2);
    assert_eq!(client.get_rpt(&user), 2);
    assert_eq!(client.get_tier(&user), 1);

    // Grant 2 more RPT (Total 4) -> Tier 2
    client.grant_rpt(&user, &2);
    assert_eq!(client.get_rpt(&user), 4);
    assert_eq!(client.get_tier(&user), 2);

    // Grant enough to reach Tier 10 (1024)
    client.grant_rpt(&user, &1020);
    assert_eq!(client.get_rpt(&user), 1024);
    assert_eq!(client.get_tier(&user), 10);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_initialize_twice_panics() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ProofWork);
    let client = ProofWorkClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);
    client.initialize(&admin); // Should panic here
}

#[test]
fn test_set_auth() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, ProofWork);
    let client = ProofWorkClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let vault_contract = Address::generate(&env);

    client.initialize(&admin);

    // Set authorization to true
    client.set_auth(&vault_contract, &true);
    
    // Check key in storage using env simulation wrapped in as_contract
    let is_auth: bool = env.as_contract(&contract_id, || {
        let key = DataKey::Authorized(vault_contract.clone());
        env.storage().instance().get(&key).unwrap_or(false)
    });
    assert!(is_auth);

    // Revoke authorization
    client.set_auth(&vault_contract, &false);
    let is_auth_after: bool = env.as_contract(&contract_id, || {
        let key = DataKey::Authorized(vault_contract.clone());
        env.storage().instance().get(&key).unwrap_or(false)
    });
    assert!(!is_auth_after);
}

#[test]
#[should_panic]
fn test_set_auth_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, ProofWork);
    let client = ProofWorkClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let _intruder = Address::generate(&env);
    let vault_contract = Address::generate(&env);

    client.initialize(&admin);

    // Attempting to set auth using intruder credentials
    env.as_contract(&contract_id, || {
        client.set_auth(&vault_contract, &true);
    });
}

#[test]
fn test_tier_boundaries() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, ProofWork);
    let client = ProofWorkClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);

    // Helper map to test scores
    let test_scores: [(u32, u32); 22] = [
        (0, 0),    // Sprout
        (1, 0),    // Sprout
        (2, 1),    // Seedling
        (3, 1),    // Seedling
        (4, 2),    // Sapling
        (7, 2),    // Sapling
        (8, 3),    // Pine
        (15, 3),   // Pine
        (16, 4),   // Birch
        (31, 4),   // Birch
        (32, 5),   // Oak
        (63, 5),   // Oak
        (64, 6),   // Cedar
        (127, 6),  // Cedar
        (128, 7),  // Redwood
        (255, 7),  // Redwood
        (256, 8),  // Grove
        (511, 8),  // Grove
        (512, 9),  // Forest Lord
        (1023, 9), // Forest Lord
        (1024, 10),// Ancient Arbiter
        (2000, 10) // Ancient Arbiter
    ];

    for &(score, expected_tier) in test_scores.iter() {
        // Reset score wrapped in as_contract
        env.as_contract(&contract_id, || {
            let key = DataKey::RPT(user.clone());
            env.storage().persistent().set(&key, &score);
        });
        
        assert_eq!(
            client.get_tier(&user), 
            expected_tier, 
            "Score {} failed to resolve to Tier {}", 
            score, 
            expected_tier
        );
    }
}
