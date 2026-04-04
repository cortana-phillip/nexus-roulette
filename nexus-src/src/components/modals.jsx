// -- Modal Dialogs --
function CashOutModal({maxAmount, currency, currentBankroll, onCashOut, onClose}) {
  const [amount, setAmount] = useState(Math.min(100, maxAmount));
  const cur = getCur(currency);

  function handleCashOut() {
    if(amount > 0 && amount <= maxAmount) { onCashOut(amount); onClose(); }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:17,fontWeight:800,color:"#e2e8f0"}}>💸 Cash Out</div>
          <div style={{fontSize:11,color:"#64748b"}}>Available: {fmtMoney(currentBankroll,currency)}</div>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:"#64748b",fontSize:22,cursor:"pointer"}}>×</button>
      </div>

      <MoneyInput value={amount} onChange={v=>setAmount(Math.min(v,maxAmount))} currCode={currency} label="Cash Out Amount"/>

      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
        {[25,50,100,200,500].filter(v=>v<=maxAmount).map(v => (
          <button key={v} onClick={()=>setAmount(v)} style={{flex:"1 0 28%",padding:"10px 0",borderRadius:10,border:"1px solid "+(amount===v?"#f97316":"#2d4057"),background:amount===v?"#1c0a00":"#0f1923",color:amount===v?"#f97316":"#64748b",fontSize:13,fontWeight:700,cursor:"pointer"}}>{cur.symbol}{v}</button>
        ))}
        <button onClick={()=>setAmount(maxAmount)} style={{flex:"1 0 28%",padding:"10px 0",borderRadius:10,border:"1px solid "+(amount===maxAmount?"#f97316":"#2d4057"),background:amount===maxAmount?"#1c0a00":"#0f1923",color:amount===maxAmount?"#f97316":"#64748b",fontSize:13,fontWeight:700,cursor:"pointer"}}>All</button>
      </div>

      <div style={{marginTop:16,background:"#0f1923",borderRadius:10,padding:"10px 14px",border:"1px solid #2d4057",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
          <span style={{color:"#64748b"}}>Remaining after cash out:</span>
          <span style={{color:"#f97316",fontWeight:700}}>{fmtMoney(currentBankroll-amount,currency)}</span>
        </div>
      </div>

      <button onClick={handleCashOut} style={{width:"100%",padding:"15px 0",borderRadius:12,border:"none",background:"#c2410c",color:"white",fontSize:16,fontWeight:800,cursor:"pointer"}}>
        Cash Out {fmtMoney(amount,currency)}
      </button>
    </Modal>
  );
}

