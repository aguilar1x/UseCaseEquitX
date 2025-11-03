#![cfg(test)]
extern crate std;
use super::*;
use soroban_sdk::{Address, Env, testutils::Address as _};

fn create_governance_contract<'a>(e: &Env) -> (GovernanceContractClient<'a>, Address) {
    let admin = Address::generate(&e);
    let contract_id = e.register(GovernanceContract, (admin.clone(),));
    let client = GovernanceContractClient::new(&e, &contract_id);
    (client, admin)
}

#[test]

fn test_governance_constructor() {
    let e = Env::default();
    e.mock_all_auths();

    let (_client, _admin) = create_governance_contract(&e);
}
