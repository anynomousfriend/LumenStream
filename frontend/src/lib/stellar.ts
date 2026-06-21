// @ts-nocheck
import * as StellarSdk from "@stellar/stellar-sdk";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { Networks } from "@creit.tech/stellar-wallets-kit";

export const rpc = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org");
export const networkPassphrase = StellarSdk.Networks.TESTNET;

// We'll replace this once deployed
export let CONTRACT_ID = "";
export const setContractId = (id: string) => { CONTRACT_ID = id; };

StellarWalletsKit.init({
  network: Networks.TESTNET,
  modules: defaultModules(),
});

export const kit = StellarWalletsKit;

export async function submitTransaction(signedXdr: string) {
  try {
    let transaction;
    try {
      transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase) as StellarSdk.Transaction;
    } catch(e: any) {
      throw new Error(`fromXDR failed: ${e.message}`);
    }

    let response;
    try {
      response = await rpc.sendTransaction(transaction);
    } catch(e: any) {
      throw new Error(`sendTransaction failed: ${e.message}`);
    }

    if (response.status === "ERROR") {
      throw new Error(`Transaction failed: ${response.errorResult}`);
    }

    // Poll for completion
    let getResponse;
    try {
      getResponse = await rpc.getTransaction(response.hash);
      while (getResponse.status === "NOT_FOUND") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getResponse = await rpc.getTransaction(response.hash);
      }
    } catch(e: any) {
      throw new Error(`getTransaction failed: ${e.message}`);
    }

    if (getResponse.status === "SUCCESS") {
      return {
        hash: response.hash,
        result: getResponse.returnValue,
      };
    }

    throw new Error(`Transaction failed: ${getResponse.status}`);
  } catch(e: any) {
    throw new Error(`[submitTransaction] ${e.message}`);
  }
}

export async function invokeRecordPayments(sourceAddress: string, receivers: string[], amounts: string[]) {
  try {
    const account = await rpc.getAccount(sourceAddress);
    const contract = new StellarSdk.Contract(CONTRACT_ID);

    const receiversVal = StellarSdk.xdr.ScVal.scvVec(receivers.map(r => StellarSdk.Address.fromString(r).toScVal()));
    const amountsVal = StellarSdk.xdr.ScVal.scvVec(amounts.map(a => StellarSdk.nativeToScVal(BigInt(a), { type: "i128" })));

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call("record_payments", StellarSdk.Address.fromString(sourceAddress).toScVal(), receiversVal, amountsVal))
      .setTimeout(180)
      .build();

    let simulation;
    try {
      simulation = await rpc.simulateTransaction(transaction);
    } catch(e: any) {
      throw new Error(`rpc.simulateTransaction failed: ${e.message}`);
    }
    
    if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    try {
      transaction = StellarSdk.rpc.assembleTransaction(transaction, simulation).build();
      return transaction.toXDR();
    } catch(e: any) {
      throw new Error(`assembleTransaction/toXDR failed: ${e.message}`);
    }
  } catch(e: any) {
    throw new Error(`[invokeRecordPayments] ${e.message}`);
  }
}

export async function fetchPayments(userAddress: string) {
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  
  const key = StellarSdk.xdr.ScVal.scvVec([
      StellarSdk.xdr.ScVal.scvSymbol("Payments"),
      StellarSdk.Address.fromString(userAddress).toScVal()
  ]);

  const ledgerKey = StellarSdk.xdr.LedgerKey.contractData(
    new StellarSdk.xdr.LedgerKeyContractData({
      contract: contract.address().toScAddress(),
      key: key,
      durability: StellarSdk.xdr.ContractDataDurability.persistent(),
    })
  );

  const entries = await rpc.getLedgerEntries(ledgerKey);
  if (entries.entries.length === 0) return [];

  const scVal = entries.entries[0].val.contractData().val();
  return StellarSdk.scValToNative(scVal);
}

export async function fetchEvents() {
  const latestLedger = await rpc.getLatestLedger();
  const startLedger = latestLedger.sequence - 1000; // last ~1.5 hours

  const events = await rpc.getEvents({
    startLedger,
    filters: [
      {
        type: "contract",
        contractIds: [CONTRACT_ID],
        topics: [
            // "payment"
            [StellarSdk.xdr.ScVal.scvSymbol("payment").toXDR("base64")]
        ],
      },
    ],
  });

  return events.events;
}
