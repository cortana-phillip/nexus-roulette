// -- Track Config Panels (Edit + Add) --
function EditTrackCfg({track, currency, tableMinBet, onSave, onCancel}) {
  const cur = getCur(currency||"USD");
  const tMin = tableMinBet||1;
  const [cfg, setCfg] = useState({...track.config});
  function upCfg(k,v){setCfg(c=>({...c,[k]:v}));}
  function toggleArr(key,val,max){
    const arr=cfg[key]||[];
    if(arr.includes(val)){upCfg(key,arr.filter(x=>x!==val));}
    else if(arr.length<max) upCfg(key,[...arr,val].sort());
  }
  return(
    <div style={{marginTop:4,padding:12,background:"#1e2d3d",borderRadius:10,border:"1px solid #60a5fa",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:11,fontWeight:700,color:"#60a5fa"}}>✏️ Edit Config</div>
      <div style={{display:"flex",gap:8}}>
        {UNITS.map(u=>{
          const sel=cfg.unit===u;
          const numTargets=((cfg.evenTargets||[]).length||((cfg.dozenTargets||[]).length+(cfg.colTargets||[]).length))||1;
          const invalid=u*numTargets<tMin;
          return <button key={u} onClick={()=>!invalid&&upCfg("unit",u)} style={{flex:1,padding:"7px 0",borderRadius:9,border:"2px solid "+(sel?"#86efac":invalid?"#1e2d3d":"#2d4057"),background:sel?"#134e2a":"#0f1923",color:sel?"#86efac":invalid?"#374151":"#64748b",fontSize:12,fontWeight:700,cursor:invalid?"not-allowed":"pointer",opacity:invalid?0.4:1}} title={invalid?`Below table min`:undefined}>{cur.symbol}{u.toFixed(2)}{invalid?<span style={{fontSize:7,color:"#f87171",marginLeft:2}}>✗</span>:null}</button>;
        })}
      </div>
      <ROIStepper value={cfg.roi} onChange={v=>upCfg("roi",v)}/>
      <div>
        <Lbl>Stop Loss</Lbl>
        <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:10,border:"1px solid #2d4057",overflow:"hidden"}}>
          <button onClick={()=>upCfg("stopLoss",Math.max(25,cfg.stopLoss-25))} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#60a5fa",fontSize:18,fontWeight:700,cursor:"pointer"}}>-</button>
          <div style={{flex:1,textAlign:"center",fontSize:16,fontWeight:900,color:"#f87171"}}>{cur.symbol}{cfg.stopLoss}</div>
          <button onClick={()=>upCfg("stopLoss",cfg.stopLoss+25)} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#60a5fa",fontSize:18,fontWeight:700,cursor:"pointer"}}>+</button>
        </div>
      </div>
      {track.type==="fibonacci" && (
        <>
          <div>
            <Lbl>Dozens</Lbl>
            <div style={{display:"flex",gap:6}}>
              {[0,1,2].map(i=>{const sel=(cfg.dozenTargets||[]).includes(i);return<button key={i} onClick={()=>toggleArr("dozenTargets",i,2)} style={{flex:1,padding:"7px 0",borderRadius:8,border:"2px solid "+(sel?DZ_BD[i]:"#2d4057"),background:sel?"#0f1923":"transparent",color:sel?DZ_TX[i]:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{DZ_LABELS[i]}</button>;})}
            </div>
          </div>
          <div>
            <Lbl>Columns</Lbl>
            <div style={{display:"flex",gap:6}}>
              {[0,1,2].map(i=>{const sel=(cfg.colTargets||[]).includes(i);return<button key={i} onClick={()=>toggleArr("colTargets",i,2)} style={{flex:1,padding:"7px 0",borderRadius:8,border:"2px solid "+(sel?COL_BD[i]:"#2d4057"),background:sel?"#0f1923":"transparent",color:sel?COL_TX[i]:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{COL_LABELS[i]}</button>;})}
            </div>
          </div>
        </>
      )}
      <ParkPlayRulesEditor cfg={cfg} upCfg={upCfg} type={track.type}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>onSave(cfg)} style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",background:"#16a34a",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
        <button onClick={onCancel} style={{flex:1,padding:"10px 0",borderRadius:10,border:"1px solid #2d4057",background:"transparent",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>Cancel</button>
      </div>
    </div>
  );
}

function AddTrackPanel({onAdd, onClose, nextColor, type, cfg, onTypeChange, onCfgChange, closedTracks, currency, tableMinBet}) {
  const cur = getCur(currency||"USD");
  const tMin = tableMinBet||1;
  function upCfg(k,v) { onCfgChange(c=>({...c,[k]:v})); }
  function toggleArr(key,val,max) {
    const arr=cfg[key]||[];
    if(arr.includes(val)) { upCfg(key,arr.filter(x=>x!==val)); }
    else if(arr.length<max) upCfg(key,[...arr,val].sort());
  }
  function resumeFromClosed(t) {
    onTypeChange(t.type);
    onCfgChange({...t.config, activeBets:[]});
  }

  return (
    <div style={{background:"#1e2d3d",borderRadius:16,padding:16,border:"1px solid #2d4057",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>Add Strategy Track</span>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:"#64748b",fontSize:18,cursor:"pointer"}}>×</button>
      </div>
      {closedTracks&&closedTracks.length>0 && (
        <div>
          <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Resume Closed Track</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {closedTracks.slice(-5).reverse().map(t=>{
              const label=t.type==="fibonacci"
                ?((t.config.dozenTargets||[]).map(d=>DZ_LABELS[d]).join("+")+(t.config.colTargets&&t.config.colTargets.length>0?" + "+(t.config.colTargets.map(c=>COL_LABELS[c]).join("+")):"")+" · "+t.config.roi+"% ROI")
                :"Solution · "+t.config.roi+"% ROI";
              return(
                <button key={t.id} onClick={()=>resumeFromClosed(t)} style={{padding:"8px 12px",borderRadius:9,border:"1px solid "+t.color,background:"#0f1923",color:t.color,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"left"}}>
                  {TRACK_ICONS[t.type]} {label} · {cur&&cur.symbol}{(t.config.unit||1).toFixed(2)}/chip
                </button>
              );
            })}
          </div>
          <div style={{borderTop:"1px solid #2d4057",marginTop:10,paddingTop:10}}>
            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Or create new</div>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:8}}>
        {[["flat","➡️ Flat"],["fibonacci","📈 Progression Bet"],["solution","🎯 The Solution"]].map(([m,l]) => {
          const isSel = m==="solution" ? type==="solution" : type==="fibonacci" && ((m==="flat")===(( cfg.betMode||"progression")==="flat"));
          return <button key={m} onClick={()=>{
            if(m==="solution"){onTypeChange("solution");}
            else if(m==="flat"){onTypeChange("fibonacci");onCfgChange(c=>({...c,betMode:"flat"}));}
            else{onTypeChange("fibonacci");onCfgChange(c=>({...c,betMode:"progression"}));}
          }} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:isSel?"#134e2a":"#0f1923",color:isSel?"#86efac":"#64748b",outline:"2px solid "+(isSel?"#22c55e":"#2d4057")}}>{l}</button>;
        })}
      </div>
      <div style={{display:"flex",gap:8}}>
        {UNITS.map(u => {
          const sel=cfg.unit===u;
          const numTargets=((cfg.evenTargets||[]).length||((cfg.dozenTargets||[]).length+(cfg.colTargets||[]).length))||1;
          const invalid=u*numTargets<tMin;
          return <button key={u} onClick={()=>!invalid&&upCfg("unit",u)} style={{flex:1,padding:"9px 0",borderRadius:10,border:"2px solid "+(sel?"#86efac":invalid?"#1e2d3d":"#2d4057"),background:sel?"#134e2a":"#0f1923",color:sel?"#86efac":invalid?"#374151":"#64748b",fontSize:13,fontWeight:700,cursor:invalid?"not-allowed":"pointer",opacity:invalid?0.4:1}} title={invalid?"Below table min":undefined}>{cur.symbol}{u.toFixed(2)}{invalid?<span style={{fontSize:8,color:"#f87171",marginLeft:2}}>✗</span>:null}</button>;
        })}
      </div>
      <ROIStepper value={cfg.roi} onChange={v=>upCfg("roi",v)} disabled={type==="fibonacci"&&((cfg.betMode||"progression")==="flat"||(cfg.evenTargets||[]).length>0)}/>
      <div>
        <Lbl>Stop Loss ($)</Lbl>
        <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:12,border:"1px solid #2d4057",overflow:"hidden"}}>
          <button onClick={()=>upCfg("stopLoss",Math.max(25,cfg.stopLoss-25))} style={{padding:"9px 16px",background:"transparent",border:"none",color:"#60a5fa",fontSize:20,fontWeight:700,cursor:"pointer"}}>-</button>
          <div style={{flex:1,textAlign:"center",fontSize:18,fontWeight:900,color:"#f87171"}}>${cfg.stopLoss}</div>
          <button onClick={()=>upCfg("stopLoss",cfg.stopLoss+25)} style={{padding:"9px 16px",background:"transparent",border:"none",color:"#60a5fa",fontSize:20,fontWeight:700,cursor:"pointer"}}>+</button>
        </div>
      </div>
      {type==="fibonacci" && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {(cfg.parkRules && (cfg.parkRules.followTheLeader || cfg.parkRules.droughtThreshold)) ? (
            <div>
              <Lbl>Outside Bet Type <span style={{color:"#a78bfa",fontStyle:"normal"}}>(auto-picks best)</span></Lbl>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                {(cfg.parkRules.followTheLeader
                  ? [["dozens","📊 Dozens"],["columns","📊 Columns"],["even","🎯 Even Money"]]
                  : [["dozens","📊 Set of 12"],["even","🎯 Even Money"]]
                ).map(([t,l])=>{
                  const sel=cfg.ftlTargetType===t||(t==="dozens"&&(cfg.ftlTargetType==="columns"));
                  return <button key={t} onClick={()=>upCfg("ftlTargetType",t)} style={{flex:1,padding:"8px 0",borderRadius:9,border:"2px solid "+(sel?"#a78bfa":"#2d4057"),background:sel?"#1a0a2e":"#0f1923",color:sel?"#c4b5fd":"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>;
                })}
              </div>
              {cfg.parkRules.followTheLeader && (cfg.ftlTargetType==="dozens"||cfg.ftlTargetType==="columns") && (
                <div style={{display:"flex",gap:6}}>
                  {[1,2].map(n=>{const sel=(cfg.ftlCount||1)===n;return <button key={n} onClick={()=>upCfg("ftlCount",n)} style={{flex:1,padding:"7px 0",borderRadius:8,border:"2px solid "+(sel?"#a78bfa":"#2d4057"),background:sel?"#1a0a2e":"#0f1923",color:sel?"#c4b5fd":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer"}}>{n} at a time</button>;})}
                </div>
              )}
              {!cfg.ftlTargetType && <div style={{color:"#f87171",fontSize:11}}>⚠ Select a bet type to continue.</div>}
            </div>
          ) : (
            <>
              <div>
                <Lbl>Even Money {(cfg.evenTargets||[]).length>0&&(cfg.betMode||"progression")!=="flat"?"(martingale -- ROI auto)":""}</Lbl>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                  {[
                    {key:"red",label:"Red",color:"#ef4444",pair:"black"},
                    {key:"black",label:"Black",color:"#94a3b8",pair:"red"},
                    {key:"odd",label:"Odd",color:"#a78bfa",pair:"even"},
                    {key:"even",label:"Even",color:"#60a5fa",pair:"odd"},
                    {key:"high",label:"High",color:"#fbbf24",pair:"low"},
                    {key:"low",label:"Low",color:"#86efac",pair:"high"},
                  ].map(em=>{
                    const evts=cfg.evenTargets||[];
                    const sel=evts.includes(em.key);
                    const isFlat=(cfg.betMode||"progression")==="flat";
                    const maxAllowed=isFlat?3:2;
                    const pairSel=evts.includes(em.pair);
                    const canAdd=!pairSel&&evts.length<maxAllowed;
                    return <button key={em.key} onClick={()=>{
                      if(sel){upCfg("evenTargets",evts.filter(x=>x!==em.key));}
                      else if(canAdd){upCfg("evenTargets",[...evts,em.key]);upCfg("dozenTargets",[]);upCfg("colTargets",[]);}
                    }} style={{padding:"8px 4px",borderRadius:8,border:"2px solid "+(sel?em.color:pairSel?"#1e2d3d":"#2d4057"),background:sel?"#0f1923":"transparent",color:sel?em.color:pairSel?"#1e3a1e":"#64748b",fontSize:12,fontWeight:700,cursor:pairSel&&!sel?"not-allowed":"pointer",opacity:pairSel&&!sel?0.3:1}}>{em.label}</button>;
                  })}
                </div>
                {(cfg.evenTargets||[]).length>0&&(cfg.betMode||"progression")==="flat"&&<div style={{fontSize:10,color:"#60a5fa",marginTop:3}}>Flat: up to 3 even money bets simultaneously.</div>}
                {(cfg.evenTargets||[]).length>0&&(cfg.betMode||"progression")!=="flat"&&<div style={{fontSize:10,color:"#fbbf24",marginTop:3}}>⚡ Martingale doubling. Max 2 bets.</div>}
              </div>
              {(cfg.evenTargets||[]).length===0 && (
                <>
                  <div>
                    <Lbl>Dozens</Lbl>
                    <div style={{display:"flex",gap:8}}>
                      {[0,1,2].map(i=>{const sel=(cfg.dozenTargets||[]).includes(i);return <button key={i} onClick={()=>{toggleArr("dozenTargets",i,2);upCfg("evenTargets",[]);}} style={{flex:1,padding:"8px 0",borderRadius:9,border:"2px solid "+(sel?DZ_BD[i]:"#2d4057"),background:sel?"#0f1923":"transparent",color:sel?DZ_TX[i]:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{DZ_LABELS[i]}</button>;})}
                    </div>
                  </div>
                  <div>
                    <Lbl>Columns</Lbl>
                    <div style={{display:"flex",gap:8}}>
                      {[0,1,2].map(i=>{const sel=(cfg.colTargets||[]).includes(i);return <button key={i} onClick={()=>{toggleArr("colTargets",i,2);upCfg("evenTargets",[]);}} style={{flex:1,padding:"8px 0",borderRadius:9,border:"2px solid "+(sel?COL_BD[i]:"#2d4057"),background:sel?"#0f1923":"transparent",color:sel?COL_TX[i]:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{COL_LABELS[i]}</button>;})}
                    </div>
                    {(cfg.dozenTargets||[]).length===0&&(cfg.colTargets||[]).length===0&&(cfg.evenTargets||[]).length===0&&(
                      <div style={{color:"#f87171",fontSize:11,marginTop:4}}>Select at least one target.</div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
      {type==="solution" && (
        <div>
          <Lbl>Entry Threshold (misses)</Lbl>
          <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:10,border:"1px solid #2d4057",overflow:"hidden"}}>
            <button onClick={()=>upCfg("entryThreshold",Math.max(20,cfg.entryThreshold-5))} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#60a5fa",fontSize:18,fontWeight:700,cursor:"pointer"}}>-</button>
            <div style={{flex:1,textAlign:"center",fontSize:18,fontWeight:900,color:"#f59e0b"}}>{cfg.entryThreshold}</div>
            <button onClick={()=>upCfg("entryThreshold",cfg.entryThreshold+5)} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#60a5fa",fontSize:18,fontWeight:700,cursor:"pointer"}}>+</button>
          </div>
        </div>
      )}
      {type==="fibonacci" && (cfg.betMode||"progression")!=="flat" && (
        <div>
          <Lbl>Start at Level</Lbl>
          <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:10,border:"1px solid #2d4057",overflow:"hidden"}}>
            <button onClick={()=>upCfg("startLevel",Math.max(0,(cfg.startLevel||0)-1))} style={{padding:"8px 16px",background:"transparent",border:"none",color:"#60a5fa",fontSize:20,fontWeight:700,cursor:"pointer"}}>-</button>
            <div style={{flex:1,textAlign:"center",fontSize:16,fontWeight:800,color:(cfg.startLevel||0)>0?"#fbbf24":"#64748b"}}>
              {(cfg.startLevel||0)===0?"Start (Level 1)":`Level ${(cfg.startLevel||0)+1}`}
            </div>
            <button onClick={()=>upCfg("startLevel",(cfg.startLevel||0)+1)} style={{padding:"8px 16px",background:"transparent",border:"none",color:"#60a5fa",fontSize:20,fontWeight:700,cursor:"pointer"}}>+</button>
          </div>
          {(cfg.startLevel||0)>0 && <div style={{fontSize:10,color:"#fbbf24",marginTop:3}}>⚠ Starts mid-progression — bankroll will not reflect prior losses at this level.</div>}
        </div>
      )}
      <ParkPlayRulesEditor cfg={cfg} upCfg={upCfg} type={type}/>
      <button onClick={()=>{
        if(type==="fibonacci"&&!(cfg.parkRules&&(cfg.parkRules.followTheLeader||cfg.parkRules.droughtThreshold))&&(cfg.evenTargets||[]).length===0&&(cfg.dozenTargets||[]).length===0&&(cfg.colTargets||[]).length===0){alert("Select at least one target.");return;}
        onAdd(type,cfg);
      }} style={{padding:"13px 0",borderRadius:12,border:"none",background:"#16a34a",color:"white",fontSize:15,fontWeight:800,cursor:"pointer"}}>Add Track</button>
    </div>
  );
}

// -- Park/Play Rules Editor (shared between AddTrackPanel, EditTrackCfg, SimStratEditor) --
function ParkPlayRulesEditor({cfg, upCfg, type}) {
  const rules = cfg.parkRules || defaultParkRules();
  function upRule(k,v){ upCfg("parkRules",{...rules,[k]:v}); }

  // Determine preset type for drought thresholds
  const presetType = cfg.ftlTargetType==="even" ? "even" : "set12";
  const presets = DROUGHT_PRESETS[presetType];
  const isDynamic = rules.followTheLeader || !!rules.droughtThreshold;
  const [open, setOpen] = useState(false);

  const activeSummary = [
    rules.followTheLeader&&"FTL",
    rules.droughtThreshold&&`D≥${rules.droughtThreshold}`,
    rules.waitForWin&&"WaitWin",
    rules.parkAfterStopLoss&&"ParkSL",
    rules.parkAfterLoss&&"ParkL",
  ].filter(Boolean).join(" · ")||"none";

  return (
    <div style={{borderRadius:10,border:"1px solid "+(isDynamic||rules.waitForWin||rules.parkAfterStopLoss||rules.parkAfterLoss?"#a78bfa":"#2d4057"),overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",padding:"10px 14px",background:"#0f1923",border:"none",color:"#94a3b8",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>⚙️ Park / Play Rules</span>
        <span style={{fontSize:10,color:isDynamic||rules.waitForWin||rules.parkAfterStopLoss||rules.parkAfterLoss?"#a78bfa":"#475569"}}>
          {activeSummary} {open?"▲":"▼"}
        </span>
      </button>
      {open && (
        <div style={{padding:"12px 14px",background:"#0c1520",display:"flex",flexDirection:"column",gap:8}}>

          {type==="fibonacci" && (<>
            {/* Follow the Leader + Wait for Drought — mutually exclusive */}
            <div style={{display:"flex",gap:6}}>
              {[["followTheLeader","Follow the Leader","Auto-switch to highest-drought target"],
                ["droughtThreshold","Wait for Drought","Park until drought threshold met"]
               ].map(([key,label,desc])=>{
                const on = key==="droughtThreshold" ? !!rules.droughtThreshold : !!rules[key];
                return (
                  <button key={key} onClick={()=>{
                    if(on) {
                      // Turn off
                      if(key==="droughtThreshold") upRule("droughtThreshold", null);
                      else upRule(key, false);
                    } else {
                      // Turn on — turn the other one off, clear static targets
                      if(key==="droughtThreshold"){
                        upCfg("parkRules",{...rules, droughtThreshold:(presets?.yellow||4), followTheLeader:false});
                      } else {
                        upCfg("parkRules",{...rules, followTheLeader:true, droughtThreshold:null});
                      }
                      upCfg("dozenTargets",[]); upCfg("colTargets",[]); upCfg("evenTargets",[]);
                    }
                  }} style={{flex:1,padding:"8px 6px",borderRadius:8,border:"2px solid "+(on?"#a78bfa":"#2d4057"),background:on?"#1a0a2e":"#0f1923",cursor:"pointer",textAlign:"left"}}>
                    <div style={{fontSize:10,fontWeight:700,color:on?"#c4b5fd":"#64748b"}}>{label}</div>
                    <div style={{fontSize:8,color:"#475569",marginTop:2}}>{desc}</div>
                    <div style={{fontSize:10,fontWeight:700,color:on?"#a78bfa":"#374151",marginTop:4}}>{on?"ON":"OFF"}</div>
                  </button>
                );
              })}
            </div>

            {/* Type selector — shows when either FTL or drought is active */}
            {isDynamic && (
              <div>
                <div style={{fontSize:9,color:"#64748b",marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>
                  {rules.followTheLeader ? "Outside Bet Type (FTL picks best within type)" : "Outside Bet Type (drought scale)"}
                </div>
                <div style={{display:"flex",gap:5,marginBottom:6}}>
                  {rules.followTheLeader
                    ? [["dozens","📊 Dozens"],["columns","📊 Columns"],["even","🎯 Even Money"]].map(([t,l])=>{
                        const sel=cfg.ftlTargetType===t;
                        return <button key={t} onClick={()=>upCfg("ftlTargetType",t)} style={{flex:1,padding:"7px 0",borderRadius:8,border:"2px solid "+(sel?"#a78bfa":"#2d4057"),background:sel?"#1a0a2e":"#0f1923",color:sel?"#c4b5fd":"#64748b",fontSize:10,fontWeight:700,cursor:"pointer"}}>{l}</button>;
                      })
                    : [["set12","📊 Set of 12"],["even","🎯 Even Money"]].map(([t,l])=>{
                        const sel=cfg.ftlTargetType===t||((cfg.ftlTargetType==="dozens"||cfg.ftlTargetType==="columns")&&t==="set12");
                        return <button key={t} onClick={()=>upCfg("ftlTargetType",t==="set12"?"dozens":t)} style={{flex:1,padding:"7px 0",borderRadius:8,border:"2px solid "+(sel?"#a78bfa":"#2d4057"),background:sel?"#1a0a2e":"#0f1923",color:sel?"#c4b5fd":"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>;
                      })
                  }
                </div>
                {rules.followTheLeader && (cfg.ftlTargetType==="dozens"||cfg.ftlTargetType==="columns") && (
                  <div style={{display:"flex",gap:5}}>
                    {[1,2].map(n=>{const sel=(cfg.ftlCount||1)===n;return <button key={n} onClick={()=>upCfg("ftlCount",n)} style={{flex:1,padding:"6px 0",borderRadius:7,border:"2px solid "+(sel?"#a78bfa":"#2d4057"),background:sel?"#1a0a2e":"#0f1923",color:sel?"#c4b5fd":"#64748b",fontSize:10,fontWeight:700,cursor:"pointer"}}>{n} at a time</button>;})}
                  </div>
                )}
                {!cfg.ftlTargetType && <div style={{fontSize:10,color:"#f87171"}}>⚠ Select a bet type above to enable.</div>}
              </div>
            )}

            {/* Drought threshold controls */}
            {rules.droughtThreshold && (
              <div style={{background:"#0f1923",borderRadius:8,padding:"8px 10px",border:"1px solid #2d4057"}}>
                <div style={{display:"flex",gap:5,marginBottom:6}}>
                  {[["🟡",(presets?.yellow||4)],["🟠",(presets?.orange||7)],["🔴",(presets?.red||11)]].map(([icon,val])=>(
                    <button key={val} onClick={()=>upRule("droughtThreshold",val)} style={{flex:1,padding:"5px 0",borderRadius:7,border:"2px solid "+(rules.droughtThreshold===val?"#a78bfa":"#2d4057"),background:rules.droughtThreshold===val?"#1a0a2e":"transparent",color:"#c4b5fd",fontSize:10,fontWeight:700,cursor:"pointer"}}>{icon} {val}+</button>
                  ))}
                </div>
                <div style={{display:"flex",alignItems:"center",background:"#0c1520",borderRadius:6,overflow:"hidden"}}>
                  <button onClick={()=>upRule("droughtThreshold",Math.max(1,rules.droughtThreshold-1))} style={{padding:"5px 10px",background:"transparent",border:"none",color:"#a78bfa",fontSize:16,cursor:"pointer"}}>-</button>
                  <div style={{flex:1,textAlign:"center",fontSize:13,fontWeight:700,color:"#c4b5fd"}}>{rules.droughtThreshold} misses min</div>
                  <button onClick={()=>upRule("droughtThreshold",rules.droughtThreshold+1)} style={{padding:"5px 10px",background:"transparent",border:"none",color:"#a78bfa",fontSize:16,cursor:"pointer"}}>+</button>
                </div>
              </div>
            )}
          </>)}

          {/* Wait for Win — Solution only */}
          {type==="solution" && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:8,border:"1px solid "+(rules.waitForWin?"#a78bfa":"#1e2d3d"),background:rules.waitForWin?"#1a0a2e":"transparent"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:rules.waitForWin?"#c4b5fd":"#94a3b8"}}>Wait for Win</div>
                <div style={{fontSize:9,color:"#475569"}}>Don't enter until one in-range number wins first</div>
              </div>
              <button onClick={()=>upRule("waitForWin",!rules.waitForWin)} style={{padding:"4px 12px",borderRadius:7,border:"none",background:rules.waitForWin?"#7c3aed":"#374151",color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>{rules.waitForWin?"ON":"OFF"}</button>
            </div>
          )}

          {/* Park after Stop Loss */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:8,border:"1px solid "+(rules.parkAfterStopLoss?"#a78bfa":"#1e2d3d"),background:rules.parkAfterStopLoss?"#1a0a2e":"transparent"}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:rules.parkAfterStopLoss?"#c4b5fd":"#94a3b8"}}>Park after Stop Loss</div>
              <div style={{fontSize:9,color:"#475569"}}>Resume only after next win observed</div>
            </div>
            <button onClick={()=>upRule("parkAfterStopLoss",!rules.parkAfterStopLoss)} style={{padding:"4px 12px",borderRadius:7,border:"none",background:rules.parkAfterStopLoss?"#7c3aed":"#374151",color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>{rules.parkAfterStopLoss?"ON":"OFF"}</button>
          </div>

          {/* Park after Loss */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:8,border:"1px solid "+(rules.parkAfterLoss?"#a78bfa":"#1e2d3d"),background:rules.parkAfterLoss?"#1a0a2e":"transparent"}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:rules.parkAfterLoss?"#c4b5fd":"#94a3b8"}}>Park after Any Miss</div>
              <div style={{fontSize:9,color:"#475569"}}>Resume next spin</div>
            </div>
            <button onClick={()=>upRule("parkAfterLoss",!rules.parkAfterLoss)} style={{padding:"4px 12px",borderRadius:7,border:"none",background:rules.parkAfterLoss?"#7c3aed":"#374151",color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>{rules.parkAfterLoss?"ON":"OFF"}</button>
          </div>

        </div>
      )}
    </div>
  );
}


// -- Cash Out Modal --