// -- Onboarding --
function OnboardingScreen({onComplete, initialBankroll}) {
  const [step, setStep] = useState(0);
  const [roulette, setRoulette] = useState("american");
  const [bankroll, setBankroll] = useState(initialBankroll || 500);
  const [buyIn, setBuyIn] = useState(100);
  const [currency, setCurrency] = useState("USD");
  const [tableMinBet, setTableMinBet] = useState(10);
  const [tableMaxBet, setTableMaxBet] = useState(500);
  const [tableMaxTotal, setTableMaxTotal] = useState(5000);

  const steps = ["Welcome","Bankroll","Buy In","Table Limits","Currency"];

  function finish() {
    onComplete({ roulette, bankroll, defaultBuyIn:buyIn, currency, tableMinBet, tableMaxBet, tableMaxTotal });
  }

  return (
    <div style={{minHeight:"100vh",background:"#0f1923",color:"#e2e8f0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 16px",fontFamily:"system-ui,sans-serif"}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8,display:"flex",justifyContent:"center"}}><RouletteIcon size={72}/></div>
          <h1 style={{fontSize:22,fontWeight:900,color:"#86efac",margin:0,letterSpacing:1}}>Nexus Roulette Tracker</h1>
          <div style={{fontSize:12,color:"#475569",marginTop:4}}>Quick setup -- you can change everything later</div>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:28,justifyContent:"center"}}>
          {steps.map((s,i) => (
            <div key={i} style={{width:32,height:4,borderRadius:2,background:i<=step?"#86efac":"#1e2d3d"}}/>
          ))}
        </div>

        {step===0 && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{fontSize:17,fontWeight:700,color:"#e2e8f0",textAlign:"center"}}>Which table are you playing?</div>
            {[["american","🇺🇸 American","Has 0 and 00"],["european","🇪🇺 European","Has 0 only"]].map(([v,label,sub]) => (
              <button key={v} onClick={()=>setRoulette(v)} style={{padding:"16px",borderRadius:14,border:"2px solid "+(roulette===v?"#86efac":"#2d4057"),background:roulette===v?"#0d2a1a":"#1e2d3d",cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:15,fontWeight:700,color:roulette===v?"#86efac":"#e2e8f0"}}>{label}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{sub}</div>
              </button>
            ))}
          </div>
        )}

        {step===1 && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{fontSize:17,fontWeight:700,color:"#e2e8f0",textAlign:"center"}}>How much are you sitting down with?</div>
            <MoneyInput value={bankroll} onChange={setBankroll} currCode={currency} label="Starting Bankroll"/>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[100,200,500,1000,2000,5000].map(v => (
                <button key={v} onClick={()=>setBankroll(v)} style={{flex:"1 0 28%",padding:"10px 0",borderRadius:10,border:"1px solid "+(bankroll===v?"#86efac":"#2d4057"),background:bankroll===v?"#0d2a1a":"#0f1923",color:bankroll===v?"#86efac":"#64748b",fontSize:13,fontWeight:700,cursor:"pointer"}}>${v}</button>
              ))}
            </div>
          </div>
        )}

        {step===2 && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{fontSize:17,fontWeight:700,color:"#e2e8f0",textAlign:"center"}}>Default Buy In amount?</div>
            <div style={{fontSize:12,color:"#64748b",textAlign:"center"}}>This pre-fills the Buy In modal -- you can always adjust it on the fly down to the cent.</div>
            <MoneyInput value={buyIn} onChange={setBuyIn} currCode={currency} label="Default Buy In"/>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[50,100,200,500].map(v => (
                <button key={v} onClick={()=>setBuyIn(v)} style={{flex:"1 0 21%",padding:"10px 0",borderRadius:10,border:"1px solid "+(buyIn===v?"#60a5fa":"#2d4057"),background:buyIn===v?"#0c1a2e":"#0f1923",color:buyIn===v?"#60a5fa":"#64748b",fontSize:13,fontWeight:700,cursor:"pointer"}}>${v}</button>
              ))}
            </div>
          </div>
        )}

        {step===3 && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:17,fontWeight:700,color:"#e2e8f0",textAlign:"center"}}>Table Limits</div>
            <div style={{fontSize:12,color:"#64748b",textAlign:"center"}}>Set your table's actual limits. This controls which unit bet sizes are valid and warns when a progression would exceed the max.</div>
            {[
              {label:"Min Bet",              key:"minBet",   val:tableMinBet, set:setTableMinBet, color:"#4ade80"},
              {label:"Max Bet (per position)",key:"maxBet",  val:tableMaxBet, set:setTableMaxBet, color:"#fbbf24"},
              {label:"Max Total (per spin)",  key:"maxTotal",val:tableMaxTotal,set:setTableMaxTotal,color:"#f87171"},
            ].map(({label,key,val,set,color})=>{
              function dec(){
                if(key==="minBet"){
                  if(val>10) return set(val<=100?val-5:val<=1000?val-25:val-1000);
                  if(val>1)  return set(val-1);
                  if(val>0.5)return set(0.5);
                  if(val>0.25)return set(0.25);
                } else { set(Math.max(1,val<=10?val-1:val<=100?val-5:val<=1000?val-25:val-1000)); }
              }
              function inc(){
                if(key==="minBet"&&val<1) return set(val===0.25?0.5:1);
                set(val<10?val+1:val<100?val+5:val<1000?val+25:val+1000);
              }
              const disp=val<1?`$${val.toFixed(2)}`:val>=1000?`$${(val/1000).toFixed(val%1000===0?0:1)}K`:`$${val}`;
              return(
                <div key={key}>
                  <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{label}</div>
                  <div style={{display:"flex",alignItems:"center",background:"#1e2d3d",borderRadius:12,border:"1px solid #2d4057",overflow:"hidden"}}>
                    <button onClick={dec} style={{padding:"10px 16px",background:"transparent",border:"none",color:"#60a5fa",fontSize:20,fontWeight:700,cursor:"pointer"}}>-</button>
                    <div style={{flex:1,textAlign:"center",fontSize:18,fontWeight:800,color}}>{disp}</div>
                    <button onClick={inc} style={{padding:"10px 16px",background:"transparent",border:"none",color:"#60a5fa",fontSize:20,fontWeight:700,cursor:"pointer"}}>+</button>
                  </div>
                </div>
              );
            })}
            <div>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Quick Presets</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {TABLE_LIMIT_PRESETS.map((p,i)=>(
                  <button key={i} onClick={()=>{setTableMinBet(p.minBet);setTableMaxBet(p.maxBet);setTableMaxTotal(p.maxTotal);}} style={{padding:"9px 12px",borderRadius:10,border:"1px solid #2d4057",background:"#1e2d3d",color:"#94a3b8",fontSize:11,cursor:"pointer",textAlign:"left"}}>{p.label} · max/spin ${p.maxTotal.toLocaleString()}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step===4 && (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:17,fontWeight:700,color:"#e2e8f0",textAlign:"center"}}>Currency</div>
            <div style={{maxHeight:"40vh",overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
              {Object.entries(CURRENCIES).map(([code,cur]) => (
                <button key={code} onClick={()=>setCurrency(code)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,border:"2px solid "+(currency===code?"#86efac":"#2d4057"),background:currency===code?"#0d2a1a":"#1e2d3d",cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:20}}>{cur.flag}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:currency===code?"#86efac":"#e2e8f0"}}>{cur.name}</div>
                    <div style={{fontSize:11,color:"#475569"}}>{code} · {cur.symbol}</div>
                  </div>
                  {currency===code && <span style={{color:"#86efac",fontSize:16}}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:10,marginTop:24}}>
          {step>0 && (
            <button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"13px 0",borderRadius:12,border:"1px solid #2d4057",background:"#1e2d3d",color:"#94a3b8",fontSize:15,fontWeight:700,cursor:"pointer"}}>Back</button>
          )}
          <button onClick={()=>step<steps.length-1?setStep(s=>s+1):finish()} style={{flex:2,padding:"13px 0",borderRadius:12,border:"none",background:"#16a34a",color:"white",fontSize:15,fontWeight:800,cursor:"pointer"}}>
            {step===steps.length-1 ? "Let's Play! 🎰" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Buy In Modal --
function BuyInModal({defaultAmount, currency, currentBankroll, onBuyIn, onClose}) {
  const [amount, setAmount] = useState(defaultAmount || 100);

  function handleBuyIn() {
    if(amount > 0) { onBuyIn(amount); onClose(); }
  }

  const cur = getCur(currency);

  return (
    <Modal onClose={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:17,fontWeight:800,color:"#e2e8f0"}}>💰 Buy In</div>
          <div style={{fontSize:11,color:"#64748b"}}>Current: {fmtMoney(currentBankroll,currency)}</div>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:"#64748b",fontSize:22,cursor:"pointer"}}>×</button>
      </div>

      <MoneyInput value={amount} onChange={setAmount} currCode={currency} label="Amount"/>

      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
        {[25,50,100,200,500,1000].map(v => (
          <button key={v} onClick={()=>setAmount(v)} style={{flex:"1 0 28%",padding:"10px 0",borderRadius:10,border:"1px solid "+(amount===v?"#60a5fa":"#2d4057"),background:amount===v?"#0c1a2e":"#0f1923",color:amount===v?"#60a5fa":"#64748b",fontSize:13,fontWeight:700,cursor:"pointer"}}>{cur.symbol}{v}</button>
        ))}
      </div>

      <div style={{marginTop:16,background:"#0f1923",borderRadius:10,padding:"10px 14px",border:"1px solid #2d4057",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
          <span style={{color:"#64748b"}}>After buy in:</span>
          <span style={{color:"#86efac",fontWeight:700}}>{fmtMoney(currentBankroll+amount,currency)}</span>
        </div>
      </div>

      <button onClick={handleBuyIn} style={{width:"100%",padding:"15px 0",borderRadius:12,border:"none",background:"#16a34a",color:"white",fontSize:16,fontWeight:800,cursor:"pointer"}}>
        Buy In {fmtMoney(amount,currency)}
      </button>
    </Modal>
  );
}

// -- Currency Change Modal --
function CurrencyModal({current, bankroll, onSave, onClose}) {
  const [selected, setSelected] = useState(current);
  const [mode, setMode] = useState("keep"); // "convert" or "keep"

  function handleSave() {
    onSave(selected, mode);
    onClose();
  }

  const newBankroll = mode==="convert" ? convertAmount(bankroll, current, selected) : bankroll;
  const curSym = getCur(selected).symbol;

  return (
    <Modal onClose={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:17,fontWeight:800,color:"#e2e8f0"}}>Change Currency</div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:"#64748b",fontSize:22,cursor:"pointer"}}>×</button>
      </div>

      <div style={{maxHeight:"35vh",overflowY:"auto",display:"flex",flexDirection:"column",gap:5,marginBottom:16}}>
        {Object.entries(CURRENCIES).map(([code,cur]) => (
          <button key={code} onClick={()=>setSelected(code)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"2px solid "+(selected===code?"#86efac":"#2d4057"),background:selected===code?"#0d2a1a":"#1e2d3d",cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:18}}>{cur.flag}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:selected===code?"#86efac":"#e2e8f0"}}>{cur.name}</div>
              <div style={{fontSize:10,color:"#475569"}}>{code} · {cur.symbol}</div>
            </div>
            {selected===code && <span style={{color:"#86efac"}}>✓</span>}
          </button>
        ))}
      </div>

      {selected !== current && (
        <div style={{marginBottom:14}}>
          <Lbl>Conversion Mode</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>setMode("keep")} style={{padding:"12px",borderRadius:10,border:"2px solid "+(mode==="keep"?"#60a5fa":"#2d4057"),background:mode==="keep"?"#0c1a2e":"#1e2d3d",cursor:"pointer",textAlign:"left"}}>
              <div style={{fontSize:13,fontWeight:700,color:mode==="keep"?"#60a5fa":"#e2e8f0"}}>Keep same numbers</div>
              <div style={{fontSize:11,color:"#475569"}}>{fmtMoney(bankroll,current)} → {curSym}{bankroll.toFixed(getCur(selected).dec)} (just change symbol)</div>
            </button>
            <button onClick={()=>setMode("convert")} style={{padding:"12px",borderRadius:10,border:"2px solid "+(mode==="convert"?"#fbbf24":"#2d4057"),background:mode==="convert"?"#1c1500":"#1e2d3d",cursor:"pointer",textAlign:"left"}}>
              <div style={{fontSize:13,fontWeight:700,color:mode==="convert"?"#fbbf24":"#e2e8f0"}}>True conversion</div>
              <div style={{fontSize:11,color:"#475569"}}>{fmtMoney(bankroll,current)} → {fmtMoney(newBankroll,selected)} (exchange rate applied)</div>
            </button>
          </div>
        </div>
      )}

      <button onClick={handleSave} style={{width:"100%",padding:"14px 0",borderRadius:12,border:"none",background:"#16a34a",color:"white",fontSize:15,fontWeight:800,cursor:"pointer"}}>Apply</button>
    </Modal>
  );
}

