// Dashy EscrowVault Smart Contract - v2.1
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Treasury,
    TokenID,
    Job(u64),
    JobCounter,
    ProofWorkID,
}

mod pw_interface {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/dashy_proofwork.wasm"
    );
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Job {
    pub company: Address,
    pub worker: Option<Address>,
    pub amount: i128,
    pub status: u32, // 0: OPEN, 1: ACTIVE, 2: COMPLETED, 3: DISPUTED, 4: CANCELLED
}

#[contract]
pub struct EscrowVault;

#[contractimpl]
impl EscrowVault {
    /// Diagnostic function to check contract health
    pub fn ping(_env: Env) -> u32 {
        42
    }

    /// Initialize the contract with core settings
    pub fn init(env: Env, admin: Address, token: Address, treasury: Address, pw_address: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenID, &token);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage()
            .instance()
            .set(&DataKey::ProofWorkID, &pw_address);
        env.storage().instance().set(&DataKey::JobCounter, &0u64);
    }

    pub fn set_pw_id(env: Env, new_pw_id: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::ProofWorkID, &new_pw_id);
    }

    pub fn set_treasury(env: Env, new_treasury: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Treasury, &new_treasury);
    }

    /// Emergency withdraw for admin
    pub fn withdraw(env: Env, token_addr: Address, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &to, &amount);
    }

    /// Full job creation with escrow deposit
    pub fn create_job(env: Env, company: Address, amount: i128) -> u64 {
        company.require_auth();

        let token_id = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::TokenID)
            .expect("Not initialized");
        let token_client = token::Client::new(&env, &token_id);

        token_client.transfer(&company, &env.current_contract_address(), &amount);

        let mut counter: u64 = env
            .storage()
            .instance()
            .get(&DataKey::JobCounter)
            .unwrap_or(0);
        counter += 1;
        env.storage().instance().set(&DataKey::JobCounter, &counter);

        let job = Job {
            company: company.clone(),
            worker: None,
            amount,
            status: 0, // OPEN
        };

        let key = DataKey::Job(counter);
        env.storage().persistent().set(&key, &job);
        env.storage().persistent().extend_ttl(&key, 100000, 100000);

        counter
    }

    /// Company assigns a specific worker to the job
    pub fn assign_worker(env: Env, job_id: u64, worker: Address) {
        let key = DataKey::Job(job_id);
        let mut job = env
            .storage()
            .persistent()
            .get::<_, Job>(&key)
            .expect("Job not found");
        job.company.require_auth();

        if job.status != 0 {
            panic!("Job not in OPEN state");
        }

        job.worker = Some(worker);
        job.status = 1; // ACTIVE
        env.storage().persistent().set(&key, &job);
    }

    /// Company approves work and releases payment (95/5 split)
    pub fn release_payment(env: Env, job_id: u64) {
        let key = DataKey::Job(job_id);
        let mut job = env
            .storage()
            .persistent()
            .get::<_, Job>(&key)
            .expect("Job not found");
        job.company.require_auth();

        if job.status != 1 {
            panic!("Job not in ACTIVE state");
        }

        let worker = job.worker.as_ref().expect("No worker assigned");
        let token_id = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::TokenID)
            .unwrap();
        let treasury = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Treasury)
            .unwrap();
        let token_client = token::Client::new(&env, &token_id);

        let treasury_fee = (job.amount * 5) / 100;
        let worker_payout = job.amount - treasury_fee;

        token_client.transfer(&env.current_contract_address(), &treasury, &treasury_fee);
        token_client.transfer(&env.current_contract_address(), worker, &worker_payout);

        let pw_id = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::ProofWorkID)
            .unwrap();
        let pw_client = pw_interface::Client::new(&env, &pw_id);
        pw_client.grant_rpt(worker, &1u32);
        pw_client.grant_rpt(&job.company, &1u32);

        job.status = 2; // COMPLETED
        env.storage().persistent().set(&key, &job);
    }

    /// Mark a job as disputed
    pub fn dispute(env: Env, job_id: u64, caller: Address) {
        caller.require_auth();
        let key = DataKey::Job(job_id);
        let mut job = env
            .storage()
            .persistent()
            .get::<_, Job>(&key)
            .expect("Job not found");

        if caller != job.company && Some(caller) != job.worker {
            panic!("Unauthorized caller");
        }

        if job.status != 1 {
            panic!("Cannot dispute job in current state");
        }

        job.status = 3; // DISPUTED
        env.storage().persistent().set(&key, &job);
    }

    /// Admin resolves a dispute
    pub fn resolve_dispute(env: Env, job_id: u64, worker_pct: i128) {
        let admin = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Admin)
            .expect("Not initialized");
        admin.require_auth();

        let key = DataKey::Job(job_id);
        let mut job = env
            .storage()
            .persistent()
            .get::<_, Job>(&key)
            .expect("Job not found");

        if job.status != 3 {
            panic!("Job not in DISPUTED state");
        }

        let worker = job.worker.as_ref().expect("No worker assigned");
        let token_id = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::TokenID)
            .unwrap();
        let token_client = token::Client::new(&env, &token_id);

        let worker_payout = (job.amount * (worker_pct as i128)) / 100;
        let company_refund = job.amount - worker_payout;

        if worker_payout > 0 {
            token_client.transfer(&env.current_contract_address(), worker, &worker_payout);
        }
        if company_refund > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &job.company,
                &company_refund,
            );
        }

        job.status = 2; // Marked as RESOLVED/COMPLETED
        env.storage().persistent().set(&key, &job);
    }

    /// Company withdraws a job
    pub fn withdraw_job(env: Env, job_id: u64) {
        let key = DataKey::Job(job_id);
        let mut job = env
            .storage()
            .persistent()
            .get::<_, Job>(&key)
            .expect("Job not found");
        job.company.require_auth();

        if job.status != 0 {
            panic!("Cannot withdraw job that is not OPEN");
        }

        let token_id = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::TokenID)
            .unwrap();
        let token_client = token::Client::new(&env, &token_id);

        token_client.transfer(&env.current_contract_address(), &job.company, &(job.amount as i128));

        job.status = 4; // CANCELLED
        env.storage().persistent().set(&key, &job);
    }

    pub fn get_job(env: Env, job_id: u64) -> Job {
        env.storage()
            .persistent()
            .get::<_, Job>(&DataKey::Job(job_id))
            .expect("Job not found")
    }
}

mod test;
