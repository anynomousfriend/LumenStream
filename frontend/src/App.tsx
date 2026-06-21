// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import gsap from "gsap";
import Lenis from "lenis";
import { kit, setContractId, CONTRACT_ID, invokeRecordPayments, submitTransaction, fetchPayments, fetchEvents } from "./lib/stellar";

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [contractInput, setContractInput] = useState<string>("");
  const [receiversStr, setReceiversStr] = useState<string>("");
  const [amountsStr, setAmountsStr] = useState<string>("");
  const [payments, setPayments] = useState<any[]>([]);
  const [nodePositions, setNodePositions] = useState<{x: number, y: number}[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
    };
  }, []);

  useEffect(() => {
      setNodePositions(prev => {
        if (prev.length === payments.length) return prev;
        return payments.map((p, i) => {
            const angle = (i / payments.length) * Math.PI * 2;
            const radius = payments.length > 4 ? (i % 2 === 0 ? 120 : 80) : 100; 
            return {
                x: 240 + Math.cos(angle) * radius,
                y: 140 + Math.sin(angle) * radius
            };
        });
      });
  }, [payments]);

  const handlePointerDown = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startPos = nodePositions[index];

      const onMove = (moveEvent: PointerEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          setNodePositions(prev => {
              const newPos = [...prev];
              if (newPos[index]) {
                  newPos[index] = { x: startPos.x + dx, y: startPos.y + dy };
              }
              return newPos;
          });
      };

      const onUp = (upEvent: PointerEvent) => {
          el.releasePointerCapture(upEvent.pointerId);
          el.removeEventListener('pointermove', onMove as any);
          el.removeEventListener('pointerup', onUp as any);
      };

      el.addEventListener('pointermove', onMove as any);
      el.addEventListener('pointerup', onUp as any);
  };

  const svgContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!svgContainerRef.current || payments.length === 0) return;
      
      const rect = svgContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const scaleX = 480 / rect.width;
      const scaleY = 280 / rect.height;
      
      const mappedMouseX = mouseX * scaleX;
      const mappedMouseY = mouseY * scaleY;

      nodePositions.forEach((pos, i) => {
          const dx = pos.x - mappedMouseX;
          const dy = pos.y - mappedMouseY;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 60 && dist > 0) {
              const force = (60 - dist) / 60;
              const pushX = (dx / dist) * force * 15;
              const pushY = (dy / dist) * force * 15;
              
              gsap.to(`#node-content-${i}`, { x: pushX, y: pushY, duration: 0.2, ease: "power2.out", overwrite: "auto" });
              gsap.to(`#node-line-${i}`, { attr: { x2: pos.x + pushX, y2: pos.y + pushY }, duration: 0.2, ease: "power2.out", overwrite: "auto" });
          } else {
              gsap.to(`#node-content-${i}`, { x: 0, y: 0, duration: 0.4, ease: "power2.out", overwrite: "auto" });
              gsap.to(`#node-line-${i}`, { attr: { x2: pos.x, y2: pos.y }, duration: 0.4, ease: "power2.out", overwrite: "auto" });
          }
      });
  };

  const handleMouseLeave = () => {
      nodePositions.forEach((pos, i) => {
          gsap.to(`#node-content-${i}`, { x: 0, y: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" });
          gsap.to(`#node-line-${i}`, { attr: { x2: pos.x, y2: pos.y }, duration: 0.5, ease: "power2.out", overwrite: "auto" });
      });
  };

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

  // Animate nodes popping in and floating gently
  useEffect(() => {
    if (payments.length > 0) {
      // Kill any existing tweens to prevent overlap when re-rendering
      gsap.killTweensOf(".node-group");
      
      const tl = gsap.timeline();
      
      // 1. Initial sharp but elegant pop-in
      tl.fromTo(".node-group",
        { scale: 0, opacity: 0, transformOrigin: "center" },
        { scale: 1, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" }
      );

      // 2. Continuous, soothing floating motion
      tl.to(".node-group", {
        y: "-=6",
        duration: 3.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        stagger: {
          each: 0.3,
          from: "random"
        }
      }, "<0.5"); // start shortly after pop-in
      
      // 3. Gentle pulse on the central contract node
      gsap.killTweensOf(".center-node");
      gsap.to(".center-node", {
        scale: 1.15,
        opacity: 0.8,
        duration: 2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        transformOrigin: "center"
      });
    }
  }, [payments]);

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
        let result;
        try {
          result = await kit.signTransaction(xdr, {
            networkPassphrase: "Test SDF Network ; September 2015",
          });
        } catch (e: any) {
          throw new Error(`[kit.signTransaction] ${e.message}`);
        }
        console.log("Tx signed!");
        signedXdr = result.signedTxXdr;
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

          <div style={{ margin: '20px 0', width: '65px', height: '65px' }}>
              <img src="/logo.svg" alt="LumenStream Logo" style={{ width: '100%', height: '100%' }} />
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
              <div 
                  className="central-data-image" 
                  style={{ overflow: 'hidden' }}
                  ref={svgContainerRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
              >
                  <svg width="100%" height="100%" viewBox="0 0 480 280" style={{position: 'absolute', zIndex: 1}}>
                      {payments.length > 0 && (
                          <>
                              {/* Payment Edges */}
                              {nodePositions.map((pos, i) => (
                                  <line id={`node-line-${i}`} key={`line-${i}`} x1="240" y1="140" x2={pos.x} y2={pos.y} stroke="var(--bg-color)" strokeWidth="2" strokeDasharray="4 4" opacity="0.9" />
                              ))}
                              
                              {/* Center Contract Node */}
                              <g className="center-node">
                                <rect x="195" y="110" width="90" height="60" fill="var(--primary-blue)" stroke="var(--bg-color)" strokeWidth="1" />
                                <rect x="200" y="115" width="80" height="50" fill="var(--bg-color)" />
                                <text x="240" y="145" fill="var(--text-blue)" fontSize="14" textAnchor="middle" letterSpacing="3" fontWeight="900">CORE</text>
                              </g>
                          </>
                      )}
                  </svg>
                  
                  {/* Draggable HTML Nodes */}
                  {nodePositions.map((pos, i) => {
                      const p = payments[i];
                      if (!p) return null;
                      return (
                          <div 
                              key={`node-${i}`}
                              className="node-group"
                              onPointerDown={(e) => handlePointerDown(i, e)}
                              style={{
                                  position: 'absolute',
                                  left: `${(pos.x / 480) * 100}%`,
                                  top: `${(pos.y / 280) * 100}%`,
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 10,
                                  cursor: 'grab',
                                  touchAction: 'none'
                              }}
                          >
                              <div 
                                id={`node-content-${i}`}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                  {/* Node Junction */}
                                  <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--bg-color)', marginBottom: '4px' }} />
                                  
                                  {/* Amount Data Box */}
                                  <div style={{
                                      backgroundColor: 'var(--bg-color)',
                                      color: 'var(--text-blue)',
                                      padding: '4px 10px',
                                      fontWeight: 900,
                                      fontSize: '12px',
                                      letterSpacing: '0.5px',
                                      userSelect: 'none',
                                      whiteSpace: 'nowrap'
                                  }}>
                                      {String(p.amount)} XLM
                                  </div>
                                  
                                  {/* Address Data Tag */}
                                  <div style={{
                                      border: '1px solid var(--bg-color)',
                                      color: 'var(--bg-color)',
                                      padding: '2px 8px',
                                      fontSize: '10px',
                                      fontFamily: 'monospace',
                                      fontWeight: 'bold',
                                      letterSpacing: '1px',
                                      userSelect: 'none',
                                      whiteSpace: 'nowrap'
                                  }}>
                                      {String(p.to).slice(0, 4)}..{String(p.to).slice(-4)}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
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
                  {[...payments].reverse().map((p, i) => (
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