// -- Changelog Modal --
function ChangelogModal({onClose}) {
  return (
    <Modal onClose={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:17,fontWeight:800,color:"#e2e8f0"}}>📋 Changelog</div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:"#64748b",fontSize:22,cursor:"pointer"}}>×</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {CHANGELOG.map(entry => (
          <div key={entry.v}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:6}}>
              <span style={{fontSize:13,fontWeight:900,color:"#86efac"}}>v{entry.v}</span>
              <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{entry.title}</span>
              <span style={{fontSize:10,color:"#475569"}}>{entry.date}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {entry.changes.map((c,i) => (
                <div key={i} style={{display:"flex",gap:8,fontSize:11,color:"#94a3b8"}}>
                  <span style={{color:"#4ade80",flexShrink:0}}>·</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function HardResetModal({onClose, onExport}) {
  const [step, setStep] = useState(0); // 0=warn, 1=confirm

  function doExportFirst() {
    onExport();
    setStep(1);
  }

  function doReset() {
    localStorage.removeItem("nexus-roulette-v1");
    window.location.reload();
  }

  return (
    <Modal onClose={onClose}>
      {step === 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:8}}>⚠️</div>
            <div style={{fontSize:18,fontWeight:900,color:"#f87171",marginBottom:6}}>Hard Reset</div>
            <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.5}}>
              This will permanently delete <strong style={{color:"#e2e8f0"}}>all sessions, tracks, spins, and settings</strong>. The app will return to factory defaults.
            </div>
          </div>
          <div style={{background:"#200505",borderRadius:10,padding:"12px 14px",border:"1px solid #7f1d1d"}}>
            <div style={{fontSize:11,color:"#fca5a5",lineHeight:1.5}}>
              💡 Export your data first if you want to keep a backup. You can re-import it after the reset.
            </div>
          </div>
          <button onClick={doExportFirst} style={{width:"100%",padding:"13px 0",borderRadius:12,border:"none",background:"#1e3a5f",color:"#60a5fa",fontSize:14,fontWeight:800,cursor:"pointer"}}>
            📤 Export Data First, Then Reset
          </button>
          <button onClick={()=>setStep(1)} style={{width:"100%",padding:"13px 0",borderRadius:12,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Skip Export → Proceed to Reset
          </button>
          <button onClick={onClose} style={{width:"100%",padding:"11px 0",borderRadius:12,border:"1px solid #2d4057",background:"transparent",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>
            Cancel
          </button>
        </div>
      )}
      {step === 1 && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:8}}>🗑️</div>
            <div style={{fontSize:17,fontWeight:900,color:"#f87171",marginBottom:6}}>Are you sure?</div>
            <div style={{fontSize:13,color:"#94a3b8"}}>
              This is your last chance. All data will be <strong style={{color:"#f87171"}}>permanently deleted</strong>.
            </div>
          </div>
          <button onClick={doReset} style={{width:"100%",padding:"15px 0",borderRadius:12,border:"none",background:"#991b1b",color:"white",fontSize:16,fontWeight:900,cursor:"pointer",letterSpacing:1}}>
            YES -- DELETE EVERYTHING
          </button>
          <button onClick={onClose} style={{width:"100%",padding:"11px 0",borderRadius:12,border:"1px solid #2d4057",background:"transparent",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>
            Cancel
          </button>
        </div>
      )}
    </Modal>
  );
}
