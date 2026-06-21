// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import gsap from "gsap";
import { kit, setContractId, CONTRACT_ID, invokeRecordPayments, submitTransaction, fetchPayments, fetchEvents } from "./lib/stellar";

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [contractInput, setContractInput] = useState<string>("");
  const [receiversStr, setReceiversStr] = useState<string>("");
  const [amountsStr, setAmountsStr] = useState<string>("");
  const [payments, setPayments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const mainRef = useRef(null);
  const metaRef = useRef(null);
  const controlsRef = useRef(null);
  const waveRef = useRef(null);

  useEffect(() => {
    // Initial entrance animations
    gsap.fromTo(metaRef.current, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 1, ease: "power3.out" });
    gsap.fromTo(mainRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.2 });
    gsap.fromTo(controlsRef.current, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 1, ease: "power3.out", delay: 0.4 });

    // Subtle wave animation
    if (waveRef.current) {
      gsap.to(waveRef.current, {
        x: -40,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }
  }, []);

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

    // Micro-interaction for submit
    gsap.fromTo(".central-data-image", 
      { opacity: 0.5, scale: 0.98 }, 
      { opacity: 1, scale: 1, duration: 0.3, yoyo: true, repeat: 3 }
    );

    try {
      const receivers = receiversStr.split(",").map(s => s.trim());
      const amounts = amountsStr.split(",").map(s => s.trim());

      const xdr = await invokeRecordPayments(address, receivers, amounts);

      toast.loading("Please sign in your wallet...", { id: toastId });
      let signedXdr;
      try {
        const signResult = await kit.signTransaction(xdr, { networkPassphrase: "Test SDF Network ; September 2015" });
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
      
      toast.success(`Success! Hash: ${result.hash.slice(0,10)}...`, { id: toastId });
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
    <>
      <Toaster position="top-right">
        {(t) => (
          <div
            className={`brutalist-toast ${t.type}`}
            style={{
              opacity: t.visible ? 1 : 0,
              transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div className={`toast-icon ${t.type}`}>
              {t.type === 'error' && <span style={{color: 'var(--bg-color)', fontWeight: 900, lineHeight: '14px'}}>!</span>}
              {t.type === 'success' && <span style={{color: 'var(--bg-color)', fontWeight: 900, lineHeight: '14px', fontSize: '9px'}}>✓</span>}
            </div>
            <div>
              <div style={{opacity: 0.6, fontSize: '8px', marginBottom: '2px'}}>
                {t.type === 'loading' ? 'SYS_PROC' : t.type === 'error' ? 'SYS_ERR' : 'SYS_OK'}
              </div>
              <div>{typeof t.message === 'function' ? t.message(t) : t.message}</div>
            </div>
          </div>
        )}
      </Toaster>
      <aside className="metadata" ref={metaRef}>
          <div className="meta-group">
              <div className="foundry-label">
                  Stellar Network<br/>
                  Department of Ledger Verification<br/>
                  Protocol Division
              </div>
              <div>Decentralized Application</div>
              <div>Transaction Report XLM-402</div>
              <div>General Technical<br/>Report STR-90-01</div>
              <div style={{marginTop: '12px'}}>June 2026</div>
          </div>

          <div className="logo-mark">
              <span style={{fontSize: '18px'}}>S</span>
          </div>

          <div className="meta-group" style={{marginTop: 'auto'}}>
              <div className="field-label">CONNECTED WALLET</div>
              <div style={{wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '10px', opacity: 0.8}}>
                  {address ? `${address.slice(0, 10)}...${address.slice(-10)}` : "NONE"}
              </div>
              {address && <div className="status-pill" style={{marginTop: '8px', width: 'fit-content'}}>TESTNET ACTIVE</div>}
              {address ? (
                 <button onClick={disconnect} className="action-button danger" style={{marginTop: '15px'}}>Disconnect</button>
              ) : (
                 <button onClick={connect} className="action-button" style={{marginTop: '15px'}}>Connect Wallet</button>
              )}
          </div>
      </aside>

      <main className="main-display" ref={mainRef}>
          <header>
              <h1>Streamflow Data for<br/>Multi-Address Payments<br/>in Stellar Network</h1>
          </header>

          <section className="recipients-list">
              <div style={{opacity: 0.6, fontSize: '10px', marginBottom: '8px'}}>RECENT TARGETS</div>
              {receiversStr ? receiversStr.split(',').map((r, i) => (
                 <div key={i}>{r.trim()}</div>
              )) : (
                 <>
                  <div>N/A - AWAITING INPUT</div>
                 </>
              )}
          </section>

          <div className="visual-system">
              <div className="semicircle-top"></div>
              <div className="central-data-image"></div>
              <div className="semicircle-bottom">
                  <svg className="wave-graph" viewBox="0 0 480 120" ref={waveRef}>
                      <path d="M0,100 C50,80 100,110 150,60 C200,10 250,90 300,40 C350,10 400,60 480,20 L480,120 L0,120 Z"></path>
                      <path d="M0,110 Q120,20 240,80 T480,40" strokeDasharray="4"></path>
                  </svg>
              </div>
          </div>

          <table className="payment-table">
              <thead>
                  <tr>
                      <th>Address Path</th>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Status</th>
                  </tr>
              </thead>
              <tbody>
                  {payments.length === 0 && (
                     <tr>
                       <td colSpan={4} style={{opacity: 0.6}}>No payments verified on-chain yet.</td>
                     </tr>
                  )}
                  {payments.map((p, i) => (
                      <tr key={i} className="payment-row" onMouseEnter={(e) => gsap.to(e.currentTarget, { backgroundColor: 'rgba(62, 95, 176, 0.1)', duration: 0.2 })} onMouseLeave={(e) => gsap.to(e.currentTarget, { backgroundColor: 'transparent', duration: 0.2 })}>
                          <td>{String(p.to)}</td>
                          <td>XLM</td>
                          <td>{String(p.amount)}</td>
                          <td><span className="status-pill">VERIFIED</span></td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </main>

      <aside className="controls" ref={controlsRef}>
          <div className="field-group">
              <label className="field-label">
                DEPLOYED CONTRACT ID 
                {contractInput && (
                  <a href={`https://stellar.expert/explorer/testnet/contract/${contractInput}`} target="_blank" rel="noreferrer" style={{color: 'var(--primary-blue)', marginLeft: '10px', textDecoration: 'underline'}}>
                    [Verify on Stellar Expert Explorer]
                  </a>
                )}
              </label>
              <input 
                type="text" 
                className="field-input" 
                placeholder="CA5HUAE5DEFVN62OCCI6NCQ4LSZ2AR67FGS4XC4YURJVLB2JVRZCDM6Q"
                value={contractInput}
                onChange={e => setContractInput(e.target.value)}
              />
              <button onClick={handleUpdateContract} className="action-button secondary" style={{marginTop: '10px'}}>Set Contract</button>
          </div>

          <div className="field-group">
              <label className="field-label">RECEIVERS (COMMA SEPARATED)</label>
              <input 
                type="text" 
                className="field-input" 
                placeholder="GB..., GC..."
                value={receiversStr}
                onChange={e => setReceiversStr(e.target.value)}
              />
          </div>

          <div className="field-group">
              <label className="field-label">AMOUNTS (COMMA SEPARATED)</label>
              <input 
                type="text" 
                className="field-input" 
                placeholder="100, 200"
                value={amountsStr}
                onChange={e => setAmountsStr(e.target.value)}
              />
          </div>

          <button className="action-button" onClick={handleSend} disabled={loading}>
              {loading ? "PROCESSING..." : "EXECUTE STREAM"}
          </button>

          <div className="stats-block">
              <div className="stats-content">
                  <div className="stat-item">
                      <span className="stat-label">Total Verified Payments</span>
                      <span className="stat-value">{payments.length}</span>
                  </div>
                  <div className="stat-item" style={{marginBottom: 0}}>
                      <span className="stat-label">Network Events Received</span>
                      <span className="stat-value">{events.length}</span>
                  </div>
              </div>
          </div>

          <div className="meta-group" style={{fontSize: '9px', opacity: 0.6, lineHeight: 1.4}}>
              * Data reflected here is retrieved directly from the Horizon API. Ensure ledger consistency before final execution. This technical report is produced by the LumenStream Ecosystem Interface.
          </div>
      </aside>
    </>
  );
}

export default App;
