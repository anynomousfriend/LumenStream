#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, symbol_short, Address, Env, Vec};

#[contract]
pub struct PaymentTracker;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    LengthMismatch = 1,
    EmptyArray = 2,
    InvalidAmount = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Payment {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Payments(Address),
}

#[contractimpl]
impl PaymentTracker {
    pub fn record_payments(env: Env, from: Address, receivers: Vec<Address>, amounts: Vec<i128>) -> Result<(), Error> {
        from.require_auth();

        if receivers.len() == 0 {
            return Err(Error::EmptyArray);
        }

        if receivers.len() != amounts.len() {
            return Err(Error::LengthMismatch);
        }

        let timestamp = env.ledger().timestamp();

        for i in 0..receivers.len() {
            let to = receivers.get(i).unwrap();
            let amount = amounts.get(i).unwrap();

            if amount <= 0 {
                return Err(Error::InvalidAmount);
            }

            let payment = Payment {
                from: from.clone(),
                to: to.clone(),
                amount,
                timestamp,
            };

            // Store for sender
            let key_from = DataKey::Payments(from.clone());
            let mut from_payments: Vec<Payment> = env.storage().persistent().get(&key_from).unwrap_or(Vec::new(&env));
            from_payments.push_back(payment.clone());
            env.storage().persistent().set(&key_from, &from_payments);

            // Store for receiver
            let key_to = DataKey::Payments(to.clone());
            let mut to_payments: Vec<Payment> = env.storage().persistent().get(&key_to).unwrap_or(Vec::new(&env));
            to_payments.push_back(payment.clone());
            env.storage().persistent().set(&key_to, &to_payments);

            // Emit event
            env.events().publish((symbol_short!("payment"), from.clone(), to.clone()), payment);
        }

        Ok(())
    }

    pub fn get_payments(env: Env, user: Address) -> Vec<Payment> {
        let key = DataKey::Payments(user);
        env.storage().persistent().get(&key).unwrap_or(Vec::new(&env))
    }
}
