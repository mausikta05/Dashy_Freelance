#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, token};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    RegCount,
    IsRegistered(Address),
}

#[contract]
pub struct RegistryContract;

#[contractimpl]
impl RegistryContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::RegCount, &0u32);
    }

    /// Register a User or Company by paying the required stake in XLM
    pub fn register(env: Env, sender: Address, token_addr: Address, reg_type: Symbol) {
        sender.require_auth();

        let user_symbol = symbol_short!("user");
        let company_symbol = symbol_short!("company");

        let amount: i128 = if reg_type == user_symbol {
            1000_0000000 // 1,000 XLM (7 decimal places)
        } else if reg_type == company_symbol {
            10000_0000000 // 10,000 XLM
        } else {
            panic!("Invalid registration type");
        };

        // Transfer funds from sender to this contract
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&sender, &env.current_contract_address(), &amount);

        // Record registration
        env.storage().instance().set(&DataKey::IsRegistered(sender.clone()), &true);
        
        // Update total registration count
        let count: u32 = env.storage().instance().get(&DataKey::RegCount).unwrap_or(0);
        env.storage().instance().set(&DataKey::RegCount, &(count + 1));

        // Emit Registration Event
        env.events().publish(
            (symbol_short!("reg"), sender, reg_type),
            amount
        );
    }

    /// Check if an address is registered
    pub fn is_registered(env: Env, addr: Address) -> bool {
        env.storage().instance().get(&DataKey::IsRegistered(addr)).unwrap_or(false)
    }

    /// Get total number of registrations
    pub fn get_total_registrations(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::RegCount).unwrap_or(0)
    }

    /// Get the current balance of the contract for a specific token
    pub fn get_balance(env: Env, token_addr: Address) -> i128 {
        let client = token::Client::new(&env, &token_addr);
        client.balance(&env.current_contract_address())
    }

    /// Emergency withdraw (only admin)
    pub fn withdraw(env: Env, token_addr: Address, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &to, &amount);
    }
}

#[cfg(test)]
mod test;
