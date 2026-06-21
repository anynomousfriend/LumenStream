// @ts-nocheck
import * as StellarSdk from "@stellar/stellar-sdk";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";

export const rpc = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org");
export const networkPassphrase = StellarSdk.Networks.TESTNET;

// We'll replace this once deployed
export let CONTRACT_ID = "";
export const setContractId = (id: string) => { CONTRACT_ID = id; };

export const kit = new StellarWalletsKit({
  network: "TESTNET",
  selectedWalletId: "freighter",
});

export async function submitTransaction(signedXdr: string) {
  const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase) as StellarSdk.Transaction;
  const response = await rpc.sendTransaction(transaction);

  if (response.status === "ERROR") {
    throw new Error(`Transaction failed: ${response.errorResult}`);
  }

  // Poll for completion
  let getResponse = await rpc.getTransaction(response.hash);
  while (getResponse.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResponse = await rpc.getTransaction(response.hash);
  }

  if (getResponse.status === "SUCCESS") {
    return {
      hash: response.hash,
      result: getResponse.returnValue,
    };
  }

  throw new Error(`Transaction failed: ${getResponse.status}`);
}

export async function invokeRecordPayments(sourceAddress: string, receivers: string[], amounts: string[]) {
  const account = await rpc.getAccount(sourceAddress);
  const contract = new StellarSdk.Contract(CONTRACT_ID);

  const receiversVal = StellarSdk.nativeToScVal(receivers.map(r => StellarSdk.Address.fromString(r).toScVal()), { type: "vec" });
  const amountsVal = StellarSdk.nativeToScVal(amounts.map(a => StellarSdk.nativeToScVal(BigInt(a), { type: "i128" })), { type: "vec" });

  let transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call("record_payments", StellarSdk.Address.fromString(sourceAddress).toScVal(), receiversVal, amountsVal))
    .setTimeout(180)
    .build();

  const simulation = await rpc.simulateTransaction(transaction);
  if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation failed: ${simulation.error}`);
  }

  transaction = StellarSdk.rpc.assembleTransaction(transaction, simulation).build();
  return transaction.toXDR();
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
