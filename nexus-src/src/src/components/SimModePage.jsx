// -- Simulation Mode UI --
function StatContextBar({simResults, simCfg, sess, cur, pnlVal}) {
  // Match live tracks to sim strategies by type+roi+stopLoss
  const liveTracks = sess.tracks.filter(t=>t.state!=="closed");
  if(!liveTracks.length || !simResults) return null;

  const bars = liveTracks.map(t=>{
    // Find best matching sim strategy
    const match = simCfg.strategies.reduce((best,strat,i)=>{
      if(strat.type!==t.type) return best;
      const score = Math.abs(strat.config.roi-t.config.roi)+Math.abs(strat.config.stopLoss-t.config.stopLoss);
      return(!best||score<best.score)?{idx:i,score}:best;
    },null);
    if(!match) return null;

    const r = simResults[match.idx];
    if(!r||!r.sessions.length) return null;
    const stats = computeSimStats(r);
    if(!stats) return null;

    const livePnl = t.pnl*(t.config.unit||1);
    // Compare live P&L per sequence vs sim expected
    const sequences = t.bets.filter(b=>b.outcome==="win"||b.type==="abandon").length||1;
    const liveRate = livePnl/sequences;
    const simRate = stats.avgPnlPerSession/(simCfg.spinsPerSession/37||10);

    // Percentile: where does current livePnl fall in sim distribution?
    const pnls = r.sessions.map(s=>s.pnl).sort((a,b)=>a-b);
    const pctRank = Math.round(pnls.filter(p=>p<=livePnl).length/pnls.length*100);

    const status = pctRank>=75?"ahead":pctRank>=40?"on track":"behind";
    const statusColor = status==="ahead"?"#4ade80":status==="on track"?"#fbbf24":"#f87171";
    const statusIcon = status==="ahead"?"📈":status==="on track"?"➡️":"📉";

    return {t, status, statusColor, statusIcon, pctRank, stats, livePnl};
  }).filter(Boolean);

  if(!bars.length) return null;

  return(
    <div style={{background:"#0c1520",border:"1px solid #1e2d3d",borderRadius:10,padding:"8px 12px",marginBottom:8,display:"flex",flexDirection:"column",gap:4}}>
      <div style={{fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>vs Simulation Benchmark</div>
      {bars.map(({t,status,statusColor,statusIcon,pctRank,stats,livePnl},i)=>(
        <div key={t.id} style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:t.color,flexShrink:0}}/>
          <div style={{fontSize:10,color:t.color,flex:1}}>{t.type==="fibonacci"?"Prog":"Sol"}</div>
          <div style={{fontSize:10,color:statusColor,fontWeight:700}}>{statusIcon} {status==="ahead"?"Ahead":"on track"===status?"On Track":"Behind"}</div>
          <div style={{fontSize:10,color:"#64748b"}}>P{pctRank}</div>
          <div style={{fontSize:10,color:statusColor,fontWeight:700}}>{livePnl>=0?"+":""}{cur.symbol}{livePnl.toFixed(2)}</div>
          <div style={{fontSize:9,color:"#374151"}}>
            exp {stats.p50>=0?"+":""}{cur.symbol}{stats.p50.toFixed(0)}
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Simulation Mode Page --
function SimModePage({simCfg, setSimCfg, simRunning, setSimRunning, simPaused, setSimPaused, simProgress, setSimProgress, simResults, setSimResults, simDone, setSimDone, simStopRef, currency, cur}) {
  const [view, setView] = useState("setup"); // "setup" | "running" | "results"
  const [editStratIdx, setEditStratIdx] = useState(null);

  function addStrategy(type) {
    const cfg = type==="fibonacci" ? defaultFibCfg() : defaultSolCfg();
    setSimCfg(c=>({...c, strategies:[...c.strategies, {type, config:cfg, label:(type==="fibonacci"?"Progression Bet":"The Solution")+" #"+(c.strategies.length+1)}]}));
  }

  function removeStrategy(i) {
    setSimCfg(c=>({...c, strategies:c.strategies.filter((_,idx)=>idx!==i)}));
  }

  function startSim() {
    if(!simCfg.strategies.length){alert("Add at least one strategy.");return;}
    simStopRef.current=false;
    setSimRunning(true);setSimDone(false);setSimResults(null);setSimProgress(0);setView("running");

    // Run in chunks via setTimeout to not block UI
    const results = simCfg.strategies.map(()=>({
      sessions:[],totalPnl:0,totalWins:0,totalLosses:0,stopLossHits:0,
      winStreaks:[],lossStreaks:[],currentStreak:{type:null,len:0},totalSequences:0,
      pnlHistory:[], // per-session running total for chart
    }));

    let sessionIdx=0;
    const wheelNums=getWheelNums(simCfg.roulette);

    function runChunk(){
      const CHUNK=10;
      for(let ci=0;ci<CHUNK&&sessionIdx<simCfg.sessions;ci++,sessionIdx++){
        if(simStopRef.current) break;

        const sState=simCfg.strategies.map((strat)=>({
          level:0,pnl:0,wins:0,losses:0,stopLossHits:0,
          waitingForWin:strat.config.parkRules?.waitForWin||false,
          parkedAfterLoss:false,
          droughts:initDroughts(simCfg.roulette),
        }));

        for(let sp=0;sp<simCfg.spinsPerSession;sp++){
          if(simStopRef.current) break;
          const val=wheelNums[Math.floor(Math.random()*wheelNums.length)];
          const bonus={};

          sState.forEach(st=>{Object.keys(st.droughts).forEach(k=>st.droughts[k]++);st.droughts[val]=0;});

          simCfg.strategies.forEach((strat,si)=>{
            const st=sState[si];
            const cfg=strat.config;
            const rules=cfg.parkRules||{};
            const tbl=computeTableForTrack({type:strat.type,config:cfg},st.droughts);

            if(rules.parkAfterLoss&&st.parkedAfterLoss){st.parkedAfterLoss=false;return;}

            if(strat.type==="fibonacci"){
              // Drought threshold check
              if(rules.droughtThreshold&&!meetsThreshold(cfg,st.droughts)) return;

              // Follow the Leader — resolve dynamic targets
              const resolved=resolveDynamicTargets(cfg,st.droughts);
              const dts=resolved.dozenTargets,cts=resolved.colTargets,evts=resolved.evenTargets;
              const numTargets=(evts.length||(dts.length+cts.length))||1;
              const betMode=cfg.betMode||"progression";
              const em=betMode==="flat"?"flat":(evts.length>0?"martingale":"progression");
              const isZ=val==="0"||val==="00";
              let hitCount=0;
              if(!isZ){
                if(evts.length>0){evts.forEach(k=>{const e=EVEN_MONEY.find(x=>x.key===k);if(e&&e.pred(+val))hitCount++;});}
                else{if(dts.includes(dozenOf(val)))hitCount++;if(cts.includes(colOf(val)))hitCount++;}
              }
              const payMult=evts.length>0?2:3;
              const row=tbl[Math.min(st.level,tbl.length-1)];

              if(em==="flat"){
                if(hitCount>0){st.pnl+=(hitCount*payMult-numTargets)*(cfg.unit||1);st.wins++;pushStreak(results[si],true);}
                else{st.pnl-=numTargets*(cfg.unit||1);st.losses++;pushStreak(results[si],false);if(rules.parkAfterLoss)st.parkedAfterLoss=true;}
              } else {
                const cat=isZ?"loss":getCategory(val,dts,cts,row,evts);
                if(cat!=="loss"){
                  const sd=hitCount*payMult*(row?row.c:1)-(row?row.c:1)*numTargets;
                  const mult=bonus[val]||1;
                  const bd=mult>1?(row?row.c:1)*(mult-35)*(cfg.unit||1):0;
                  st.pnl+=sd*(cfg.unit||1)+bd;st.wins++;st.level=0;
                  pushStreak(results[si],true);
                  if(rules.waitForWin)st.waitingForWin=false;
                } else {
                  st.pnl-=(row?row.c:1)*numTargets*(cfg.unit||1);st.losses++;
                  if(st.level<tbl.length-1){st.level++;}
                  else{st.stopLossHits++;st.level=0;if(rules.parkAfterStopLoss)st.waitingForWin=true;}
                  pushStreak(results[si],false);
                  if(rules.parkAfterLoss)st.parkedAfterLoss=true;
                }
              }
            }

            if(strat.type==="solution"){
              const entry=cfg.entryThreshold||120;
              const inRange=wheelNums.filter(v=>v!=="0"&&v!=="00"&&(st.droughts[v]||0)>=entry);
              if(rules.waitForWin&&st.waitingForWin){if(inRange.some(n=>n===val))st.waitingForWin=false;return;}
              if(!inRange.length)return;
              const targetNum=inRange.sort((a,b)=>(st.droughts[b]||0)-(st.droughts[a]||0))[0];
              const row=tbl[Math.min(st.level,tbl.length-1)];
              if(val===targetNum){
                const mult=bonus[val]||1;
                const profit=(row?row.profit:0)*(cfg.unit||1);
                const bd=mult>1?(row?row.c:1)*(mult-35)*(cfg.unit||1):0;
                st.pnl+=profit+bd;st.wins++;st.level=0;
                pushStreak(results[si],true);
                if(rules.waitForWin)st.waitingForWin=false;
              } else {
                st.pnl-=(row?row.c:1)*(cfg.unit||1);st.losses++;
                if(st.level<tbl.length-1){st.level++;}
                else{st.stopLossHits++;st.level=0;if(rules.parkAfterStopLoss)st.waitingForWin=true;}
                pushStreak(results[si],false);
                if(rules.parkAfterLoss)st.parkedAfterLoss=true;
              }
            }
          });
        }

        simCfg.strategies.forEach((_,si)=>{
          const st=sState[si];
          results[si].sessions.push({pnl:st.pnl,wins:st.wins,losses:st.losses,stopLossHits:st.stopLossHits});
          results[si].totalPnl+=st.pnl;
          results[si].totalWins+=st.wins;
          results[si].totalLosses+=st.losses;
          results[si].stopLossHits+=st.stopLossHits;
          results[si].pnlHistory.push(results[si].totalPnl);
        });
      }

      setSimProgress(sessionIdx);
      setSimResults(results.map(r=>({...r})));

      if(sessionIdx<simCfg.sessions&&!simStopRef.current){
        setTimeout(runChunk,0);
      } else {
        // Finalize streaks
        results.forEach(r=>{
          if(r.currentStreak.len>0){
            if(r.currentStreak.type)r.winStreaks.push(r.currentStreak.len);
            else r.lossStreaks.push(r.currentStreak.len);
          }
          r.totalSequences=r.totalWins+r.totalLosses;
        });
        setSimResults([...results]);
        setSimRunning(false);setSimDone(true);
        if('Notification' in window&&Notification.permission==='granted'){
          new Notification('Nexus Roulette Simulation Complete!',{body:`${simCfg.sessions} sessions done. Tap to see results.`,icon:'./icon.svg'});
        }
      }
    }
    setTimeout(runChunk,50);
  }

  function stopSim(){simStopRef.current=true;setSimRunning(false);}
  function requestNotifPermission(){if('Notification' in window)Notification.requestPermission();}

  // -- Setup View --
  if(view==="setup") return (
    <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%"}}>
      <Card>
        <div style={{fontSize:14,fontWeight:800,color:"#a78bfa",marginBottom:10}}>🔬 Simulation Setup</div>

        {/* Wheel + sessions */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <Lbl>Wheel Type</Lbl>
            <div style={{display:"flex",gap:8}}>
              {[["european","🇪🇺 European"],["american","🇺🇸 American"]].map(([v,l])=>{
                const sel=simCfg.roulette===v;
                return <button key={v} onClick={()=>setSimCfg(c=>({...c,roulette:v}))} style={{flex:1,padding:"9px 0",borderRadius:10,border:"2px solid "+(sel?"#a78bfa":"#2d4057"),background:sel?"#2e1065":"#0f1923",color:sel?"#c4b5fd":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>;
              })}
            </div>
          </div>

          <div>
            <Lbl>Sessions</Lbl>
            <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:10,border:"1px solid #2d4057",overflow:"hidden"}}>
              <button onClick={()=>setSimCfg(c=>({...c,sessions:Math.max(10,c.sessions-(c.sessions<=100?10:c.sessions<=1000?100:1000))}))} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#a78bfa",fontSize:18,fontWeight:700,cursor:"pointer"}}>-</button>
              <div style={{flex:1,textAlign:"center",fontSize:16,fontWeight:800,color:"#c4b5fd"}}>{simCfg.sessions.toLocaleString()}</div>
              <button onClick={()=>setSimCfg(c=>({...c,sessions:c.sessions+(c.sessions<100?10:c.sessions<1000?100:1000)}))} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#a78bfa",fontSize:18,fontWeight:700,cursor:"pointer"}}>+</button>
            </div>
            <div style={{display:"flex",gap:5,marginTop:5}}>
              {[100,500,1000,5000,10000].map(v=>(
                <button key={v} onClick={()=>setSimCfg(c=>({...c,sessions:v}))} style={{flex:1,padding:"5px 0",borderRadius:7,border:"1px solid "+(simCfg.sessions===v?"#a78bfa":"#2d4057"),background:simCfg.sessions===v?"#2e1065":"#0f1923",color:simCfg.sessions===v?"#c4b5fd":"#64748b",fontSize:10,fontWeight:700,cursor:"pointer"}}>{v>=1000?v/1000+"K":v}</button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Spins per Session</Lbl>
            <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:10,border:"1px solid #2d4057",overflow:"hidden"}}>
              <button onClick={()=>setSimCfg(c=>({...c,spinsPerSession:Math.max(100,c.spinsPerSession-100)}))} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#a78bfa",fontSize:18,fontWeight:700,cursor:"pointer"}}>-</button>
              <div style={{flex:1,textAlign:"center",fontSize:16,fontWeight:800,color:"#c4b5fd"}}>{simCfg.spinsPerSession.toLocaleString()}</div>
              <button onClick={()=>setSimCfg(c=>({...c,spinsPerSession:c.spinsPerSession+100}))} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#a78bfa",fontSize:18,fontWeight:700,cursor:"pointer"}}>+</button>
            </div>
            <div style={{display:"flex",gap:5,marginTop:5}}>
              {[500,1000,5000,10000,50000].map(v=>(
                <button key={v} onClick={()=>setSimCfg(c=>({...c,spinsPerSession:v}))} style={{flex:1,padding:"5px 0",borderRadius:7,border:"1px solid "+(simCfg.spinsPerSession===v?"#a78bfa":"#2d4057"),background:simCfg.spinsPerSession===v?"#2e1065":"#0f1923",color:simCfg.spinsPerSession===v?"#c4b5fd":"#64748b",fontSize:10,fontWeight:700,cursor:"pointer"}}>{v>=1000?v/1000+"K":v}</button>
              ))}
            </div>
          </div>

        </div>
      </Card>

      {/* Strategies */}
      <Card>
        <Lbl>{"Strategies to Benchmark ("+simCfg.strategies.length+")"}</Lbl>
        {simCfg.strategies.map((strat,i)=>(
          <div key={i} style={{background:"#0f1923",borderRadius:10,padding:"10px 12px",border:"1px solid #2d4057",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:12,fontWeight:700,color:TRACK_COLORS[i%TRACK_COLORS.length]}}>{strat.label}</div>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>setEditStratIdx(editStratIdx===i?null:i)} style={{padding:"3px 8px",borderRadius:6,border:"1px solid #1e3a5f",background:"transparent",color:"#60a5fa",fontSize:9,cursor:"pointer"}}>✏️</button>
                <button onClick={()=>removeStrategy(i)} style={{padding:"3px 8px",borderRadius:6,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:9,cursor:"pointer"}}>×</button>
              </div>
            </div>
            <div style={{fontSize:10,color:"#64748b"}}>
              {strat.type==="fibonacci"
                ?`${strat.config.betMode||"progression"} · ${(strat.config.evenTargets||[]).length>0?(strat.config.evenTargets).join("+"):((strat.config.dozenTargets||[]).map(d=>DZ_LABELS[d]).join("+")||"--")+(strat.config.colTargets?.length>0?" + "+(strat.config.colTargets.map(c=>COL_LABELS[c]).join("+")):"")}`
                :`Solution · entry ${strat.config.entryThreshold}`
              } · ROI {strat.config.roi}% · stop ${cur.symbol}{strat.config.stopLoss}
            </div>
            {editStratIdx===i && (
              <SimStratEditor strat={strat} idx={i} simCfg={simCfg} setSimCfg={setSimCfg} cur={cur} onClose={()=>setEditStratIdx(null)}/>
            )}
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={()=>addStrategy("fibonacci")} style={{flex:1,padding:"9px 0",borderRadius:10,border:"2px dashed #2d4057",background:"transparent",color:"#64748b",fontSize:12,cursor:"pointer"}}>+ Progression Bet</button>
          <button onClick={()=>addStrategy("solution")} style={{flex:1,padding:"9px 0",borderRadius:10,border:"2px dashed #2d4057",background:"transparent",color:"#64748b",fontSize:12,cursor:"pointer"}}>+ The Solution</button>
        </div>
      </Card>

      <div style={{fontSize:10,color:"#475569",textAlign:"center"}}>
        Total spins: ~{(simCfg.sessions*simCfg.spinsPerSession).toLocaleString()}
      </div>

      <button onClick={startSim} style={{width:"100%",padding:"16px 0",borderRadius:14,border:"none",background:"#7c3aed",color:"white",fontSize:16,fontWeight:900,cursor:"pointer",letterSpacing:1}}>
        ▶ Start Simulation
      </button>
      <button onClick={requestNotifPermission} style={{width:"100%",padding:"10px 0",borderRadius:10,border:"1px solid #2d4057",background:"transparent",color:"#64748b",fontSize:11,cursor:"pointer"}}>
        🔔 Enable completion notification
      </button>
      {simDone && <button onClick={()=>setView("results")} style={{width:"100%",padding:"12px 0",borderRadius:12,border:"none",background:"#134e2a",color:"#4ade80",fontSize:14,fontWeight:700,cursor:"pointer"}}>📊 View Last Results</button>}
    </div>
  );

  // -- Running View --
  if(view==="running") return (
    <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%"}}>
      <Card>
        <div style={{fontSize:14,fontWeight:800,color:"#a78bfa",marginBottom:10}}>🔬 Simulation Running...</div>
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,color:"#64748b"}}>Sessions</span>
            <span style={{fontSize:11,color:"#c4b5fd",fontWeight:700}}>{simProgress.toLocaleString()} / {simCfg.sessions.toLocaleString()}</span>
          </div>
          <div style={{height:8,borderRadius:4,background:"#1e2d3d",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:4,background:"#7c3aed",width:`${simProgress/simCfg.sessions*100}%`,transition:"width 0.3s"}}/>
          </div>
        </div>

        {/* Live P&L per strategy */}
        {simResults && simCfg.strategies.map((strat,i)=>{
          const r=simResults[i];
          const pnl=r?r.totalPnl:0;
          return(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #1e2d3d"}}>
              <span style={{fontSize:11,color:TRACK_COLORS[i%TRACK_COLORS.length]}}>{strat.label}</span>
              <span style={{fontSize:13,fontWeight:700,color:pnl>=0?"#4ade80":"#f87171"}}>{pnl>=0?"+":"-"}{cur.symbol}{Math.abs(pnl).toFixed(2)}</span>
            </div>
          );
        })}

        <div style={{display:"flex",gap:8,marginTop:12}}>
          {simRunning
            ? <button onClick={stopSim} style={{flex:1,padding:"12px 0",borderRadius:10,border:"none",background:"#7f1d1d",color:"#f87171",fontSize:13,fontWeight:700,cursor:"pointer"}}>■ Stop</button>
            : <button onClick={()=>{setView("results");}} style={{flex:1,padding:"12px 0",borderRadius:10,border:"none",background:"#134e2a",color:"#4ade80",fontSize:13,fontWeight:700,cursor:"pointer"}}>📊 View Results</button>
          }
          <button onClick={()=>setView("setup")} style={{flex:1,padding:"12px 0",borderRadius:10,border:"1px solid #2d4057",background:"transparent",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>← Setup</button>
        </div>
        {simDone && <div style={{textAlign:"center",color:"#4ade80",fontWeight:700,marginTop:8}}>✅ Simulation Complete!</div>}
      </Card>
    </div>
  );

  // -- Results View --
  if(view==="results" && simResults) return (
    <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%"}}>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setView("setup")} style={{flex:1,padding:"10px 0",borderRadius:10,border:"1px solid #2d4057",background:"transparent",color:"#94a3b8",fontSize:12,cursor:"pointer"}}>← Setup</button>
        <button onClick={()=>setView("running")} style={{flex:1,padding:"10px 0",borderRadius:10,border:"1px solid #2d4057",background:"transparent",color:"#94a3b8",fontSize:12,cursor:"pointer"}}>Progress</button>
      </div>
      <div style={{fontSize:11,color:"#64748b",textAlign:"center"}}>{simCfg.sessions.toLocaleString()} sessions × {simCfg.spinsPerSession.toLocaleString()} spins</div>

      {simCfg.strategies.map((strat,i)=>{
        const r=simResults[i];
        if(!r) return null;
        const stats=computeSimStats(r);
        if(!stats) return null;
        const color=TRACK_COLORS[i%TRACK_COLORS.length];

        return(
          <Card key={i}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{fontSize:13,fontWeight:800,color}}>{strat.label}</div>
                <div style={{fontSize:10,color:"#64748b",marginTop:2}}>
                  {(r.totalSequences||0).toLocaleString()} sequences · {(stats.winRate*100).toFixed(1)}% win rate
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18,fontWeight:900,color:stats.totalPnl>=0?"#4ade80":"#f87171"}}>{stats.totalPnl>=0?"+":"-"}{cur.symbol}{Math.abs(stats.totalPnl).toFixed(2)}</div>
                <div style={{fontSize:10,color:"#64748b"}}>avg {stats.avgPnlPerSession>=0?"+":""}{cur.symbol}{stats.avgPnlPerSession.toFixed(2)}/sess</div>
              </div>
            </div>

            {/* P&L Distribution */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>P&L Per Session Distribution</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:4}}>
                {[["Min",stats.minPnl,"#f87171"],["P25",stats.p25,"#f97316"],["P50",stats.p50,"#fbbf24"],["P75",stats.p75,"#86efac"],["Max",stats.maxPnl,"#4ade80"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"#0f1923",borderRadius:8,padding:"6px 4px",textAlign:"center",border:"1px solid #2d4057"}}>
                    <div style={{fontSize:8,color:"#64748b"}}>{l}</div>
                    <div style={{fontSize:11,fontWeight:700,color:v>=0?c:"#f87171"}}>{v>=0?"+":"-"}{cur.symbol}{Math.abs(v).toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak Stats */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Streak Analysis</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {[
                  ["Longest Win Streak",stats.longestWinStreak,"#4ade80"],
                  ["Longest Loss Streak",stats.longestLossStreak,"#f87171"],
                  ["Avg Win Streak",stats.avgWinStreak.toFixed(1),"#86efac"],
                  ["Avg Loss Streak",stats.avgLossStreak.toFixed(1),"#f97316"],
                  ["Stop Loss Hits",r.stopLossHits,"#fbbf24"],
                  ["Stop Loss Rate",(stats.stopLossRate).toFixed(2)+"/sess","#fbbf24"],
                ].map(([l,v,c])=>(
                  <div key={l} style={{background:"#0f1923",borderRadius:8,padding:"8px 8px",border:"1px solid #2d4057"}}>
                    <div style={{fontSize:8,color:"#64748b",marginBottom:2}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Win streak distribution */}
            {stats.winStreakDist.length>0 && (
              <div style={{marginBottom:8}}>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Win Streak Distribution</div>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {stats.winStreakDist.slice(0,10).map(({len,pct:p})=>(
                    <div key={len} style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{fontSize:9,color:"#64748b",width:16,textAlign:"right"}}>{len}</div>
                      <div style={{flex:1,height:10,background:"#1e2d3d",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",background:"#22c55e",borderRadius:4,width:`${Math.min(100,p)}%`}}/>
                      </div>
                      <div style={{fontSize:9,color:"#4ade80",width:36,textAlign:"right"}}>{p.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loss streak distribution */}
            {stats.lossStreakDist.length>0 && (
              <div>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Loss Streak Distribution</div>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {stats.lossStreakDist.slice(0,10).map(({len,pct:p})=>(
                    <div key={len} style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{fontSize:9,color:"#64748b",width:16,textAlign:"right"}}>{len}</div>
                      <div style={{flex:1,height:10,background:"#1e2d3d",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",background:"#ef4444",borderRadius:4,width:`${Math.min(100,p)}%`}}/>
                      </div>
                      <div style={{fontSize:9,color:"#f87171",width:36,textAlign:"right"}}>{p.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );

  return null;
}

// -- Sim Strategy Editor --
function SimStratEditor({strat, idx, simCfg, setSimCfg, cur, onClose}) {
  const [cfg, setCfg] = useState({...strat.config});
  const [rules, setRules] = useState({...defaultParkRules(), ...(strat.config.parkRules||{})});
  function upCfg(k,v){setCfg(c=>({...c,[k]:v}));}
  function upRule(k,v){setRules(r=>({...r,[k]:v}));}
  function toggleArr(key,val,max){
    const arr=cfg[key]||[];
    if(arr.includes(val)){upCfg(key,arr.filter(x=>x!==val));}
    else if(arr.length<max){upCfg(key,[...arr,val].sort());}
  }
  function save(){
    setSimCfg(c=>{
      const strats=[...c.strategies];
      strats[idx]={...strats[idx],config:{...cfg,parkRules:rules}};
      return{...c,strategies:strats};
    });
    onClose();
  }
  return(
    <div style={{marginTop:10,padding:10,background:"#0c1520",borderRadius:10,border:"1px solid #2d4057",display:"flex",flexDirection:"column",gap:10}}>
      <ROIStepper value={cfg.roi} onChange={v=>upCfg("roi",v)} disabled={(cfg.evenTargets||[]).length>0}/>
      <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:10,border:"1px solid #2d4057",overflow:"hidden"}}>
        <button onClick={()=>upCfg("stopLoss",Math.max(25,cfg.stopLoss-25))} style={{padding:"7px 12px",background:"transparent",border:"none",color:"#60a5fa",fontSize:16,fontWeight:700,cursor:"pointer"}}>-</button>
        <div style={{flex:1,textAlign:"center",fontSize:14,fontWeight:800,color:"#f87171"}}>Stop {cur.symbol}{cfg.stopLoss}</div>
        <button onClick={()=>upCfg("stopLoss",cfg.stopLoss+25)} style={{padding:"7px 12px",background:"transparent",border:"none",color:"#60a5fa",fontSize:16,fontWeight:700,cursor:"pointer"}}>+</button>
      </div>

      {strat.type==="fibonacci" && (
        <>
          <div>
            <Lbl>Bet Mode</Lbl>
            <div style={{display:"flex",gap:5}}>
              {[["flat","Flat"],["progression","Progression"]].map(([m,l])=>{
                const sel=(cfg.betMode||"progression")===m;
                return <button key={m} onClick={()=>upCfg("betMode",m)} style={{flex:1,padding:"6px 0",borderRadius:8,border:"2px solid "+(sel?"#86efac":"#2d4057"),background:sel?"#134e2a":"#0f1923",color:sel?"#86efac":"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>;
              })}
            </div>
          </div>
          <div>
            <Lbl>Even Money</Lbl>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
              {[{key:"red",label:"Red",color:"#ef4444",pair:"black"},{key:"black",label:"Black",color:"#94a3b8",pair:"red"},{key:"odd",label:"Odd",color:"#a78bfa",pair:"even"},{key:"even",label:"Even",color:"#60a5fa",pair:"odd"},{key:"high",label:"High",color:"#fbbf24",pair:"low"},{key:"low",label:"Low",color:"#86efac",pair:"high"}].map(em=>{
                const evts=cfg.evenTargets||[];
                const sel=evts.includes(em.key);
                const pairSel=evts.includes(em.pair);
                return <button key={em.key} onClick={()=>{if(sel){upCfg("evenTargets",evts.filter(x=>x!==em.key));}else if(!pairSel&&evts.length<2){upCfg("evenTargets",[...evts,em.key]);upCfg("dozenTargets",[]);upCfg("colTargets",[]);}}} style={{padding:"6px 0",borderRadius:7,border:"2px solid "+(sel?em.color:pairSel?"#1e2d3d":"#2d4057"),background:sel?"#0f1923":"transparent",color:sel?em.color:pairSel?"#1e2d3d":"#64748b",fontSize:11,fontWeight:700,cursor:pairSel&&!sel?"not-allowed":"pointer",opacity:pairSel&&!sel?0.3:1}}>{em.label}</button>;
              })}
            </div>
          </div>
          {(cfg.evenTargets||[]).length===0 && (
            <>
              <div>
                <Lbl>Dozens</Lbl>
                <div style={{display:"flex",gap:5}}>
                  {[0,1,2].map(i=>{const sel=(cfg.dozenTargets||[]).includes(i);return<button key={i} onClick={()=>{toggleArr("dozenTargets",i,2);upCfg("evenTargets",[]);}} style={{flex:1,padding:"7px 0",borderRadius:8,border:"2px solid "+(sel?DZ_BD[i]:"#2d4057"),background:sel?"#0f1923":"transparent",color:sel?DZ_TX[i]:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{DZ_LABELS[i]}</button>;})}
                </div>
              </div>
              <div>
                <Lbl>Columns</Lbl>
                <div style={{display:"flex",gap:5}}>
                  {[0,1,2].map(i=>{const sel=(cfg.colTargets||[]).includes(i);return<button key={i} onClick={()=>{toggleArr("colTargets",i,2);upCfg("evenTargets",[]);}} style={{flex:1,padding:"7px 0",borderRadius:8,border:"2px solid "+(sel?COL_BD[i]:"#2d4057"),background:sel?"#0f1923":"transparent",color:sel?COL_TX[i]:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{COL_LABELS[i]}</button>;})}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {strat.type==="solution" && (
        <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:10,border:"1px solid #2d4057",overflow:"hidden"}}>
          <button onClick={()=>upCfg("entryThreshold",Math.max(20,cfg.entryThreshold-10))} style={{padding:"7px 12px",background:"transparent",border:"none",color:"#60a5fa",fontSize:16,fontWeight:700,cursor:"pointer"}}>-</button>
          <div style={{flex:1,textAlign:"center",fontSize:14,fontWeight:800,color:"#f59e0b"}}>Entry {cfg.entryThreshold} misses</div>
          <button onClick={()=>upCfg("entryThreshold",cfg.entryThreshold+10)} style={{padding:"7px 12px",background:"transparent",border:"none",color:"#60a5fa",fontSize:16,fontWeight:700,cursor:"pointer"}}>+</button>
        </div>
      )}

      <ParkPlayRulesEditor cfg={cfg} upCfg={upCfg} type={strat.type}/>

      <div style={{display:"flex",gap:8}}>
        <button onClick={save} style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",background:"#7c3aed",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
        <button onClick={onClose} style={{flex:1,padding:"10px 0",borderRadius:10,border:"1px solid #2d4057",background:"transparent",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>Cancel</button>
      </div>
    </div>
  );
}