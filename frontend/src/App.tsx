// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import { kit, setContractId, CONTRACT_ID, invokeRecordPayments, submitTransaction, fetchPayments, fetchEvents } from "./lib/stellar";

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [contractInput, setContractInput] = useState<string>("");
  const [receiversStr, setReceiversStr] = useState<string>("");
  const [amountsStr, setAmountsStr] = useState<string>("");
  const [payments, setPayments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Poll for events and payments
    const interval = setInterval(async () => {
      if (!CONTRACT_ID) return;
      try {
        const evts = await fetchEvents();
        setEvents(evts);
        
        if (address) {
          const pmts = await fetchPayments(address);
          setPayments(pmts);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [address]);

  const connect = async () => {
    try {
      const { address: addr } = await kit.authModal();
      setAddress(addr);
      toast.success("Wallet connected!");
    } catch (err: any) {
      if (err.message?.includes("not installed") || err.message?.includes("not found")) {
         toast.error("Wallet not found. Please install the extension.");
      } else {
         toast.error("Connection failed: " + err.message);
      }
    }
  };

  const disconnect = () => {
    setAddress(null);
    toast.success("Disconnected.");
  };

  const handleUpdateContract = () => {
    setContractId(contractInput);
    toast.success("Contract ID updated.");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast.error("Please connect wallet first.");
      return;
    }
    if (!CONTRACT_ID) {
      toast.error("Please set Contract ID first.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Building transaction...");

    try {
      const receivers = receiversStr.split(",").map(s => s.trim());
      const amounts = amountsStr.split(",").map(s => s.trim());

      const xdr = await invokeRecordPayments(address, receivers, amounts);

      toast.loading("Please sign in your wallet...", { id: toastId });
      let signedXdr;
      try {
        const signResult = await kit.signTransaction(xdr);
        signedXdr = signResult.signedTxXdr;
      } catch (signErr: any) {
        if (signErr.message?.toLowerCase().includes("reject") || signErr.message?.toLowerCase().includes("cancel")) {
          throw new Error("Transaction rejected by user.");
        }
        if (signErr.message?.toLowerCase().includes("not found")) {
           throw new Error("Wallet not found. Please install the extension.");
        }
        throw signErr;
      }

      toast.loading("Submitting transaction...", { id: toastId });
      const result = await submitTransaction(signedXdr);
      
      toast.success(`Success! Hash: ${result.hash}`, { id: toastId });
      setReceiversStr("");
      setAmountsStr("");
    } catch (error: any) {
      let msg = error.message || String(error);
      if (msg.toLowerCase().includes("insufficient balance") || msg.toLowerCase().includes("op_underfunded")) {
        msg = "Insufficient balance for fees/operation.";
      }
      toast.error(`Error: ${msg}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Toaster />
      <header>
        <h1>LumenStream</h1>
        {address ? (
          <div className="wallet-info">
            <span>{address.slice(0, 5)}...{address.slice(-4)}</span>
            <button onClick={disconnect} className="btn btn-danger">Disconnect</button>
          </div>
        ) : (
          <button onClick={connect} className="btn btn-primary">Connect Wallet</button>
        )}
      </header>

      <main>
        <section className="card">
          <h2>Configuration</h2>
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Deployed Contract ID" 
              value={contractInput} 
              onChange={e => setContractInput(e.target.value)} 
            />
            <button onClick={handleUpdateContract} className="btn btn-secondary">Set Contract</button>
          </div>
        </section>

        <section className="card">
          <h2>Send Multi-Payment</h2>
          <form onSubmit={handleSend}>
            <div className="form-group">
              <label>Receivers (comma separated)</label>
              <input 
                type="text" 
                placeholder="G..., G..." 
                value={receiversStr}
                onChange={e => setReceiversStr(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Amounts (comma separated)</label>
              <input 
                type="text" 
                placeholder="100, 200" 
                value={amountsStr}
                onChange={e => setAmountsStr(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Processing..." : "Record Payments"}
            </button>
          </form>
        </section>

        <div className="grid">
          <section className="card">
            <h2>Your Payments</h2>
            <ul>
              {payments.length === 0 && <li>No payments found.</li>}
              {payments.map((p, i) => (
                <li key={i}>
                  <strong>To:</strong> {p.to().toString().slice(0, 5)}... 
                  <strong> Amount:</strong> {p.amount().toString()}
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>Recent Events</h2>
            <ul>
              {events.length === 0 && <li>No events yet.</li>}
              {events.map((e, i) => (
                <li key={i}>
                  Event {e.id}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
