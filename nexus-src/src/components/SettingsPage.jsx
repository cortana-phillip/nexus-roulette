// -- Settings Page --
  function SettingsPage() {
    const [localBuyIn, setLocalBuyIn] = useState(settings.defaultBuyIn || 100);

    function saveBuyIn() {
      updSettings(s => { s.defaultBuyIn = localBuyIn; });
    }

    return (
      <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%"}}>
        <Card>
          <Lbl>Currency</Lbl>
          <button onClick={()=>setCurrencyOpen(true)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"14px",borderRadius:12,border:"1px solid #2d4057",background:"#0f1923",cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:22}}>{getCur(currency).flag}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>{getCur(currency).name}</div>
              <div style={{fontSize:11,color:"#475569"}}>{currency} · {cur.symbol}</div>
            </div>
            <span style={{color:"#64748b",fontSize:18}}>›</span>
          </button>
        </Card>

        <Card>
          <Lbl>Default Buy In</Lbl>
          <MoneyInput value={localBuyIn} onChange={setLocalBuyIn} currCode={currency}/>
          <button onClick={saveBuyIn} style={{width:"100%",marginTop:10,padding:"12px 0",borderRadius:10,border:"none",background:"#16a34a",color:"white",fontSize:14,fontWeight:700,cursor:"pointer"}}>Save Default</button>
        </Card>

        <Card>
          <Lbl>Roulette Type</Lbl>
          <div style={{display:"flex",gap:8}}>
            {[["american","🇺🇸 American (00)"],["european","🇪🇺 European"]].map(([v,label]) => (
              <button key={v} onClick={()=>updSess(s=>{s.roulette=v;s.droughts=initDroughts(v);})} style={{flex:1,padding:"10px 4px",borderRadius:9,border:"1px solid "+(sess.roulette===v?"#60a5fa":"#2d4057"),cursor:"pointer",fontSize:11,fontWeight:700,background:sess.roulette===v?"#0c1a2e":"#0f1923",color:sess.roulette===v?"#60a5fa":"#64748b"}}>{label}</button>
            ))}
          </div>
        </Card>

        <Card>
          <Lbl>Info</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>setChangelogOpen(true)} style={{width:"100%",padding:"12px 0",borderRadius:10,border:"1px solid #2d4057",background:"#0f1923",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>📋 Changelog</button>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:10,border:"1px solid #2d4057",background:"#0f1923"}}>
              <span style={{fontSize:13,color:"#94a3b8"}}>📳 Vibration Feedback</span>
              <button onClick={()=>updApp(s=>{s.settings.vibration=!s.settings.vibration;})} style={{padding:"6px 16px",borderRadius:8,border:"none",background:settings.vibration!==false?"#16a34a":"#374151",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>{settings.vibration!==false?"ON":"OFF"}</button>
            </div>
          </div>
        </Card>
        <Card>
          <Lbl>Table Limits</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[
              {label:"Min Bet", key:"tableMinBet", color:"#4ade80"},
              {label:"Max Bet (per position)", key:"tableMaxBet", color:"#fbbf24"},
              {label:"Max Total (per spin)", key:"tableMaxTotal", color:"#f87171"},
            ].map(({label,key,color})=>{
              const val=settings[key]||1;
              function dec(){
                if(key==="tableMinBet"){
                  if(val>10)return updApp(s=>{s.settings[key]=val<=100?val-5:val<=1000?val-25:val-1000;});
                  if(val>1)return updApp(s=>{s.settings[key]=val-1;});
                  if(val>0.5)return updApp(s=>{s.settings[key]=0.5;});
                  if(val>0.25)return updApp(s=>{s.settings[key]=0.25;});
                } else {
                  updApp(s=>{s.settings[key]=Math.max(1,val<=10?val-1:val<=100?val-5:val<=1000?val-25:val-1000);});
                }
              }
              function inc(){
                if(key==="tableMinBet"&&val<1)return updApp(s=>{s.settings[key]=val===0.25?0.5:1;});
                updApp(s=>{s.settings[key]=val<10?val+1:val<100?val+5:val<1000?val+25:val+1000;});
              }
              const displayVal=val<1?`${cur.symbol}${val.toFixed(2)}`:val<10?`${cur.symbol}${val}`:val>=1000?`${cur.symbol}${(val/1000).toFixed(val%1000===0?0:1)}K`:`${cur.symbol}${val}`;
              return(
                <div key={key}>
                  <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{label}</div>
                  <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:10,border:"1px solid #2d4057",overflow:"hidden"}}>
                    <button onClick={dec} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#60a5fa",fontSize:18,fontWeight:700,cursor:"pointer"}}>-</button>
                    <div style={{flex:1,textAlign:"center",fontSize:16,fontWeight:800,color}}>{displayVal}</div>
                    <button onClick={inc} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#60a5fa",fontSize:18,fontWeight:700,cursor:"pointer"}}>+</button>
                  </div>
                </div>
              );
            })}
            <div>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Quick Presets</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {TABLE_LIMIT_PRESETS.map((p,i)=>(
                  <button key={i} onClick={()=>updApp(s=>{s.settings.tableMinBet=p.minBet;s.settings.tableMaxBet=p.maxBet;s.settings.tableMaxTotal=p.maxTotal;})} style={{padding:"8px 12px",borderRadius:9,border:"1px solid #2d4057",background:"#0f1923",color:"#94a3b8",fontSize:11,cursor:"pointer",textAlign:"left"}}>{p.label} · max/spin ${p.maxTotal.toLocaleString()}</button>
                ))}
              </div>
            </div>
            <div style={{fontSize:10,color:"#374151",marginTop:2}}>
              Unit bets of $0.25 or $0.50 are only available when your table minimum allows it.
            </div>
          </div>
        </Card>

        <Card>
          <Lbl>Google Drive Backup</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{padding:"10px 12px",borderRadius:10,border:"1px solid "+(getDriveToken()?"#4ade80":"#2d4057"),background:getDriveToken()?"#0a1f0a":"#0f1923"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:getDriveToken()?"#4ade80":"#94a3b8"}}>
                    {driveSyncStatus==="restoring"?"☁️ Restoring...":getDriveToken()?"☁️ Connected":"☁️ Not Connected"}
                  </div>
                  <div style={{fontSize:10,color:"#64748b",marginTop:2}}>
                    {getDriveToken()?"Auto-saves on every session save/end":"Sign in to enable cloud backup"}
                  </div>
                </div>
                <button onClick={async()=>{
                  if(getDriveToken()){
                    driveSignOut();
                    setDriveSyncStatus("disconnected");
                  } else {
                    try{
                      await driveSignIn();
                      setDriveSyncStatus("connected");
                      // Auto-restore if local data looks empty/fresh
                      const localSaved = appState.savedSessions || [];
                      if(localSaved.length === 0) {
                        setDriveSyncStatus("restoring");
                        const data = await driveRestore();
                        if(data && data.savedSessions && data.savedSessions.length > 0) {
                          setAppState(data);
                          saveApp(data);
                          alert("Data restored from Google Drive!");
                        }
                        setDriveSyncStatus("connected");
                      }
                    }catch(e){alert("Sign in failed: "+e.message);}
                  }
                }} style={{padding:"7px 14px",borderRadius:8,border:"none",background:getDriveToken()?"#374151":"#16a34a",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  {getDriveToken()?"Disconnect":"Connect"}
                </button>
              </div>
              {getDriveToken() && (
                <button onClick={async()=>{
                  setDriveSyncStatus("syncing");
                  const ok = await driveSave(appState);
                  setDriveSyncStatus(ok?"connected":"error");
                  alert(ok?"Backup saved to Google Drive!":"Drive save failed — check connection.");
                }} style={{width:"100%",marginTop:8,padding:"8px 0",borderRadius:8,border:"1px solid #22c55e",background:"transparent",color:"#4ade80",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  ☁️ Backup Now
                </button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <Lbl>Info</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>{if(window.confirm("Restart onboarding? Your current bankroll will be your new starting point."))updApp(s=>{const curBankroll=s.currentSession.bankrollCurrent;s.settings.onboarded=false;s.settings._restartBankroll=curBankroll;});}} style={{width:"100%",padding:"12px 0",borderRadius:10,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:13,cursor:"pointer"}}>Restart Onboarding</button>
            <button onClick={importJSON} style={{width:"100%",padding:"12px 0",borderRadius:10,border:"1px solid #2d4057",background:"#0f1923",color:"#60a5fa",fontSize:13,fontWeight:700,cursor:"pointer"}}>📥 Import Session Data</button>
            <button onClick={()=>setHardResetOpen(true)} style={{width:"100%",padding:"14px 0",borderRadius:10,border:"2px solid #991b1b",background:"#200505",color:"#f87171",fontSize:14,fontWeight:900,cursor:"pointer",letterSpacing:0.5}}>⚠️ Hard Reset -- Wipe All Data</button>
          </div>
        </Card>
      </div>
    );
  }

  // -- Bankroll Edit --
  function BankrollEdit({onClose}) {
    const [val, setVal] = useState(sess.bankrollCurrent);
    function save() { updSess(s=>{s.bankrollCurrent=val;}); onClose(); }
    return (
      <Modal onClose={onClose}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:17,fontWeight:800,color:"#e2e8f0"}}>Edit Bankroll</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#64748b",fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        <MoneyInput value={val} onChange={setVal} currCode={currency} label="Current Bankroll"/>
        <button onClick={save} style={{width:"100%",marginTop:16,padding:"14px 0",borderRadius:12,border:"none",background:"#16a34a",color:"white",fontSize:15,fontWeight:800,cursor:"pointer"}}>Save</button>
      </Modal>
    );
  }

