#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address, symbol_short};

pub mod xasset {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/xasset.wasm");
}

#[contract]

pub struct GovernanceContract;

const ADMIN_KEY: soroban_sdk::Symbol = symbol_short!("ADMIN");

#[contractimpl]
impl GovernanceContract {
    pub fn __constructor(env: &Env, admin: Address) {
        env.storage().instance().set(&ADMIN_KEY, &admin);
    }

    fn require_admin(env: &Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("Admin must be set");
        admin.require_auth();
    }

    pub fn execute_change(env: &Env, contract: Address, new_value: u32) -> u32 {
        // Only admin can execute this function
        Self::require_admin(env);

        // Call the xasset contract to update min_collat_ratio.
        // This is the core governance action: changing the min_collat_ratio parameter
        let xasset_client = xasset::Client::new(env, &contract);
        xasset_client.set_min_collat_ratio(&new_value) 
    }


}

#[cfg(test)]
mod test;
