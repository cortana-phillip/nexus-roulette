// -- Main App Component --
export default function App() {
  const [appState, setAppState] = useState(loadApp);
  const [driveSyncStatus, setDriveSyncStatus] = useState(getDriveToken()?"connected":"disconnected");
  const [tab, setTab] = useState(0);
  const [appMode, setAppMode] = useState("game"); // "game" | "live" | "sim"
  const [livePausedAt, setLivePausedAt] = useState(Date.now()); // paused since app starts in game mode
  const [livePausedTotal, setLivePausedTotal] = useState(0);

  // Track paused time when leaving/entering live mode
  useEffect(() => {
    if(appMode === "live") {
      // Returning to live - accumulate paused time
      if(livePausedAt) {
        setLivePausedTotal(prev => prev + (Date.now() - livePausedAt));
        setLivePausedAt(null);
      }
    } else {
      // Leaving live - start pause timer
      if(!livePausedAt) setLivePausedAt(Date.now());
    }
  }, [appMode]);
  const [simCfg, setSimCfg] = useState(defaultSimConfig);
  const [simRunning, setSimRunning] = useState(false);
  const [simPaused, setSimPaused] = useState(false);
  const [simProgress, setSimProgress] = useState(0); // sessions completed
  const [simResults, setSimResults] = useState(null);
  const [simDone, setSimDone] = useState(false);
  const simStopRef = React.useRef(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [result, setResult] = useState(null);
  const [flashNum, setFlashNum] = useState(null);
  const [prevSessState, setPrevSessState] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [highlightTrackId, setHighlightTrackId] = useState(null);
  const [editTrackId, setEditTrackId] = useState(null);
  const [gameSpinning, setGameSpinning] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [lastSpinDelta, setLastSpinDelta] = useState(null);
  const [selectedChip, setSelectedChip] = useState(1);
  const [liveSelectingWinner, setLiveSelectingWinner] = useState(true);
  const [liveWinNumber, setLiveWinNumber] = useState(null);
  const [liveManualBets, setLiveManualBets] = useState([]);
  const [liveLastBets, setLiveLastBets] = useState([]);
  const [liveBetResults, setLiveBetResults] = useState(null);
  const [liveUndoStack, setLiveUndoStack] = useState([]);
  const liveClearTimerRef = React.useRef(null);
  const [updateAvailable, setUpdateAvailable] = useState(null); // {version, notes}

  // Check for app updates
  useEffect(() => {
    function checkUpdate() {
      fetch("version.json?t="+Date.now()).then(r=>r.json()).then(data=>{
        if(data.version && data.version !== APP_VERSION) setUpdateAvailable({version:data.version, notes:data.notes||""});
      }).catch(()=>{});
    }
    checkUpdate();
    const iv = setInterval(checkUpdate, 10000);
    return () => clearInterval(iv);
  }, []);

  const [buyInOpen, setBuyInOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [editBankroll, setEditBankroll] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [hardResetOpen, setHardResetOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [pendingTrackType, setPendingTrackType] = useState("fibonacci");
  const [pendingTrackCfg, setPendingTrackCfg] = useState(defaultFibCfg());

  const sessKey = appMode==="game"?"gameSession":"currentSession";
  const sess = appState[sessKey] || appState.currentSession;
  const livePauseOffset = livePausedTotal + (livePausedAt ? (Date.now() - livePausedAt) : 0);
  const settings = appState.settings || defaultSettings();
  const saved = appState.savedSessions || [];
  const currency = settings.currency || "USD";
  const cur = getCur(currency);

  useEffect(() => { saveApp(appState); }, [appState]);

  function updApp(fn) { setAppState(p => { const n=JSON.parse(JSON.stringify(p)); fn(n); return n; }); }
  function updSess(fn) { updApp(s => { if(!s[sessKey])s[sessKey]=newSession(); fn(s[sessKey]); s[sessKey].modified=Date.now(); }); }
  function updSettings(fn) { updApp(s => { fn(s.settings); }); }

  const wheelNums = useMemo(() => getWheelNums(sess.roulette), [sess.roulette]);
  const nonClosedTracks = sess.tracks.filter(t=>t.state!=="closed");
  const primaryTrack = sess.tracks.find(t=>t.id===selectedTrackId&&t.state!=="closed") || sess.tracks.find(t=>t.state==="active") || null;
  const nextColorIdx = sess.tracks.length % TRACK_COLORS.length;
  const trackOverlays = sess.tracks.filter(t=>t.state==="active").map(t => ({
    ...t.config, type:t.type, color:t.color, id:t.id,
    activeBets:t.type==="solution"?(t.config.activeBets||[]):undefined,
  }));
  const primFibTbl = primaryTrack&&primaryTrack.type==="fibonacci" ? computeTableForTrack(primaryTrack) : [];
  const primFibRow = primFibTbl[Math.min(primaryTrack?primaryTrack.level:0, primFibTbl.length-1)] || null;
  const solTable = primaryTrack&&primaryTrack.type==="solution" ? computeTableForTrack(primaryTrack) : [];
  const solEntryThreshold = primaryTrack&&primaryTrack.type==="solution" ? primaryTrack.config.entryThreshold : 120;
  const DEFAULT_SOL_ENTRY = 120;

  const inRange = useMemo(() =>
    wheelNums.filter(v=>v!=="0"&&v!=="00"&&(sess.droughts[v]||0)>=solEntryThreshold)
      .sort((a,b)=>(sess.droughts[b]||0)-(sess.droughts[a]||0)),
    [sess.droughts, solEntryThreshold, wheelNums]);

  // Solution candidates visible even without active Solution track
  const solCandidates = useMemo(() => {
    if(primaryTrack&&primaryTrack.type==="solution") return [];
    return wheelNums.filter(v=>v!=="0"&&v!=="00"&&(sess.droughts[v]||0)>=DEFAULT_SOL_ENTRY)
      .sort((a,b)=>(sess.droughts[b]||0)-(sess.droughts[a]||0));
  }, [sess.droughts, primaryTrack, wheelNums]);

  // Even money droughts
  const emDroughts = useMemo(() =>
    EVEN_MONEY.map(em=>({...em, drought:countDrought(sess.spins, em.pred)})),
    [sess.spins]);

  const {doz:dozD, col:colD} = useMemo(() => {
    const doz=[0,0,0], col=[0,0,0];
    for(let d=0;d<3;d++){let s=0;for(let i=sess.spins.length-1;i>=0;i--){if(dozenOf(sess.spins[i])===d)break;s++;}doz[d]=s;}
    for(let c=0;c<3;c++){let s=0;for(let i=sess.spins.length-1;i>=0;i--){if(colOf(sess.spins[i])===c)break;s++;}col[c]=s;}
    return{doz,col};
  }, [sess.spins]);

  // Onboarding -- AFTER all hooks so rules of hooks are satisfied
  if(!settings.onboarded) {
    return (
      <OnboardingScreen
        initialBankroll={settings._restartBankroll}
        onComplete={({roulette, bankroll, defaultBuyIn, currency: curr, tableMinBet, tableMaxBet, tableMaxTotal}) => {
          updApp(s => {
            const prevBankroll = s.settings._restartBankroll;
            s.settings.onboarded = true;
            s.settings.currency = curr;
            s.settings.defaultBuyIn = defaultBuyIn;
            if(tableMinBet) s.settings.tableMinBet = tableMinBet;
            if(tableMaxBet) s.settings.tableMaxBet = tableMaxBet;
            if(tableMaxTotal) s.settings.tableMaxTotal = tableMaxTotal;
            delete s.settings._restartBankroll;
            if(prevBankroll !== undefined) {
              // Restart -- adjust existing session's bankroll
              const delta = bankroll - prevBankroll;
              s.currentSession.roulette = roulette;
              s.currentSession.droughts = initDroughts(roulette);
              if(delta > 0) {
                // Added money → Buy In
                s.currentSession.bankrollCurrent = Math.round((s.currentSession.bankrollCurrent + delta)*100)/100;
                s.currentSession.totalBuyIn = (s.currentSession.totalBuyIn||0) + delta;
                if(!s.currentSession.buyIns) s.currentSession.buyIns = [];
                s.currentSession.buyIns.push({amount:delta,at:Date.now(),spin:s.currentSession.spins.length,note:"onboarding restart"});
              } else if(delta < 0) {
                // Removed money → Cash Out
                const cashAmt = Math.abs(delta);
                s.currentSession.bankrollCurrent = Math.round((s.currentSession.bankrollCurrent - cashAmt)*100)/100;
                s.currentSession.totalCashOut = (s.currentSession.totalCashOut||0) + cashAmt;
                if(!s.currentSession.cashOuts) s.currentSession.cashOuts = [];
                s.currentSession.cashOuts.push({amount:cashAmt,at:Date.now(),spin:s.currentSession.spins.length,note:"onboarding restart"});
              }
            } else {
              // Fresh start
              s.currentSession = newSession(roulette, bankroll);
              s.gameSession = newSession(roulette, bankroll);
            }
          });
        }}
      />
    );
  }

  const totalInvested = sess.bankroll + (sess.totalBuyIn||0);
  const totalCashedOut = sess.totalCashOut||0;
  const pnlVal = sess.bankrollCurrent + totalCashedOut - totalInvested;
  const pnlColor = pnlVal>0?"#4ade80":pnlVal<0?"#f87171":"#e2e8f0";

  function tapNumber(val, fromTracker) {
    if(fromTracker) {
      setPrevSessState(JSON.parse(JSON.stringify(sess)));
      // Auto-start session clock on first tracked spin
      if(!sess.sessionStartedAt) {
        updSess(s=>{ s.sessionStartedAt=Date.now(); });
      }
    }
    const trackResults=[]; let totalDelta=0;
    updSess(s => {
      s.spins.push(val);
      const nd={...s.droughts}; Object.keys(nd).forEach(k=>nd[k]++); nd[val]=0; s.droughts=nd;
      if(!fromTracker) return;
      s.tracks.forEach(t => {
        if(t.state!=="active") return;
        const tbl=computeTableForTrack(t);
        if(t.type==="fibonacci") {
          const dts=t.config.dozenTargets||[], cts=t.config.colTargets||[], evts=t.config.evenTargets||[];
          const betMode=t.config.betMode||"progression";
          // Auto-martingale when even money targets selected
          const effectiveBetMode = betMode==="flat" ? "flat" : (evts.length>0 ? "martingale" : "progression");
          const row=tbl[Math.min(t.level,tbl.length-1)];
          const isZ=val==="0"||val==="00";

          // Determine hit
          let hitCount=0;
          if(!isZ) {
            if(evts.length>0) {
              evts.forEach(key=>{const em=EVEN_MONEY.find(e=>e.key===key);if(em&&em.pred(+val))hitCount++;});
            } else {
              if(dts.includes(dozenOf(val)))hitCount++;
              if(cts.includes(colOf(val)))hitCount++;
            }
          }
          const isHit=hitCount>0;
          const payMult=evts.length>0?2:3;
          const numTargets=evts.length>0?evts.length:(dts.length+cts.length)||1;

          if(effectiveBetMode==="flat") {
            // No progression -- level stays 0
            if(isHit) {
              const profit=hitCount*payMult-numTargets;
              t.pnl+=profit; t.wins++;
              t.bets.push({spinIdx:s.spins.length-1,level:0,outcome:"win",profit,cat:"win"});
              totalDelta+=profit*(t.config.unit||1);
              trackResults.push({name:TRACK_ICONS[t.type]+" Flat",color:t.color,profit,unit:t.config.unit||1,outcome:"Win",cat:"win"});
            } else {
              t.pnl-=numTargets;
              t.bets.push({spinIdx:s.spins.length-1,level:0,outcome:"loss",profit:-numTargets,cat:"loss"});
              totalDelta-=numTargets*(t.config.unit||1);
              trackResults.push({name:TRACK_ICONS[t.type]+" Flat",color:t.color,profit:-numTargets,unit:t.config.unit||1,outcome:"Miss",cat:"loss"});
            }
          } else {
            // Progression or Martingale
            const cat=isZ?"loss":getCategory(val,dts,cts,row,evts);
            if(cat!=="loss") {
              const profit=hitCount*payMult*(row?row.c:1)-(row?row.totalInvest:0);
              const spinDelta=hitCount*payMult*(row?row.c:1)-(row?row.c:1)*numTargets;
              t.pnl+=spinDelta; t.wins++; t.sequences++; t.level=0;
              t.bets.push({spinIdx:s.spins.length-1,level:t.level,outcome:"win",profit,cat});
              totalDelta+=spinDelta*(t.config.unit||1);
              trackResults.push({name:TRACK_ICONS[t.type]+(effectiveBetMode==="martingale"?" Martingale":effectiveBetMode==="flat"?" Flat":" Prog"),color:t.color,profit,unit:t.config.unit||1,outcome:cat==="jackpot"?"Jackpot!":"Win",cat});
            } else {
              const betChips=(row?row.c:1)*numTargets;
              t.pnl-=betChips;
              t.bets.push({spinIdx:s.spins.length-1,level:t.level,outcome:"loss",profit:-betChips,cat:"loss"});
              const bc=betChips*(t.config.unit||1);
              totalDelta-=bc;
              if(t.level<tbl.length-1) t.level++; else{ t.state="closed"; t.closedAtSpin=s.spins.length-1; }
              trackResults.push({name:TRACK_ICONS[t.type]+(effectiveBetMode==="martingale"?" Martingale":" Prog"),color:t.color,profit:-(row?row.c:1),unit:t.config.unit||1,outcome:"Miss",cat:"loss"});
            }
          }
        }
        if(t.type==="solution") {
          const bets=t.config.activeBets||[]; const resolved=[];
          bets.forEach(b => {
            if(b.number===val) {
              const row=tbl[Math.min(b.level,tbl.length-1)];
              const winDelta=row?(row.ret-row.c):0;
              const profit=row?row.profit:0;
              t.pnl+=winDelta; t.wins++; t.sequences++; resolved.push(b.number);
              totalDelta+=winDelta*(t.config.unit||1);
              t.bets.push({spinIdx:s.spins.length-1,level:b.level,outcome:"win",profit,cat:"win"});
              trackResults.push({name:TRACK_ICONS[t.type]+" #"+b.number,color:t.color,profit,unit:t.config.unit||1,outcome:"Win",cat:"win"});
            } else {
              const lossCost=(tbl[Math.min(b.level,tbl.length-1)]?tbl[Math.min(b.level,tbl.length-1)].c:1);
              t.pnl-=lossCost;
              b.level=Math.min(b.level+1,tbl.length-1);
              trackResults.push({name:TRACK_ICONS[t.type]+" #"+b.number,color:t.color,profit:-lossCost,unit:t.config.unit||1,outcome:"Miss",cat:"loss"});
              totalDelta-=lossCost*(t.config.unit||1);
            }
          });
          t.config.activeBets=bets.filter(b=>!resolved.includes(b.number));
        }
      });
      s.bankrollCurrent = Math.round((s.bankrollCurrent + totalDelta)*100)/100;
    });
    if(trackResults.length>0) { setResult({val,trackResults,totalDelta}); setLastSpinDelta(totalDelta); }
    // Visual flash
    setFlashNum(val);
    setTimeout(()=>setFlashNum(null), 400);
    // Haptic vibration
    if(settings.vibration!==false && navigator.vibrate) {
      navigator.vibrate(totalDelta>0 ? [30,20,80] : totalDelta<0 ? 40 : 20);
    }
  }

  function doBuyIn(amount) {
    updSess(s => {
      s.bankrollCurrent=Math.round((s.bankrollCurrent+amount)*100)/100;
      s.totalBuyIn=(s.totalBuyIn||0)+amount;
      if(!s.buyIns) s.buyIns=[];
      s.buyIns.push({amount,at:Date.now(),spin:s.spins.length});
    });
  }

  function doCashOut(amount) {
    updSess(s => {
      s.bankrollCurrent=Math.round((s.bankrollCurrent-amount)*100)/100;
      s.totalCashOut=(s.totalCashOut||0)+amount;
      if(!s.cashOuts) s.cashOuts=[];
      s.cashOuts.push({amount,at:Date.now(),spin:s.spins.length});
    });
  }

  function changeCurrency(newCode, mode) {
    updApp(s => {
      const oldCode = s.settings.currency;
      s.settings.currency = newCode;
      if(mode==="convert" && oldCode!==newCode) {
        const ratio = getCur(newCode).rate / getCur(oldCode).rate;
        ["currentSession","gameSession"].forEach(function(sk){
          if(!s[sk]) return;
          s[sk].bankroll = Math.round(s[sk].bankroll*ratio*100)/100;
          s[sk].bankrollCurrent = Math.round(s[sk].bankrollCurrent*ratio*100)/100;
          s[sk].totalBuyIn = Math.round((s[sk].totalBuyIn||0)*ratio*100)/100;
          s[sk].tracks.forEach(t => {
            t.config.stopLoss = Math.round(t.config.stopLoss*ratio*100)/100;
          });
        });
      }
    });
  }

  function addTrack(type, config) { updSess(s=>{s.tracks.push(newTrack(type,nextColorIdx,config));}); setAddOpen(false); setPendingTrackType("fibonacci"); setPendingTrackCfg(defaultFibCfg()); }
  function undoLastSpin() {
    if(!prevSessState) return;
    if(!window.confirm("Undo last tracked spin? This reverses the bankroll and progression but session time continues.")) return;
    const preservedStart = sess.sessionStartedAt;
    updApp(s => {
      s[sessKey] = prevSessState;
      s[sessKey].sessionStartedAt = preservedStart;
    });
    setPrevSessState(null);
  }
  function reactivateTrack(id) {
    updSess(s=>{
      const t=s.tracks.find(x=>x.id===id);
      if(t){ t.state="active"; }
    });
    setTab(0);
    setHighlightTrackId(id);
    setTimeout(()=>setHighlightTrackId(null), 2000);
  }
  function moveTrack(fromId, toId) {
    updSess(s=>{
      const fi=s.tracks.findIndex(t=>t.id===fromId);
      const ti=s.tracks.findIndex(t=>t.id===toId);
      if(fi>=0&&ti>=0&&fi!==ti){const [item]=s.tracks.splice(fi,1);s.tracks.splice(ti,0,item);}
    });
  }
  function updateTrackConfig(id, newCfg) {
    updSess(s=>{
      const t=s.tracks.find(x=>x.id===id);
      if(!t) return;
      // Check if anything actually changed
      const changed = Object.keys(newCfg).some(k => JSON.stringify(newCfg[k]) !== JSON.stringify(t.config[k]));
      if(!changed) return;
      // Park the original track, create new variation as active
      t.state = "parked";
      const mergedCfg = {...t.config, ...newCfg, activeBets: []};
      const colorIdx = s.tracks.length % TRACK_COLORS.length;
      const nt = newTrack(t.type, colorIdx, mergedCfg);
      nt.state = "active";
      s.tracks.push(nt);
    });
    setEditTrackId(null);
  }
  function parkToggle(id) { updSess(s=>{const t=s.tracks.find(x=>x.id===id);if(t)t.state=t.state==="active"?"parked":"active";}); }
  function closeTrack(id) { updSess(s=>{const t=s.tracks.find(x=>x.id===id);if(t){t.state="closed";t.closedAtSpin=s.spins.length;}}); }
  function addSolBet(trackId, number) {
    updSess(s=>{
      const t=s.tracks.find(x=>x.id===trackId); if(!t||t.type!=="solution")return;
      const bets=t.config.activeBets||[];
      if(bets.find(b=>b.number===number)) t.config.activeBets=bets.filter(b=>b.number!==number);
      else t.config.activeBets=[...bets,{number,level:0,invest:0}];
    });
  }

  function autoExport(allSessions) {
    // Always save to Google Drive first if connected
    if(getDriveToken()) {
      const driveData = { ...appState, savedSessions: allSessions };
      driveSave(driveData).then(ok=>{
        setDriveSyncStatus(ok ? "connected" : "error");
        if(!ok) setTimeout(()=>setDriveSyncStatus("connected"), 3000);
      }).catch(()=>{
        setDriveSyncStatus("error");
        setTimeout(()=>setDriveSyncStatus("connected"), 3000);
      });
    }
    // Then attempt local download (user can cancel, won't affect cloud)
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        autoExport: true,
        sessions: allSessions.map(s=>({...s, metrics:computeMetrics(s)})),
        aggregate: {
          totalSessions: allSessions.length,
          totalSpins: allSessions.reduce((a,s)=>a+s.spins.length,0),
          netPnL: allSessions.reduce((a,s)=>a+(s.bankrollCurrent-s.bankroll),0)
        }
      };
      const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nexus-roulette-autosave-"+new Date().toISOString().slice(0,10)+".json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e) { /* silently fail if download blocked */ }
  }

  function saveSession() {
    let allSessions;
    updApp(s => {
      var sk = sessKey;
      s[sk].modified=Date.now();
      s[sk].mode=appMode;
      s[sk].metrics=computeMetrics(s[sk]);
      const idx=s.savedSessions.findIndex(x=>x.id===s[sk].id);
      if(idx>=0) s.savedSessions[idx]=JSON.parse(JSON.stringify(s[sk]));
      else s.savedSessions.push(JSON.parse(JSON.stringify(s[sk])));
      allSessions=s.savedSessions;
    });
    setTimeout(()=>autoExport(allSessions),300);
  }

  function endSession() {
    let allSessions;
    updApp(s => {
      var sk = sessKey;
      s[sk].sessionEndedAt = Date.now();
      s[sk].modified = Date.now();
      s[sk].mode=appMode;
      s[sk].metrics = computeMetrics(s[sk]);
      const idx = s.savedSessions.findIndex(x=>x.id===s[sk].id);
      if(idx>=0) s.savedSessions[idx]=JSON.parse(JSON.stringify(s[sk]));
      else s.savedSessions.push(JSON.parse(JSON.stringify(s[sk])));
      allSessions = s.savedSessions;
      s[sk] = newSession(s[sk].roulette, s[sk].bankrollCurrent);
    });
    setTimeout(()=>autoExport(allSessions),300);
    setTab(0);
  }

  function ghostSpin(val) {
    // Logs spin for drought tracking only -- no progression, no bankroll effect
    updSess(s => {
      s.spins.push(val);
      const nd={...s.droughts};
      Object.keys(nd).forEach(k=>nd[k]++);
      nd[val]=0;
      s.droughts=nd;
    });
    setFlashNum(val);
    setTimeout(()=>setFlashNum(null), 300);
    if(settings.vibration!==false && navigator.vibrate) navigator.vibrate(15);
  }

  function loadSession(id) {
    updApp(s=>{const f=s.savedSessions.find(x=>x.id===id);if(f)s.currentSession=JSON.parse(JSON.stringify(f));});
    setTab(0);
  }

  function tearSession() {
    if(!window.confirm("Tear this session?")) return;
    updApp(s=>{s.currentSession=newSession(s.currentSession.roulette,s.currentSession.bankroll);});
    setTab(0);
  }

  function newEmptySession() {
    updApp(s=>{s.currentSession=newSession("american",500);});
    setTab(0);
  }

  async function submitFeedback() {
    if(!feedbackText.trim()) return;
    const subject = encodeURIComponent("[Nexus Roulette Feedback] " + feedbackText.trim().slice(0, 60));
    const body = encodeURIComponent(feedbackText.trim() + "\n\n---\nv" + APP_VERSION + " · " + new Date().toLocaleString() + " · " + sess.spins.length + " spins");
    window.open("mailto:info@nexus-foundry.ai?subject=" + subject + "&body=" + body, "_self");
    setFeedbackText("");
    setFeedbackOpen(false);
  }

  function exportJSON() {
    const data={exportedAt:new Date().toISOString(),sessions:saved.map(s=>({...s,metrics:computeMetrics(s)})),aggregate:{totalSessions:saved.length,totalSpins:saved.reduce((a,s)=>a+s.spins.length,0),netPnL:saved.reduce((a,s)=>a+(s.bankrollCurrent-s.bankroll),0)}};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="nexus-roulette-export-"+Date.now()+".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function importJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          // Handle both export format (sessions) and drive backup format (appState/savedSessions)
          const sessions = data.sessions || data.savedSessions || (data.appState && data.appState.savedSessions) || [];
          if (!sessions.length) { alert("No sessions found in file."); return; }
          let added = 0, skipped = 0, lastAdded = null;
          updApp(s => {
            sessions.forEach(sess => {
              if (!s.savedSessions.find(x => x.id === sess.id)) {
                s.savedSessions.push(sess);
                added++;
                lastAdded = sess;
              } else {
                skipped++;
              }
            });
            // Load the most recent imported session as current (paused)
            if(lastAdded) {
              var loaded = JSON.parse(JSON.stringify(lastAdded));
              // Always end the session - don't auto-start after import
              if(loaded.sessionStartedAt) {
                loaded.sessionEndedAt = loaded.modified || Date.now();
              }
              // Park all tracks
              (loaded.tracks||[]).forEach(function(tr){ if(tr.state==="active") tr.state="parked"; });
              s.currentSession = loaded;
            }
          });
          setTab(0);
          alert(`Import complete!\n${added} session${added!==1?"s":""} added${skipped ? ", " + skipped + " already existed (skipped)" : ""}.\n\nLoaded "${lastAdded?lastAdded.name:""}".`);
        } catch(err) {
          alert("Failed to parse file: " + err.message);
        }
      };
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  // -- Game Page --
  function GamePage() {
    const recentSpins = [...sess.spins].reverse().slice(0,30);
    const hasActiveTracks = nonClosedTracks.some(t=>t.state==="active");
    const [manualBets, setManualBets] = useState([]);
    const [lastBets, setLastBets] = useState([]);
    const [betResults, setBetResults] = useState(null);
    const [undoStack, setUndoStack] = useState([]); // how many bets each action added
    const clearTimerRef = React.useRef(null);
    const tMin = settings.tableMinBet||1;

    const CHIPS = [
      {val:0.25,color:"#89CFF0",border:"#5BA3D9",label:"25¢"},
      {val:0.50,color:"#FFB6C1",border:"#E8929E",label:"50¢"},
      {val:1,color:"#ffffff",border:"#aaaaaa",label:"$1"},
      {val:5,color:"#ef4444",border:"#b91c1c",label:"$5"},
      {val:25,color:"#22c55e",border:"#15803d",label:"$25"},
      {val:100,color:"#1e293b",border:"#64748b",label:"$100"},
      {val:500,color:"#8b5cf6",border:"#6d28d9",label:"$500"},
    ].filter(c=>c.val>=tMin);

    const totalBetAmt = manualBets.reduce((s,b)=>s+b.amount,0);
    const canSpin = manualBets.length>0 || hasActiveTracks;

    function cancelPendingClear() {
      if(clearTimerRef.current) { clearTimeout(clearTimerRef.current); clearTimerRef.current=null; }
      if(betResults) { setBetResults(null); setManualBets([]); }
    }

    function placeBet(type, target) {
      if(gameSpinning) return;
      if(betResults) cancelPendingClear();
      setManualBets(prev=>[...prev,{id:Date.now()+Math.random(),type,target,amount:selectedChip}]);
      setUndoStack(prev=>[...prev,1]);
      if(settings.vibration!==false && navigator.vibrate) navigator.vibrate(10);
    }
    function undoBet() {
      if(betResults) return;
      setUndoStack(prev=>{
        if(prev.length===0) return prev;
        const count = prev[prev.length-1];
        setManualBets(mb=>mb.slice(0,-count));
        return prev.slice(0,-1);
      });
    }
    function clearBets() { setManualBets([]); setUndoStack([]); }
    function doubleBets() {
      if(betResults) return;
      setManualBets(prev=>{
        const doubled = prev.map(b=>({...b,id:Date.now()+Math.random()}));
        setUndoStack(us=>[...us,prev.length]);
        return [...prev,...doubled];
      });
    }
    function repeatBets() {
      if(lastBets.length===0) return;
      cancelPendingClear();
      const repeated = lastBets.map(b=>({...b,id:Date.now()+Math.random()}));
      setManualBets(repeated);
      setUndoStack([repeated.length]);
    }

    // Aggregate bets by position for display
    const boardBets = {};
    manualBets.forEach(b=>{
      const key = b.type==="straight"?"s:"+b.target:b.type+(b.target!==undefined?":"+b.target:"");
      boardBets[key] = (boardBets[key]||0) + b.amount;
    });

    function resolveManualBets(winVal) {
      const isZ = winVal==="0"||winVal==="00";
      const n = isZ?null:+winVal;
      var totalWin=0, totalBet=0;
      var posResults = {};
      manualBets.forEach(function(b){
        totalBet+=b.amount;
        var won=false;
        var posKey = b.type==="straight"?"s:"+b.target:b.type+(b.target!==undefined?":"+b.target:"");
        if(b.type==="straight"&&String(b.target)===winVal) won=true;
        if(!isZ&&n){
          if(b.type==="dozen") { var d=n<=12?0:n<=24?1:2; if(b.target===d) won=true; }
          if(b.type==="column") { var c=n%3===0?2:n%3===1?0:1; if(b.target===c) won=true; }
          if(b.type==="red"&&RED.has(n)) won=true;
          if(b.type==="black"&&!RED.has(n)) won=true;
          if(b.type==="odd"&&n%2===1) won=true;
          if(b.type==="even"&&n%2===0) won=true;
          if(b.type==="low"&&n<=18) won=true;
          if(b.type==="high"&&n>=19) won=true;
        }
        if(won){
          var pay = b.type==="straight"?b.amount*36:(b.type==="dozen"||b.type==="column")?b.amount*3:b.amount*2;
          totalWin+=pay;
          posResults[posKey]="won";
        } else {
          if(!posResults[posKey]) posResults[posKey]="lost";
        }
      });
      return {totalWin:totalWin,totalBet:totalBet,profit:totalWin-totalBet,posResults:posResults};
    }

    function doGameSpin() {
      if(gameSpinning||!canSpin||betResults) return;
      setGameSpinning(true);
      if(!sess.sessionStartedAt) updSess(s=>{s.sessionStartedAt=Date.now();});
      const nums = wheelNums;
      var ticks=0;
      const iv = setInterval(()=>{
        ticks++;
        setGameResult(nums[Math.floor(Math.random()*nums.length)]);
        if(ticks>=15){
          clearInterval(iv);
          const val = nums[Math.floor(Math.random()*nums.length)];
          setGameResult(val);
          if(hasActiveTracks) tapNumber(val, true);
          else { updSess(s=>{s.spins.push(val);const nd={...s.droughts};Object.keys(nd).forEach(k=>nd[k]++);nd[val]=0;s.droughts=nd;}); }
          if(manualBets.length>0){
            const res = resolveManualBets(val);
            updSess(s=>{s.bankrollCurrent=Math.round((s.bankrollCurrent+res.profit)*100)/100;});
            setLastSpinDelta(prev=>(prev||0)+res.profit);
            setBetResults(res.posResults);
            setLastBets([...manualBets]);
            setUndoStack([]);
            clearTimerRef.current = setTimeout(()=>{ setBetResults(null); setManualBets([]); clearTimerRef.current=null; },3000);
          } else {
            setLastBets([]);
          }
          if(settings.vibration!==false&&navigator.vibrate) navigator.vibrate(30);
          setTimeout(()=>setGameSpinning(false),300);
        }
      },70);
    }

    return (
      <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%"}}>

        {/* Spin result display */}
        <div style={{textAlign:"center",padding:"16px 0 8px"}}>
          {gameResult ? (()=>{
            const isZ=gameResult==="0"||gameResult==="00";
            const r=!isZ&&RED.has(+gameResult);
            return (
              <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:72,height:72,borderRadius:"50%",background:isZ?"#166534":r?"#991b1b":"#1e293b",border:"4px solid "+(isZ?"#4ade80":r?"#f87171":"#64748b"),fontSize:28,fontWeight:900,color:"white",animation:gameSpinning?"pulse 0.15s infinite":"none",boxShadow:"0 0 20px "+(isZ?"#16a34a55":r?"#ef444455":"#64748b33")}}>
                {gameResult}
              </div>
            );
          })() : (
            <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:72,height:72,borderRadius:"50%",background:"#1e2d3d",border:"4px solid #2d4057",fontSize:14,fontWeight:700,color:"#64748b"}}>--</div>
          )}
        </div>

        {/* Spin button */}
        <button onClick={doGameSpin} disabled={gameSpinning||!canSpin} style={{width:"100%",padding:"16px 0",borderRadius:14,border:"none",background:gameSpinning?"#374151":canSpin?"linear-gradient(135deg,#16a34a,#059669)":"#374151",color:"white",fontSize:18,fontWeight:900,cursor:gameSpinning||!canSpin?"not-allowed":"pointer",letterSpacing:1,opacity:gameSpinning?0.7:1}}>
          {gameSpinning?"Spinning...":"🎰 SPIN"}
        </button>

        {/* Chip selector */}
        <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap"}}>
          {CHIPS.map(c=>(
            <button key={c.val} onClick={()=>setSelectedChip(c.val)} style={{width:44,height:44,borderRadius:"50%",border:"3px solid "+(selectedChip===c.val?"#fbbf24":c.border),background:c.color,color:c.val>=100?"#ffffff":c.val<=0.5?"#1e293b":"#1e293b",fontSize:c.val<1?8:10,fontWeight:900,cursor:"pointer",boxShadow:selectedChip===c.val?"0 0 10px #fbbf24":"0 2px 4px rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",transition:"box-shadow 0.2s"}}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Bet controls */}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <button onClick={undoBet} disabled={manualBets.length===0||!!betResults} style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid #2d4057",background:"#0f1923",color:manualBets.length>0&&!betResults?"#60a5fa":"#374151",fontSize:10,fontWeight:700,cursor:manualBets.length>0&&!betResults?"pointer":"default"}}>↩ Undo</button>
          <button onClick={clearBets} disabled={manualBets.length===0||!!betResults} style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid #2d4057",background:"#0f1923",color:manualBets.length>0&&!betResults?"#f87171":"#374151",fontSize:10,fontWeight:700,cursor:manualBets.length>0&&!betResults?"pointer":"default"}}>✕ Clear</button>
          <button onClick={doubleBets} disabled={manualBets.length===0||!!betResults} style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid #2d4057",background:"#0f1923",color:manualBets.length>0&&!betResults?"#fbbf24":"#374151",fontSize:10,fontWeight:700,cursor:manualBets.length>0&&!betResults?"pointer":"default"}}>2× Double</button>
          <button onClick={repeatBets} disabled={lastBets.length===0} style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid #2d4057",background:"#0f1923",color:lastBets.length>0?"#86efac":"#374151",fontSize:10,fontWeight:700,cursor:lastBets.length>0?"pointer":"default"}}>♻ Repeat</button>
        </div>
        {totalBetAmt>0 && <div style={{textAlign:"center",fontSize:12,fontWeight:800,color:"#fbbf24"}}>Total Bet: {cur.symbol}{fmtNum(totalBetAmt)}</div>}

        {/* Roulette Table - interactive */}
        {(()=>{
          // Compute strategy outside bet highlights (labels, not individual numbers)
          const stratBets = {};
          nonClosedTracks.filter(t=>t.state==="active").forEach(t=>{
            if(t.type==="fibonacci") {
              const dts=t.config.dozenTargets||[], cts=t.config.colTargets||[], evts=t.config.evenTargets||[];
              dts.forEach(d=>{ stratBets["dozen:"+d]=t.color; });
              cts.forEach(c=>{ stratBets["column:"+c]=t.color; });
              evts.forEach(key=>{ stratBets[key]=t.color; });
            }
            if(t.type==="solution") {
              (t.config.activeBets||[]).forEach(b=>{ if(!stratBets["s:"+b.number]) stratBets["s:"+b.number]=t.color; });
            }
          });
          return <RouletteBoard roulette={sess.roulette} winningNumber={gameSpinning?null:gameResult} stratBets={stratBets} spinning={false} onBet={placeBet} boardBets={boardBets} chipColor={(CHIPS.find(c=>c.val===selectedChip)||CHIPS[0]).color} betResults={betResults}/>;
        })()}

        {/* Recent spins ticker */}
        {sess.spins.length>0 && (
          <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2,WebkitOverflowScrolling:"touch",width:"100%",maxWidth:"100%",minWidth:0,boxSizing:"border-box"}}>
            {recentSpins.map((val,i)=>{
              const isZ=val==="0"||val==="00", r=!isZ&&RED.has(+val);
              return(
                <div key={i} style={{flexShrink:0,width:28,height:28,borderRadius:6,background:isZ?"#166534":r?"#7f1d1d":"#0d1117",border:"2px solid "+(i===0?"#ffffff":isZ?"#22c55e":r?"#ef4444":"#374151"),color:isZ?"#bbf7d0":r?"#fecaca":"#f1f5f9",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {val}
                </div>
              );
            })}
          </div>
        )}

        {/* P&L Display */}
        {sess.spins.length>0 && (
          <div style={{display:"flex",gap:8,width:"100%"}}>
            <div style={{flex:1,background:pnlVal>=0?"#0a1f0a":"#200505",borderRadius:12,padding:"12px 10px",border:"1px solid "+(pnlVal>=0?"#16a34a":"#991b1b"),textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Session Profit</div>
              <div style={{fontSize:24,fontWeight:900,color:pnlVal>=0?"#4ade80":"#f87171"}}>{pnlVal>=0?"+":"-"}{cur.symbol}{fmtNum(pnlVal)}</div>
            </div>
            {lastSpinDelta!==null && (
              <div style={{width:100,background:lastSpinDelta>0?"#0a1f0a":lastSpinDelta<0?"#200505":"#0f1923",borderRadius:12,padding:"12px 10px",border:"1px solid "+(lastSpinDelta>0?"#16a34a":lastSpinDelta<0?"#991b1b":"#2d4057"),textAlign:"center"}}>
                <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Last Spin</div>
                <div style={{fontSize:20,fontWeight:900,color:lastSpinDelta>0?"#4ade80":lastSpinDelta<0?"#f87171":"#94a3b8"}}>{lastSpinDelta>0?"+":lastSpinDelta<0?"-":""}{cur.symbol}{fmtNum(lastSpinDelta)}</div>
              </div>
            )}
          </div>
        )}

        {/* Drought panel */}
        {sess.spins.length>0 && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:3}}>
              {emDroughts.map(em=>(
                <div key={em.key} style={{borderRadius:7,border:"1px solid "+(em.drought>=8?"#dc2626":em.drought>=5?"#f59e0b":"#2d4057"),background:em.drought>=8?"#200505":em.drought>=5?"#1c1000":"#0f1923",padding:"6px 2px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:em.color,fontWeight:700,textTransform:"uppercase"}}>{em.label}</div>
                  <div style={{fontSize:15,fontWeight:800,color:em.drought>=8?"#f87171":em.drought>=5?"#fbbf24":"#94a3b8"}}>{em.drought}</div>
                </div>
              ))}
            </div>
            <div style={{borderTop:"1px solid #2d4057",marginTop:2,paddingTop:6,display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"flex",gap:4}}>
                {[0,1,2].map(i=><DCard key={"d"+i} label={DZ_LABELS[i]} range={["1-12","13-24","25-36"][i]} drought={dozD[i]} colorBd={DZ_BD[i]} colorTx={DZ_TX[i]}/>)}
              </div>
              <div style={{display:"flex",gap:4}}>
                {[0,1,2].map(i=><DCard key={"c"+i} label={COL_LABELS[i]} range={["1,4..34","2,5..35","3,6..36"][i]} drought={colD[i]} colorBd={COL_BD[i]} colorTx={COL_TX[i]}/>)}
              </div>
            </div>
          </div>
        )}

        {/* Strategy tracks */}
        <Lbl>Strategy Tracks</Lbl>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {nonClosedTracks.map((t) => {
            const tbl=computeTableForTrack(t);
            const isEditing=editTrackId===t.id;
            const dolPnl=t.pnl*(t.config.unit||1);
            const row=tbl[Math.min(t.level,tbl.length-1)];
            return (
              <div key={t.id}>
                <div style={{background:"#0f1923",borderRadius:12,padding:"10px 12px",border:"2px solid "+(isEditing?"#60a5fa":t.color+"66")}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                    <span style={{fontSize:11,fontWeight:700,color:t.color,flex:1}}>{TRACK_ICONS[t.type]} {t.type==="fibonacci"?"Progression":"The Solution"}</span>
                    <span style={{fontSize:9,color:t.state==="active"?"#4ade80":"#fbbf24",fontWeight:700}}>[{t.state.toUpperCase()}]</span>
                    <span style={{fontSize:12,fontWeight:800,color:dolPnl>=0?"#4ade80":"#f87171"}}>{dolPnl>=0?"+":"-"}{cur.symbol}{fmtNum(dolPnl)}</span>
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:6}}>
                    <span style={{fontSize:10,color:"#94a3b8"}}>Lvl <strong style={{color:t.level>=10?"#f87171":t.level>=6?"#fbbf24":"#e2e8f0"}}>{t.level}</strong>/{tbl.length}</span>
                    {row && <span style={{fontSize:10,color:"#60a5fa"}}>Bet: {fmtChips(row.totalBet,t.config.unit,currency)}/spin</span>}
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>parkToggle(t.id)} style={{flex:1,padding:"4px 0",borderRadius:6,border:"1px solid #2d4057",background:t.state==="parked"?"#134e2a":"#1e2d3d",color:t.state==="parked"?"#4ade80":"#94a3b8",fontSize:9,fontWeight:700,cursor:"pointer"}}>{t.state==="parked"?"▶ Resume":"⏸ Park"}</button>
                    <button onClick={()=>setEditTrackId(isEditing?null:t.id)} style={{padding:"4px 8px",borderRadius:6,border:"1px solid "+(isEditing?"#60a5fa":"#1e3a5f"),background:isEditing?"#1e3a5f":"transparent",color:"#60a5fa",fontSize:9,cursor:"pointer"}}>✏️ Edit</button>
                    <button onClick={()=>{if(window.confirm("Close track?"))closeTrack(t.id);}} style={{padding:"4px 8px",borderRadius:6,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:9,cursor:"pointer"}}>×</button>
                  </div>
                </div>
                {isEditing && (
                  <EditTrackCfg track={t} currency={currency} tableMinBet={settings.tableMinBet||1} onSave={cfg=>updateTrackConfig(t.id,cfg)} onCancel={()=>setEditTrackId(null)}/>
                )}
              </div>
            );
          })}
          {!addOpen && (
            <button onClick={()=>setAddOpen(true)} style={{padding:"10px 0",borderRadius:12,border:"2px dashed #2d4057",background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer"}}>+ Add Strategy</button>
          )}
          {addOpen && <AddTrackPanel onAdd={addTrack} onClose={()=>setAddOpen(false)} nextColor={nextColorIdx} type={pendingTrackType} cfg={pendingTrackCfg} onTypeChange={(t)=>{setPendingTrackType(t);setPendingTrackCfg(t==="fibonacci"?defaultFibCfg():defaultSolCfg());}} onCfgChange={setPendingTrackCfg} closedTracks={sess.tracks.filter(t=>t.state==="closed")} currency={currency} tableMinBet={settings.tableMinBet||1}/>}
        </div>

        {/* Session controls */}
        {sess.sessionStartedAt && (
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={saveSession} style={{flex:1,padding:11,borderRadius:10,border:"none",background:"#16a34a",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
            <button onClick={()=>{if(window.confirm("End session and save?"))endSession();}} style={{flex:1,padding:11,borderRadius:10,border:"1px solid #7f1d1d",background:"#200505",color:"#f87171",fontSize:13,fontWeight:700,cursor:"pointer"}}>End Session</button>
          </div>
        )}
      </div>
    );
  }

  // -- Tracker Page --
  function TrackerPage() {
    const dts = primaryTrack&&primaryTrack.type==="fibonacci" ? primaryTrack.config.dozenTargets||[] : [];
    const cts = primaryTrack&&primaryTrack.type==="fibonacci" ? primaryTrack.config.colTargets||[] : [];
    const hasMix = dts.length>0&&cts.length>0;
    const row = primFibRow;
    const outcomes = row ? {
      partial:{ret:3*row.c,profit:3*row.c-row.totalInvest},
      jackpot:hasMix?{ret:6*row.c,profit:6*row.c-row.totalInvest}:null
    } : null;
    const solBets = primaryTrack&&primaryTrack.type==="solution" ? primaryTrack.config.activeBets||[] : [];
    const recentSpins = [...sess.spins].reverse().slice(0,30);

    return (
      <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%"}}>

        {/* Session clock */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0c1520",borderRadius:10,padding:"8px 14px",border:"1px solid #2d4057"}}>
          <div>
            {sess.sessionStartedAt
              ? <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",animation:"pulse 1.5s infinite"}}/>
                  <span style={{fontSize:12,color:"#94a3b8"}}>Session Active</span>
                  <SessionClock startedAt={sess.sessionStartedAt} pauseOffset={livePauseOffset} style={{fontSize:16,fontWeight:800,color:"#4ade80",fontVariantNumeric:"tabular-nums"}}/>
                </div>
              : <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#fbbf24"}}/>
                  <span style={{fontSize:12,color:"#fbbf24"}}>Catch-up Mode</span>
                  <span style={{fontSize:10,color:"#64748b"}}>-- spin any number to start session</span>
                </div>
            }
          </div>
          {sess.sessionStartedAt && (
            <button onClick={()=>{if(window.confirm("End session and save?"))endSession();}} style={{padding:"6px 12px",borderRadius:8,border:"1px solid #7f1d1d",background:"#200505",color:"#f87171",fontSize:11,fontWeight:700,cursor:"pointer"}}>■ End Session</button>
          )}
        </div>
        {sess.spins.length>0 && (
          <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2,WebkitOverflowScrolling:"touch"}}>
            {recentSpins.map((val,i)=>{
              const isZ=val==="0"||val==="00", r=!isZ&&RED.has(+val);
              const hitTracks=(trackOverlays||[]).filter(o=>{
                if(isZ)return false;
                if(o.type==="fibonacci")return (o.dozenTargets||[]).includes(dozenOf(val))||(o.colTargets||[]).includes(colOf(val));
                if(o.type==="solution")return (o.activeBets||[]).some(b=>b.number===val);
                return false;
              });
              const borderColor=i===0?"#ffffff":hitTracks.length>0?hitTracks[0].color:isZ?"#22c55e":r?"#ef4444":"#374151";
              return(
                <div key={i} style={{flexShrink:0,width:28,height:28,borderRadius:6,background:isZ?"#166534":r?"#7f1d1d":"#0d1117",border:"2px solid "+borderColor,color:isZ?"#bbf7d0":r?"#fecaca":"#f1f5f9",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {val}
                </div>
              );
            })}
          </div>
        )}

        {/* Drought panel */}
        {sess.spins.length>0 && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:3}}>
              {emDroughts.map(em=>(
                <div key={em.key} style={{borderRadius:7,border:"1px solid "+(em.drought>=8?"#dc2626":em.drought>=5?"#f59e0b":"#2d4057"),background:em.drought>=8?"#200505":em.drought>=5?"#1c1000":"#0f1923",padding:"6px 2px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:em.color,fontWeight:700,textTransform:"uppercase"}}>{em.label}</div>
                  <div style={{fontSize:15,fontWeight:800,color:em.drought>=8?"#f87171":em.drought>=5?"#fbbf24":"#94a3b8"}}>{em.drought}</div>
                </div>
              ))}
            </div>
            <div style={{borderTop:"1px solid #2d4057",marginTop:2,paddingTop:6,display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"flex",gap:4}}>
                {[0,1,2].map(i=><DCard key={"d"+i} label={DZ_LABELS[i]} range={["1-12","13-24","25-36"][i]} drought={dozD[i]} colorBd={DZ_BD[i]} colorTx={DZ_TX[i]}/>)}
              </div>
              <div style={{display:"flex",gap:4}}>
                {[0,1,2].map(i=><DCard key={"c"+i} label={COL_LABELS[i]} range={["1,4..34","2,5..35","3,6..36"][i]} drought={colD[i]} colorBd={COL_BD[i]} colorTx={COL_TX[i]}/>)}
              </div>
            </div>
          </div>
        )}

        {/* Track cards with drag-to-reorder */}
        <Lbl>Active Strategy Tracks</Lbl>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {nonClosedTracks.map((t,idx) => {
            const tbl=computeTableForTrack(t);
            const isSel=selectedTrackId===t.id;
            const isHighlight=highlightTrackId===t.id;
            const isDragging=draggingId===t.id;
            const isDragOver=dragOverId===t.id;
            const isEditing=editTrackId===t.id;
            const dolPnl=t.pnl*(t.config.unit||1);
            return (
              <div key={t.id}>
                <div
                  onTouchStart={e=>{if(e.target.dataset.handle){e.preventDefault();setDraggingId(t.id);}}}
                  onTouchMove={e=>{if(draggingId&&draggingId!==t.id){e.preventDefault();setDragOverId(t.id);}}}
                  onTouchEnd={()=>{if(draggingId&&dragOverId){moveTrack(draggingId,dragOverId);}setDraggingId(null);setDragOverId(null);}}
                  onClick={()=>setSelectedTrackId(isSel?null:t.id)}
                  style={{background:"#0f1923",borderRadius:12,padding:"10px 12px",border:"2px solid "+(isHighlight?"#ffffff":isEditing?"#60a5fa":isDragOver?"#60a5fa":isSel?t.color:"#2d4057"),cursor:"pointer",opacity:isDragging?0.4:1,transition:"border 0.3s,opacity 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span data-handle="1" style={{fontSize:14,color:"#374151",cursor:"grab",userSelect:"none",touchAction:"none",flexShrink:0}}>⠿</span>
                    <div style={{width:10,height:10,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                    <span style={{fontSize:11,fontWeight:700,color:t.color,flex:1}}>{TRACK_ICONS[t.type]} {t.type==="fibonacci"?"Progression Bet":"The Solution"}</span>
                    <span style={{fontSize:9,color:t.state==="active"?"#4ade80":t.state==="parked"?"#fbbf24":"#94a3b8",fontWeight:700}}>[{t.state.toUpperCase()}]</span>
                    <span style={{fontSize:12,fontWeight:800,color:dolPnl>=0?"#4ade80":"#f87171"}}>{dolPnl>=0?"+":"-"}{cur.symbol}{fmtNum(dolPnl)}</span>
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:6}}>
                    <span style={{fontSize:10,color:"#94a3b8"}}>Lvl <strong style={{color:t.level>=10?"#f87171":t.level>=6?"#fbbf24":"#e2e8f0"}}>{t.level}</strong>/{tbl.length}</span>
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={e=>{e.stopPropagation();parkToggle(t.id);}} style={{flex:1,padding:"4px 0",borderRadius:6,border:"1px solid #2d4057",background:t.state==="parked"?"#134e2a":"#1e2d3d",color:t.state==="parked"?"#4ade80":"#94a3b8",fontSize:9,fontWeight:700,cursor:"pointer"}}>{t.state==="parked"?"▶ Resume":"⏸ Park"}</button>
                    <button onClick={e=>{e.stopPropagation();setEditTrackId(isEditing?null:t.id);}} style={{padding:"4px 8px",borderRadius:6,border:"1px solid "+(isEditing?"#60a5fa":"#1e3a5f"),background:isEditing?"#1e3a5f":"transparent",color:"#60a5fa",fontSize:9,cursor:"pointer"}}>✏️ Edit</button>
                    <button onClick={e=>{e.stopPropagation();if(window.confirm("Close track?"))closeTrack(t.id);}} style={{padding:"4px 8px",borderRadius:6,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:9,cursor:"pointer"}}>×</button>
                  </div>
                </div>
                {isEditing && (
                  <EditTrackCfg track={t} currency={currency} tableMinBet={settings.tableMinBet||1} onSave={cfg=>updateTrackConfig(t.id,cfg)} onCancel={()=>setEditTrackId(null)}/>
                )}
              </div>
            );
          })}
          <div style={{display:"flex",gap:6}}>
            {!addOpen && (
              <button onClick={()=>setAddOpen(true)} style={{flex:1,padding:"10px 0",borderRadius:12,border:"2px dashed #2d4057",background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer"}}>+ Add Track</button>
            )}
            {prevSessState && (
              <button onClick={undoLastSpin} style={{padding:"10px 14px",borderRadius:12,border:"1px solid #f59e0b",background:"#1c1000",color:"#fbbf24",fontSize:12,fontWeight:700,cursor:"pointer"}}>↩ Undo</button>
            )}
          </div>
        </div>

        {addOpen && <AddTrackPanel onAdd={addTrack} onClose={()=>setAddOpen(false)} nextColor={nextColorIdx} type={pendingTrackType} cfg={pendingTrackCfg} onTypeChange={(t)=>{setPendingTrackType(t);setPendingTrackCfg(t==="fibonacci"?defaultFibCfg():defaultSolCfg());}} onCfgChange={setPendingTrackCfg} closedTracks={sess.tracks.filter(t=>t.state==="closed")} currency={currency} tableMinBet={settings.tableMinBet||1}/>}

        {!primaryTrack && !addOpen && (
          <div style={{background:"#1e2d3d",borderRadius:14,padding:"20px",textAlign:"center",border:"1px dashed #2d4057"}}>
            <div style={{fontSize:24,marginBottom:8}}>🎲</div>
            <div style={{color:"#64748b",fontSize:13,marginBottom:12}}>No active tracks yet</div>
            <button onClick={()=>setAddOpen(true)} style={{padding:"10px 20px",borderRadius:10,border:"none",background:"#16a34a",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add First Strategy</button>
          </div>
        )}

        {/* Solution candidates -- shown even without active Solution track */}
        {solCandidates.length>0 && (
          <Card>
            <Lbl>{"🎯 Solution Candidates ("+solCandidates.length+")"}</Lbl>
            <div style={{fontSize:10,color:"#64748b",marginBottom:6}}>Tap a number to start tracking it with The Solution</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {solCandidates.slice(0,20).map(num=>{
                const d=sess.droughts[num]||0;
                return(
                  <button key={num} onClick={()=>{setPendingTrackType("solution");setPendingTrackCfg({...defaultSolCfg(),activeBets:[{number:num,level:0}]});setAddOpen(true);}} style={{padding:"6px 8px",borderRadius:8,border:"1px solid #f59e0b",background:"#1c1000",cursor:"pointer",textAlign:"center",minWidth:44}}>
                    <div style={{fontSize:13,fontWeight:900,color:RED.has(+num)?"#f87171":"#f1f5f9"}}>{num}</div>
                    <div style={{fontSize:8,color:"#fbbf24",fontWeight:700}}>{d}sp</div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Dozen/Column droughts */}
        {sess.spins.length>0 && (
          <Card>
            <div style={{display:"flex",gap:5,marginBottom:6}}>
              {[0,1,2].map(i=><DCard key={i} label={DZ_LABELS[i]} range={["1-12","13-24","25-36"][i]} drought={dozD[i]} colorBd={DZ_BD[i]} colorTx={DZ_TX[i]}/>)}
            </div>
            <div style={{display:"flex",gap:5}}>
              {[0,1,2].map(i=><DCard key={i} label={COL_LABELS[i]} range={["1,4..34","2,5..35","3,6..36"][i]} drought={colD[i]} colorBd={COL_BD[i]} colorTx={COL_TX[i]}/>)}
            </div>
          </Card>
        )}

        {primaryTrack && primaryTrack.type==="fibonacci" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {hasMix && outcomes && outcomes.jackpot && (
              <div style={{background:"#1c1500",borderRadius:14,padding:12,border:"1px solid #f59e0b"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[{l:"JP Bet",v:row?fmtChips(row.totalBet,primaryTrack.config.unit,currency):"--",c:"#fbbf24"},{l:"JP Return",v:fmtMoney(outcomes.jackpot.ret*(primaryTrack.config.unit||1),currency),c:"#fbbf24"},{l:"JP Profit",v:(outcomes.jackpot.profit*(primaryTrack.config.unit||1)>=0?"+":"-")+cur.symbol+Math.abs(outcomes.jackpot.profit*(primaryTrack.config.unit||1)).toFixed(cur.dec),c:outcomes.jackpot.profit>=0?"#4ade80":"#f87171"}].map(({l,v,c}) => (
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{fontSize:8,color:"#78350f",textTransform:"uppercase",marginBottom:2}}>{l}</div>
                      <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:primaryTrack.color}}/>
                  <span style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1}}>Miss Level</span>
                </div>
                <span style={{fontSize:26,fontWeight:800,color:primaryTrack.level>=10?"#f87171":primaryTrack.level>=6?"#fbbf24":"#86efac"}}>
                  {primaryTrack.level}<span style={{fontSize:12,color:"#475569",fontWeight:400}}>/{primFibTbl.length}</span>
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[{l:"Bet/Spin",v:row?fmtChips(row.totalBet,primaryTrack.config.unit,currency):"--",c:"#60a5fa"},{l:"Total Spent",v:row?fmtChips(row.totalInvest,primaryTrack.config.unit,currency):"--",c:"#f87171"},{l:"Partial Win",v:outcomes?fmtMoney(outcomes.partial.ret*(primaryTrack.config.unit||1),currency):"--",c:"#a78bfa"},{l:"Partial Profit",v:outcomes?signChips(outcomes.partial.profit,primaryTrack.config.unit||1,currency):"--",c:outcomes&&outcomes.partial.profit>=0?"#4ade80":"#f97316"}].map(({l,v,c}) => (
                  <div key={l} style={{background:"#0f1923",borderRadius:10,padding:"10px 8px",textAlign:"center",border:"1px solid #2d4057"}}>
                    <div style={{fontSize:8,color:"#64748b",textTransform:"uppercase",marginBottom:2}}>{l}</div>
                    <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              <FibGrid onNumber={v=>tapNumber(v,true)} onGhost={ghostSpin} dozenTargets={dts} colTargets={cts} fibRow={row} trackOverlays={trackOverlays.filter(o=>o.id!==primaryTrack.id)} flashNum={flashNum}/>
              <div style={{textAlign:"center",fontSize:9,color:"#374151",marginTop:4}}>Long-press any number to log as ghost spin (no progression)</div>
              {primaryTrack.level>=primFibTbl.length-1&&primFibTbl.length>0 && (
                <div style={{marginTop:8,background:"#7f1d1d",borderRadius:8,padding:8,textAlign:"center",fontSize:11,color:"#fca5a5"}}>Stop loss reached!</div>
              )}
            </Card>
          </div>
        )}

        {primaryTrack && primaryTrack.type==="solution" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {solBets.length>0 && (
              <Card>
                <Lbl>Active Bets</Lbl>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {solBets.map(b => {
                    const row=solTable[Math.min(b.level,solTable.length-1)];
                    return (
                      <div key={b.number} style={{background:"#0f1923",borderRadius:10,padding:"10px 12px",border:"1px solid "+primaryTrack.color,textAlign:"center",minWidth:70}}>
                        <div style={{fontSize:18,fontWeight:900,color:RED.has(+b.number)?"#f87171":"#f1f5f9"}}>{b.number}</div>
                        <div style={{fontSize:9,color:"#64748b"}}>Lvl {b.level+1}</div>
                        <div style={{fontSize:11,color:"#60a5fa",fontWeight:700}}>{row?fmtChips(row.totalBet,primaryTrack.config.unit,currency):"--"}/spin</div>
                        <button onClick={()=>addSolBet(primaryTrack.id,b.number)} style={{marginTop:3,fontSize:8,background:"transparent",border:"1px solid #7f1d1d",borderRadius:4,color:"#f87171",padding:"2px 5px",cursor:"pointer"}}>×</button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            <Card>
              <Lbl>{inRange.length>0?inRange.length+" numbers at or past entry":"No numbers in range yet"}</Lbl>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {inRange.map(num => {
                  const d=sess.droughts[num]||0, isAct=solBets.some(b=>b.number===num);
                  const over=d-solEntryThreshold, deep=d>solEntryThreshold+solTable.length;
                  return (
                    <button key={num} onClick={()=>addSolBet(primaryTrack.id,num)} style={{padding:"7px 9px",borderRadius:9,cursor:"pointer",textAlign:"center",minWidth:48,border:(isAct?"2":"1")+"px solid "+(isAct?primaryTrack.color:deep?"#dc2626":"#f59e0b"),background:isAct?"#0d2a0d":deep?"#200505":"#1c1000"}}>
                      <div style={{fontSize:14,fontWeight:900,color:RED.has(+num)?"#f87171":"#f1f5f9"}}>{num}</div>
                      <div style={{fontSize:8,color:deep?"#f87171":"#fbbf24",fontWeight:700}}>+{over}</div>
                    </button>
                  );
                })}
              </div>
            </Card>
            <Card>
              <Lbl>Tap Winning Number</Lbl>
              <SolGrid onNumber={v=>tapNumber(v,true)} droughts={sess.droughts} entry={solEntryThreshold} maxLvl={solTable.length} activeBets={solBets} wheelNums={wheelNums} trackOverlays={trackOverlays.filter(o=>o.id!==primaryTrack.id)} flashNum={flashNum}/>
            </Card>
          </div>
        )}

        {nonClosedTracks.filter(t=>t.state==="active").length>0 && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>Abandon Progression</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {nonClosedTracks.filter(t=>t.state==="active").map(t=>{
                const tbl=computeTableForTrack(t);
                const row=tbl[Math.min(t.level,tbl.length-1)];
                return(
                  <button key={t.id} onClick={()=>{if(window.confirm(`Abandon progression at level ${t.level}?`))updSess(s=>{const tr=s.tracks.find(x=>x.id===t.id);if(tr){tr.pnl-=row?row.totalInvest:0;tr.bets.push({type:"abandon",level:tr.level});tr.level=0;}});}}
                    style={{flex:1,padding:"8px 10px",borderRadius:9,border:"1px solid "+(t.color+"66"),background:"#0f1923",color:t.color,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                    {TRACK_ICONS[t.type]} Lvl {t.level}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Roulette Table for Live Mode */}
        {(()=>{
          const tMin = settings.tableMinBet||1;
          const CHIPS = [
            {val:0.25,color:"#89CFF0",border:"#5BA3D9",label:"25¢"},
            {val:0.50,color:"#FFB6C1",border:"#E8929E",label:"50¢"},
            {val:1,color:"#ffffff",border:"#aaaaaa",label:"$1"},
            {val:5,color:"#ef4444",border:"#b91c1c",label:"$5"},
            {val:25,color:"#22c55e",border:"#15803d",label:"$25"},
            {val:100,color:"#1e293b",border:"#64748b",label:"$100"},
            {val:500,color:"#8b5cf6",border:"#6d28d9",label:"$500"},
          ].filter(c=>c.val>=tMin);

          const liveTotalBet = liveManualBets.reduce((s,b)=>s+b.amount,0);
          const liveBoardBets = {};
          liveManualBets.forEach(b=>{
            const key = b.type==="straight"?"s:"+b.target:b.type+(b.target!==undefined?":"+b.target:"");
            liveBoardBets[key] = (liveBoardBets[key]||0) + b.amount;
          });

          const stratBets = {};
          nonClosedTracks.filter(t=>t.state==="active").forEach(t=>{
            if(t.type==="fibonacci") {
              (t.config.dozenTargets||[]).forEach(d=>{ stratBets["dozen:"+d]=t.color; });
              (t.config.colTargets||[]).forEach(c=>{ stratBets["column:"+c]=t.color; });
              (t.config.evenTargets||[]).forEach(key=>{ stratBets[key]=t.color; });
            }
            if(t.type==="solution") {
              (t.config.activeBets||[]).forEach(b=>{ if(!stratBets["s:"+b.number]) stratBets["s:"+b.number]=t.color; });
            }
          });

          function livePlaceBet(type, target) {
            if(liveSelectingWinner) {
              // In winner selection mode - process the spin
              const val = type==="straight"?target:null;
              if(!val) return; // Can only select numbers as winners
              setLiveWinNumber(val);
              tapNumber(val, nonClosedTracks.some(t=>t.state==="active"));
              // Resolve manual bets
              if(liveManualBets.length>0){
                const isZ=val==="0"||val==="00";
                const n=isZ?null:+val;
                var totalWin=0,totalBet=0,posResults={};
                liveManualBets.forEach(function(b){
                  totalBet+=b.amount;
                  var won=false;
                  var posKey=b.type==="straight"?"s:"+b.target:b.type+(b.target!==undefined?":"+b.target:"");
                  if(b.type==="straight"&&String(b.target)===val) won=true;
                  if(!isZ&&n){
                    if(b.type==="dozen"){var d=n<=12?0:n<=24?1:2;if(b.target===d)won=true;}
                    if(b.type==="column"){var c=n%3===0?2:n%3===1?0:1;if(b.target===c)won=true;}
                    if(b.type==="red"&&RED.has(n))won=true;
                    if(b.type==="black"&&!RED.has(n))won=true;
                    if(b.type==="odd"&&n%2===1)won=true;
                    if(b.type==="even"&&n%2===0)won=true;
                    if(b.type==="low"&&n<=18)won=true;
                    if(b.type==="high"&&n>=19)won=true;
                  }
                  if(won){totalWin+=b.type==="straight"?b.amount*36:(b.type==="dozen"||b.type==="column")?b.amount*3:b.amount*2;posResults[posKey]="won";}
                  else{if(!posResults[posKey])posResults[posKey]="lost";}
                });
                updSess(s=>{s.bankrollCurrent=Math.round((s.bankrollCurrent+(totalWin-totalBet))*100)/100;});
                setLiveBetResults(posResults);
                setLiveLastBets([...liveManualBets]);
                setLiveUndoStack([]);
                liveClearTimerRef.current=setTimeout(()=>{setLiveBetResults(null);setLiveManualBets([]);liveClearTimerRef.current=null;},3000);
              }
              setLiveSelectingWinner(true);
              return;
            }
            // Normal bet placement mode
            if(liveBetResults){
              if(liveClearTimerRef.current){clearTimeout(liveClearTimerRef.current);liveClearTimerRef.current=null;}
              setLiveBetResults(null);setLiveManualBets([]);
            }
            setLiveWinNumber(null);
            setLiveManualBets(prev=>[...prev,{id:Date.now()+Math.random(),type,target,amount:selectedChip}]);
            setLiveUndoStack(prev=>[...prev,1]);
            if(settings.vibration!==false&&navigator.vibrate) navigator.vibrate(10);
          }

          function liveUndoBet(){
            if(liveBetResults)return;
            setLiveUndoStack(prev=>{
              if(prev.length===0)return prev;
              const count=prev[prev.length-1];
              setLiveManualBets(mb=>mb.slice(0,-count));
              return prev.slice(0,-1);
            });
          }
          function liveClearBets(){setLiveManualBets([]);setLiveUndoStack([]);}
          function liveDoubleBets(){
            if(liveBetResults)return;
            setLiveManualBets(prev=>{
              setLiveUndoStack(us=>[...us,prev.length]);
              return[...prev,...prev.map(b=>({...b,id:Date.now()+Math.random()}))];
            });
          }
          function liveRepeatBets(){
            if(liveLastBets.length===0)return;
            if(liveClearTimerRef.current){clearTimeout(liveClearTimerRef.current);liveClearTimerRef.current=null;}
            if(liveBetResults){setLiveBetResults(null);setLiveManualBets([]);}
            const repeated=liveLastBets.map(b=>({...b,id:Date.now()+Math.random()}));
            setLiveManualBets(repeated);setLiveUndoStack([repeated.length]);
          }

          return (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {/* Chip selector */}
              <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap"}}>
                {CHIPS.map(c=>(
                  <button key={c.val} onClick={()=>{setSelectedChip(c.val);setLiveSelectingWinner(false);}} style={{width:40,height:40,borderRadius:"50%",border:"3px solid "+(selectedChip===c.val&&!liveSelectingWinner?"#fbbf24":c.border),background:c.color,color:c.val>=100?"#fff":c.val<=0.5?"#1e293b":"#1e293b",fontSize:c.val<1?7:9,fontWeight:900,cursor:"pointer",boxShadow:selectedChip===c.val&&!liveSelectingWinner?"0 0 10px #fbbf24":"0 2px 4px rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {c.label}
                  </button>
                ))}
              </div>
              {/* Bet controls */}
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <button onClick={liveUndoBet} disabled={liveManualBets.length===0||!!liveBetResults} style={{flex:1,padding:"7px 0",borderRadius:8,border:"1px solid #2d4057",background:"#0f1923",color:liveManualBets.length>0&&!liveBetResults?"#60a5fa":"#374151",fontSize:9,fontWeight:700}}>↩ Undo</button>
                <button onClick={liveClearBets} disabled={liveManualBets.length===0||!!liveBetResults} style={{flex:1,padding:"7px 0",borderRadius:8,border:"1px solid #2d4057",background:"#0f1923",color:liveManualBets.length>0&&!liveBetResults?"#f87171":"#374151",fontSize:9,fontWeight:700}}>✕ Clear</button>
                <button onClick={liveDoubleBets} disabled={liveManualBets.length===0||!!liveBetResults} style={{flex:1,padding:"7px 0",borderRadius:8,border:"1px solid #2d4057",background:"#0f1923",color:liveManualBets.length>0&&!liveBetResults?"#fbbf24":"#374151",fontSize:9,fontWeight:700}}>2× Dbl</button>
                <button onClick={liveRepeatBets} disabled={liveLastBets.length===0} style={{flex:1,padding:"7px 0",borderRadius:8,border:"1px solid #2d4057",background:"#0f1923",color:liveLastBets.length>0?"#86efac":"#374151",fontSize:9,fontWeight:700}}>♻ Rpt</button>
              </div>
              {liveTotalBet>0 && <div style={{textAlign:"center",fontSize:11,fontWeight:800,color:"#fbbf24"}}>Total Bet: {cur.symbol}{fmtNum(liveTotalBet)}</div>}
              {/* Choose Winning Number button */}
              <button onClick={()=>setLiveSelectingWinner(!liveSelectingWinner)} style={{width:"100%",padding:"14px 0",borderRadius:12,border:liveSelectingWinner?"2px solid #fbbf24":"2px solid #2d4057",background:liveSelectingWinner?"linear-gradient(135deg,#92400e,#78350f)":"#0f1923",color:liveSelectingWinner?"#fbbf24":"#94a3b8",fontSize:14,fontWeight:800,cursor:"pointer"}}>
                {liveSelectingWinner?"👆 Tap the winning number...":"🎯 Choose Winning Number"}
              </button>
              {/* Roulette Board */}
              <RouletteBoard roulette={sess.roulette} winningNumber={liveWinNumber} stratBets={stratBets} spinning={false} onBet={livePlaceBet} boardBets={liveBoardBets} chipColor={(CHIPS.find(c=>c.val===selectedChip)||CHIPS[0]).color} betResults={liveBetResults}/>
              <div style={{textAlign:"center",fontSize:9,color:"#475569"}}>{liveSelectingWinner?"Tap a number on the table to record the spin result":"Tap table to place bets, then Choose Winning Number"}</div>
            </div>
          );
        })()}

      </div>
    );
  }
  function TablePage() {
    const selTrack = sess.tracks.find(t=>t.id===selectedTrackId) || nonClosedTracks[0] || null;
    if(!selTrack) return <div style={{background:"#1e2d3d",borderRadius:14,padding:"30px 20px",textAlign:"center",border:"1px dashed #2d4057",color:"#64748b",fontSize:13}}>Add a track to see the progression table</div>;
    const tbl = computeTableForTrack(selTrack);
    const hasMix = selTrack.type==="fibonacci"&&(selTrack.config.dozenTargets||[]).length>0&&(selTrack.config.colTargets||[]).length>0;
    const unit = selTrack.config.unit||1;
    const headers = hasMix ? ["#","Bet","Invested","PW Ret","PW Profit","JP Ret","JP Profit"] : ["#","Bet","Invested","Return","Profit","ROI"];
    const hColors = ["#94a3b8","#60a5fa","#f87171","#a78bfa","#4ade80","#fbbf24","#fbbf24"];
    const gridCols = hasMix ? "22px 1fr 1fr 1fr 1fr 1fr 1fr" : "22px 1fr 1fr 1fr 1fr 1fr";
    const legendRows = hasMix
      ? [["#","Level #"],["Bet","Total wagered this spin"],["Invested","Cumulative total spent"],["PW Ret","Return if 1 bet hits"],["PW Profit","Profit on partial win"],["JP Ret","Return if dozen AND column hit"],["JP Profit","Profit on jackpot"]]
      : [["#","Level #"],["Bet","Total wagered this spin"],["Invested","Cumulative total spent"],["Return","Gross payout if you win"],["Profit","Net profit after all invested"],["ROI","Profit divided by invested"]];

    return (
      <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%"}}>
        {nonClosedTracks.length>1 && (
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
            {nonClosedTracks.map(t => (
              <button key={t.id} onClick={()=>setSelectedTrackId(t.id)} style={{padding:"7px 12px",borderRadius:9,border:"2px solid "+(selectedTrackId===t.id?t.color:"#2d4057"),background:selectedTrackId===t.id?"#0f1923":"transparent",color:selectedTrackId===t.id?t.color:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                {TRACK_ICONS[t.type]} {t.type==="fibonacci"?"Fib":"Sol"}
              </button>
            ))}
          </div>
        )}
        <Card>
          <div style={{fontSize:10,color:"#64748b",marginBottom:8}}>
            <span style={{color:selTrack.color}}>•</span> {selTrack.type==="fibonacci"?((selTrack.config.dozenTargets||[]).map(d=>DZ_LABELS[d]).join("+")+((selTrack.config.colTargets||[]).length>0?" + "+(selTrack.config.colTargets||[]).map(c=>COL_LABELS[c]).join("+"):"")+" · "+selTrack.config.roi+"% ROI"):"Single # · "+selTrack.config.roi+"% ROI"} · {tbl.length} levels · {cur.symbol}{selTrack.config.stopLoss} stop
          </div>
          <div style={{background:"#0f1923",borderRadius:8,padding:"8px 10px",marginBottom:8,border:"1px solid #2d4057",display:"flex",flexDirection:"column",gap:3}}>
            {legendRows.map(([abbr,desc]) => (
              <div key={abbr} style={{display:"flex",gap:6}}>
                <span style={{fontSize:9,fontWeight:800,color:"#86efac",minWidth:55}}>{abbr}</span>
                <span style={{fontSize:9,color:"#475569"}}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:gridCols,gap:2,marginBottom:4}}>
            {headers.map((c,i) => <div key={c} style={{fontSize:8,color:hColors[i],textTransform:"uppercase",textAlign:i===0?"center":"right",fontWeight:700}}>{c}</div>)}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:"55vh",overflowY:"auto"}}>
            {tbl.map((r,i) => {
              const isA=i===selTrack.level, isP=i<selTrack.level;
              const pw=3*r.c-r.totalInvest, jp=hasMix?6*r.c-r.totalInvest:null;
              const cols = hasMix
                ? [cur.symbol+(r.totalBet*unit).toFixed(cur.dec),cur.symbol+(r.totalInvest*unit).toFixed(cur.dec),cur.symbol+(3*r.c*unit).toFixed(cur.dec),(pw*unit>=0?"+":"-")+cur.symbol+Math.abs(pw*unit).toFixed(cur.dec),cur.symbol+(6*r.c*unit).toFixed(cur.dec),jp!==null?(jp*unit>=0?"+":"-")+cur.symbol+Math.abs(jp*unit).toFixed(cur.dec):"--"]
                : [cur.symbol+(r.totalBet*unit).toFixed(cur.dec),cur.symbol+(r.totalInvest*unit).toFixed(cur.dec),cur.symbol+(r.ret*unit).toFixed(cur.dec),(r.profit*unit>=0?"+":"-")+cur.symbol+Math.abs(r.profit*unit).toFixed(cur.dec),r.roi.toFixed(1)+"%"];
              const rowColors = hasMix ? ["#60a5fa","#f87171","#a78bfa",pw>=0?"#4ade80":"#f97316","#fbbf24",jp!==null&&jp>=0?"#fbbf24":"#f87171"] : ["#60a5fa","#f87171","#a78bfa",r.profit>=0?"#4ade80":"#f97316","#86efac"];
              return (
                <div key={r.level} style={{display:"grid",gridTemplateColumns:gridCols,gap:2,padding:"5px 4px",borderRadius:6,background:isA?"#134e2a":isP?"#0f1923":"transparent",border:"1px solid "+(isA?"#4ade80":isP?"#1e2d3d":"#2d4057"),opacity:isP?0.4:1}}>
                  <div style={{textAlign:"center",fontWeight:800,fontSize:10,color:isA?"#4ade80":r.level>=10?"#f87171":r.level>=6?"#fbbf24":"#94a3b8"}}>{r.level}</div>
                  {cols.map((v,ci) => <div key={ci} style={{textAlign:"right",fontSize:9,color:rowColors[ci],fontWeight:600}}>{v}</div>)}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  // -- Spin Log Page --
  function SpinPage() {
    const [showAll, setShowAll] = useState(false);
    const displaySpins = showAll ? [...sess.spins].reverse() : [...sess.spins].reverse().slice(0,60);
    return (
      <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%"}}>
        <Card>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,color:"#64748b",flex:1}}>Total Spins: <strong style={{color:"#e2e8f0"}}>{sess.spins.length}</strong></span>
            {sess.spins.length>0 && <button onClick={()=>{if(window.confirm("Clear all spins from session history?"))updSess(s=>{s.spins=[];s.droughts=initDroughts(s.roulette);});}} style={{padding:"6px 12px",borderRadius:8,border:"1px solid #7f1d1d",background:"#1e2d3d",color:"#f87171",fontSize:12,cursor:"pointer"}}>Clear History</button>}
          </div>
          {sess.spins.length===0
            ? <div style={{textAlign:"center",padding:"20px 0",color:"#475569",fontSize:12}}>No spins logged yet. Enter numbers on the Tracker tab.</div>
            : (
              <>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {displaySpins.map((val,i)=>{
                    const isZ=val==="0"||val==="00", r=!isZ&&RED.has(+val);
                    const hitTracks=(trackOverlays||[]).filter(o=>{
                      if(isZ)return false;
                      if(o.type==="fibonacci")return (o.dozenTargets||[]).includes(dozenOf(val))||(o.colTargets||[]).includes(colOf(val));
                      if(o.type==="solution")return (o.activeBets||[]).some(b=>b.number===val);
                      return false;
                    });
                    const borderColor=i===0?"#ffffff":hitTracks.length>0?hitTracks[0].color:isZ?"#22c55e":r?"#ef4444":"#1f2937";
                    return(
                      <div key={i} style={{width:30,height:30,borderRadius:6,background:isZ?"#166534":r?"#7f1d1d":"#0d1117",border:"2px solid "+borderColor,color:isZ?"#bbf7d0":r?"#fecaca":"#f1f5f9",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {val}
                      </div>
                    );
                  })}
                </div>
                {sess.spins.length>60 && (
                  <button onClick={()=>setShowAll(v=>!v)} style={{marginTop:8,width:"100%",padding:"7px 0",borderRadius:8,border:"1px solid #2d4057",background:"transparent",color:"#60a5fa",fontSize:12,cursor:"pointer"}}>
                    {showAll?"Show less":"Show all "+sess.spins.length+" spins"}
                  </button>
                )}
              </>
            )
          }
        </Card>
      </div>
    );
  }

  // -- Session Stats Page --
  function StatsPage() {
    // Group tracks by type + roi + stopLoss for consolidated view
    const trackGroups = useMemo(() => {
      const groups = {};
      sess.tracks.forEach(t => {
        const key = `${t.type}|${t.config.roi}|${t.config.stopLoss}|${t.config.unit}`;
        if(!groups[key]) groups[key] = {key, type:t.type, roi:t.config.roi, stopLoss:t.config.stopLoss, unit:t.config.unit||1, tracks:[], totalPnl:0, wins:0, losses:0, lastTargets:null};
        const g = groups[key];
        g.tracks.push(t);
        g.totalPnl += t.pnl*(t.config.unit||1);
        g.wins += t.bets.filter(b=>b.outcome==="win").length;
        g.losses += t.bets.filter(b=>b.outcome==="loss").length;
        // Track last targets used
        if(t.type==="fibonacci") g.lastTargets = {doz:t.config.dozenTargets||[], col:t.config.colTargets||[]};
      });
      return Object.values(groups);
    }, [sess.tracks]);

    return (
      <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%"}}>
        <Card>
          <Lbl>Current Session</Lbl>
          <div style={{fontSize:13,color:"#e2e8f0",fontWeight:700,marginBottom:4}}>{sess.name}</div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>{new Date(sess.created).toLocaleString()} · {sess.spins.length} spins · {sess.tracks.length} tracks</div>
          {sess.sessionStartedAt && (
            <div style={{background:"#0c1520",borderRadius:9,padding:"8px 12px",border:"1px solid #2d4057",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:"#64748b"}}>Session Time</span>
              <SessionClock startedAt={sess.sessionStartedAt} endedAt={sess.sessionEndedAt} pauseOffset={livePauseOffset} style={{fontSize:14,fontWeight:800,color:"#4ade80",fontVariantNumeric:"tabular-nums"}}/>
              {(()=>{
                const hrs=((sess.sessionEndedAt||Date.now())-sess.sessionStartedAt)/3600000;
                const rate=hrs>0.01?pnlVal/hrs:null;
                return rate!==null?(
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:10,color:"#64748b"}}>$/hr</div>
                    <div style={{fontSize:14,fontWeight:800,color:rate>=0?"#4ade80":"#f87171"}}>{rate>=0?"+":"-"}{cur.symbol}{Math.abs(rate).toFixed(cur.dec)}</div>
                  </div>
                ):null;
              })()}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[
              {l:"Initial Bankroll",v:fmtMoney(sess.bankroll,currency),c:"#60a5fa"},
              {l:"Current",v:fmtMoney(sess.bankrollCurrent,currency),c:"#60a5fa"},
              {l:"Total Buy Ins",v:"+"+fmtMoney(sess.totalBuyIn||0,currency),c:"#a78bfa"},
              {l:"Total Cash Outs",v:sess.totalCashOut>0?fmtMoney(sess.totalCashOut||0,currency):fmtMoney(0,currency),c:"#f97316"},
              {l:"Net Money In",v:fmtMoney((sess.totalBuyIn||0)-(sess.totalCashOut||0),currency),c:(sess.totalBuyIn||0)>=(sess.totalCashOut||0)?"#f87171":"#4ade80"},
              {l:"Net P&L",v:(pnlVal>=0?"+":"-")+cur.symbol+fmtNum(pnlVal),c:pnlColor},
            ].map(({l,v,c}) => (
              <div key={l} style={{background:"#0f1923",borderRadius:10,padding:"10px 8px",border:"1px solid #2d4057",textAlign:"center"}}>
                <div style={{fontSize:8,color:"#64748b",textTransform:"uppercase",marginBottom:3}}>{l}</div>
                <div style={{fontSize:15,fontWeight:800,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveSession} style={{flex:1,padding:11,borderRadius:10,border:"none",background:"#16a34a",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
            <button onClick={newEmptySession} style={{flex:1,padding:11,borderRadius:10,border:"1px solid #2d4057",background:"#1e2d3d",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>New</button>
            <button onClick={tearSession} style={{flex:1,padding:11,borderRadius:10,border:"1px solid #7f1d1d",background:"#1e2d3d",color:"#f87171",fontSize:13,cursor:"pointer"}}>Tear</button>
          </div>
        </Card>

        {trackGroups.length>0 && (
          <Card>
            <Lbl>Strategy Performance</Lbl>
            {trackGroups.map(g => {
              const winRate=g.wins+g.losses>0?(g.wins/(g.wins+g.losses)*100).toFixed(0)+"%":"--";
              const hasInactive=g.tracks.some(t=>t.state==="closed"||t.state==="parked");
              const closedInGroup=g.tracks.filter(t=>t.state==="closed");
              const parkedInGroup=g.tracks.filter(t=>t.state==="parked");
              const activeInGroup=g.tracks.filter(t=>t.state==="active");
              const typeLabel=g.type==="fibonacci"?"🎲 Progression Bet":"🎯 Solution";
              const targetLabel=g.type==="fibonacci"&&g.lastTargets
                ?((g.lastTargets.doz||[]).map(d=>DZ_LABELS[d]).join("+")+(g.lastTargets.col&&g.lastTargets.col.length>0?" + "+(g.lastTargets.col.map(c=>COL_LABELS[c]).join("+")):""))
                :"";
              return(
                <div key={g.key} style={{background:"#0f1923",borderRadius:10,padding:"12px",border:"1px solid #2d4057",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:800,color:"#e2e8f0"}}>{typeLabel} · {g.roi}% ROI · {cur.symbol}{g.stopLoss} stop</div>
                      {targetLabel&&<div style={{fontSize:10,color:"#64748b",marginTop:1}}>{targetLabel} · {cur.symbol}{g.unit.toFixed(2)}/chip</div>}
                      <div style={{fontSize:10,color:"#64748b",marginTop:2}}>
                        {activeInGroup.length>0&&<span style={{color:"#4ade80"}}>{activeInGroup.length} active </span>}
                        {parkedInGroup.length>0&&<span style={{color:"#fbbf24"}}>{parkedInGroup.length} parked </span>}
                        {closedInGroup.length>0&&<span style={{color:"#64748b"}}>{closedInGroup.length} closed</span>}
                      </div>
                    </div>
                    <div style={{fontSize:16,fontWeight:800,color:g.totalPnl>=0?"#4ade80":"#f87171"}}>{g.totalPnl>=0?"+":"-"}{cur.symbol}{Math.abs(g.totalPnl).toFixed(cur.dec)}</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                    {[["Wins",g.wins,"#4ade80"],["Losses",g.losses,"#f87171"],["Win Rate",winRate,"#86efac"]].map(([l,v,c])=>(
                      <div key={l} style={{textAlign:"center"}}>
                        <div style={{fontSize:8,color:"#64748b",textTransform:"uppercase"}}>{l}</div>
                        <div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {(closedInGroup.length>0||parkedInGroup.length>0) && (
                    <div style={{display:"flex",gap:6}}>
                      {closedInGroup.slice(-1).map(t=>(
                        <button key={t.id} onClick={()=>reactivateTrack(t.id)} style={{flex:1,padding:"7px 0",borderRadius:8,border:"1px solid #16a34a",background:"#0d2a0d",color:"#4ade80",fontSize:11,fontWeight:700,cursor:"pointer"}}>▶ Restart Closed</button>
                      ))}
                      {parkedInGroup.map(t=>(
                        <button key={t.id} onClick={()=>reactivateTrack(t.id)} style={{flex:1,padding:"7px 0",borderRadius:8,border:"1px solid #fbbf24",background:"#1c1000",color:"#fbbf24",fontSize:11,fontWeight:700,cursor:"pointer"}}>▶ Resume Parked</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}

        <Card>
          <Lbl>{"Saved Sessions ("+saved.length+")"}</Lbl>
          {saved.length===0
            ? <div style={{textAlign:"center",padding:"16px 0",color:"#475569",fontSize:12}}>No saved sessions yet.</div>
            : (
              <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:"40vh",overflowY:"auto"}}>
                {[...saved].reverse().map(s => {
                  const si=s.totalBuyIn||0, ti=s.bankroll+si;
                  const pnl=s.bankrollCurrent-ti, isCurrent=s.id===sess.id;
                  return (
                    <div key={s.id} style={{background:"#0f1923",borderRadius:10,padding:"10px 12px",border:"1px solid "+(isCurrent?"#86efac":"#2d4057")}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:isCurrent?"#86efac":"#e2e8f0"}}>{s.name}{isCurrent?" (current)":""}</div>
                          <div style={{fontSize:10,color:"#64748b"}}>
                            {new Date(s.modified).toLocaleString()} · {s.spins.length} spins
                            {s.sessionStartedAt&&s.sessionEndedAt&&(
                              <span> · {formatElapsed(s.sessionEndedAt-s.sessionStartedAt)}</span>
                            )}
                          </div>
                        </div>
                        <div style={{fontSize:13,fontWeight:800,color:pnl>=0?"#4ade80":"#f87171"}}>{pnl>=0?"+":"-"}{cur.symbol}{Math.abs(pnl).toFixed(cur.dec)}</div>
                      </div>
                      {!isCurrent && <button onClick={()=>loadSession(s.id)} style={{width:"100%",padding:"7px 0",borderRadius:8,border:"1px solid #2d4057",background:"#1e2d3d",color:"#94a3b8",fontSize:12,cursor:"pointer"}}>Resume</button>}
                    </div>
                  );
                })}
              </div>
            )
          }
        </Card>

        {saved.length>0 && (
          <Card>
            <button onClick={exportJSON} style={{width:"100%",padding:"12px 0",borderRadius:10,border:"none",background:"#1e3a5f",color:"#60a5fa",fontSize:13,fontWeight:700,cursor:"pointer"}}>Export All Sessions (.json)</button>
          </Card>
        )}
      </div>
    );
  }

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
                  }catch(e){alert("Sign in failed: "+e.message);}
                }
              }} style={{padding:"7px 14px",borderRadius:8,border:"none",background:getDriveToken()?"#374151":"#16a34a",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                {getDriveToken()?"Disconnect":"Connect"}
              </button>
            </div>
            {getDriveToken() && (
              <div style={{display:"flex",gap:6,marginTop:8}}>
                <button onClick={async()=>{
                  setDriveSyncStatus("syncing");
                  try{
                    const ok = await driveSave(appState);
                    setDriveSyncStatus(ok?"connected":"error");
                    if(ok) alert("Backup saved to Google Drive!");
                    else alert("Drive save failed — unknown error");
                  }catch(e){
                    setDriveSyncStatus("error");
                    alert("Drive save failed:\n"+e.message);
                  }
                }} style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid #22c55e",background:"transparent",color:"#4ade80",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  ☁️ Backup Now
                </button>
                <button onClick={async()=>{
                  if(!window.confirm("Restore from Google Drive? This will replace all local session data.")) return;
                  setDriveSyncStatus("restoring");
                  try{
                    const data = await driveRestore();
                    if(data && data.savedSessions && data.savedSessions.length > 0) {
                      // End active session and park all tracks - don't auto-start after restore
                      if(data.currentSession && data.currentSession.sessionStartedAt) {
                        data.currentSession.sessionEndedAt = data.currentSession.modified || Date.now();
                      }
                      if(data.currentSession && data.currentSession.tracks) {
                        data.currentSession.tracks.forEach(function(tr){ if(tr.state==="active") tr.state="parked"; });
                      }
                      setAppState(data);
                      saveApp(data);
                      setDriveSyncStatus("connected");
                      alert("Restored "+data.savedSessions.length+" sessions from Google Drive!");
                    } else {
                      setDriveSyncStatus("connected");
                      alert("No backup found on Google Drive.");
                    }
                  }catch(e){setDriveSyncStatus("connected");alert("Restore failed: "+e.message);}
                }} style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid #60a5fa",background:"transparent",color:"#60a5fa",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  📥 Restore from Cloud
                </button>
              </div>
            )}
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

  // -- Root --
  const TABS = ["Tracker","Full Table","Spin Log","Stats","Settings"];

  return (
    <div style={{minHeight:"100vh",background:"#0f1923",color:"#e2e8f0",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{width:"100%",maxWidth:460,margin:"0 auto",display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"16px 14px 80px",boxSizing:"border-box"}}>

        {/* Header */}
        <div style={{width:"100%",textAlign:"center"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:4}}>
            <RouletteIcon size={28}/>
            <h1 style={{margin:0,fontSize:18,color:"#86efac",letterSpacing:1}}>Nexus Roulette Tracker</h1>
          </div>
          {/* Mode Toggle */}
          <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:6,marginBottom:2}}>
            <button onClick={()=>setAppMode("game")} style={{padding:"5px 16px",borderRadius:20,border:"none",background:appMode==="game"?"#7c3aed":"#1e2d3d",color:appMode==="game"?"white":"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>🎮 Game</button>
            <button onClick={()=>setAppMode("live")} style={{padding:"5px 16px",borderRadius:20,border:"none",background:appMode==="live"?"#16a34a":"#1e2d3d",color:appMode==="live"?"white":"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>🎰 Live</button>
            <button onClick={()=>setAppMode("sim")} style={{padding:"5px 16px",borderRadius:20,border:"none",background:appMode==="sim"?"#c2410c":"#1e2d3d",color:appMode==="sim"?"white":"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>🔬 Experimental{simRunning&&!simDone?" ⏳":simDone?" ✅":""}</button>
          </div>
          {(appMode==="live"||appMode==="game") && (
            <div>
              <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12,marginTop:4,flexWrap:"wrap"}}>
                <button onClick={()=>setEditBankroll(true)} style={{fontSize:12,color:"#64748b",background:"transparent",border:"none",cursor:"pointer",padding:0}}>
                  Bank: <strong style={{color:"#60a5fa"}}>{fmtMoney(sess.bankrollCurrent,currency)}</strong> <span style={{fontSize:9,color:"#334155"}}>✏️</span>
                </button>
                <span style={{fontSize:12,color:"#64748b"}}>Profit: <strong style={{color:pnlColor}}>{pnlVal>=0?"+":"-"}{cur.symbol}{fmtNum(pnlVal)}</strong></span>
                <span style={{fontSize:12,color:"#64748b"}}>Spins: <strong style={{color:"#e2e8f0"}}>{sess.spins.length}</strong></span>
              </div>
              <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"center"}}>
                <button onClick={()=>setBuyInOpen(true)} style={{padding:"8px 20px",borderRadius:20,border:"none",background:"#16a34a",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>💰 Buy In</button>
                <button onClick={()=>setCashOutOpen(true)} style={{padding:"8px 20px",borderRadius:20,border:"none",background:"#c2410c",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>💸 Cash Out</button>
              </div>
            </div>
          )}
        </div>

        {/* Update banner */}
        {updateAvailable && (
          <button onClick={()=>{
            saveApp(appState);
            // Force-clear service worker cache, then reload
            if('serviceWorker' in navigator) {
              caches.keys().then(function(keys){
                Promise.all(keys.map(function(k){return caches.delete(k);})).then(function(){
                  navigator.serviceWorker.getRegistrations().then(function(regs){
                    Promise.all(regs.map(function(r){return r.unregister();})).then(function(){
                      window.location.href = window.location.pathname + "?update=" + Date.now();
                    });
                  });
                });
              });
            } else {
              window.location.href = window.location.pathname + "?update=" + Date.now();
            }
          }} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"2px solid #7c3aed",background:"linear-gradient(135deg,#1e1040,#2d1060)",color:"white",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <div style={{flex:1,textAlign:"left"}}>
              <div style={{fontSize:13,fontWeight:800}}>🎉 Update Available — v{updateAvailable.version}</div>
              {updateAvailable.notes && <div style={{fontSize:11,color:"#e9d5ff",marginTop:4,lineHeight:1.4}}>{updateAvailable.notes}</div>}
              <div style={{fontSize:10,color:"#c4b5fd",marginTop:3}}>Tap to update. No data will be lost.</div>
            </div>
            <span style={{fontSize:22}}>↻</span>
          </button>
        )}

        {/* Version badge */}
        <div style={{fontSize:9,color:"#374151",textAlign:"center"}}>v{APP_VERSION}</div>

        {appMode==="sim" && <SimModePage simCfg={simCfg} setSimCfg={setSimCfg} simRunning={simRunning} setSimRunning={setSimRunning} simPaused={simPaused} setSimPaused={setSimPaused} simProgress={simProgress} setSimProgress={setSimProgress} simResults={simResults} setSimResults={setSimResults} simDone={simDone} setSimDone={setSimDone} simStopRef={simStopRef} currency={currency} cur={cur}/>}

        {appMode==="game" && <GamePage/>}

        {appMode==="live" && (
          <div style={{width:"100%",minWidth:0,overflow:"hidden"}}>
            {/* Statistical context bar -- informed by sim results if available */}
            {simDone && simResults && sess.tracks.length>0 && (
              <StatContextBar simResults={simResults} simCfg={simCfg} sess={sess} cur={cur} pnlVal={pnlVal}/>
            )}
            {/* Tabs */}
            <div style={{display:"flex",background:"#1e2d3d",borderRadius:12,padding:4,width:"100%",overflowX:"auto",marginBottom:0}}>
              {TABS.map((t,i) => (
                <button key={t} onClick={()=>setTab(i)} style={{flex:1,padding:"9px 2px",borderRadius:9,border:"none",cursor:"pointer",background:tab===i?"#134e2a":"transparent",color:tab===i?"#86efac":"#64748b",fontSize:9,fontWeight:700,whiteSpace:"nowrap"}}>{t}</button>
              ))}
            </div>
            {tab===0 && <TrackerPage/>}
            {tab===1 && <TablePage/>}
            {tab===2 && <SpinPage/>}
            {tab===3 && <StatsPage/>}
            {tab===4 && <SettingsPage/>}
          </div>
        )}

      {/* Modals */}
      {result && <ResultFlash result={result} onDismiss={()=>setResult(null)}/>}
      {buyInOpen && <BuyInModal defaultAmount={settings.defaultBuyIn||100} currency={currency} currentBankroll={sess.bankrollCurrent} onBuyIn={doBuyIn} onClose={()=>setBuyInOpen(false)}/>}
      {cashOutOpen && <CashOutModal maxAmount={sess.bankrollCurrent} currency={currency} currentBankroll={sess.bankrollCurrent} onCashOut={doCashOut} onClose={()=>setCashOutOpen(false)}/>}
      {currencyOpen && <CurrencyModal current={currency} bankroll={sess.bankrollCurrent} onSave={changeCurrency} onClose={()=>setCurrencyOpen(false)}/>}
      {changelogOpen && <ChangelogModal onClose={()=>setChangelogOpen(false)}/>}
      {editBankroll && <BankrollEdit onClose={()=>setEditBankroll(false)}/>}
      {hardResetOpen && <HardResetModal onClose={()=>setHardResetOpen(false)} onExport={exportJSON}/>}

      {/* Floating feedback button */}
      <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",top:12,left:12,width:36,height:36,borderRadius:"50%",border:"none",background:"#1e2d3d",color:"#94a3b8",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.4)",zIndex:900}}>🐛</button>

      {/* Feedback modal */}
      {feedbackOpen && (
        <Modal onClose={()=>setFeedbackOpen(false)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:17,fontWeight:800,color:"#e2e8f0"}}>🐛💡 Feedback</div>
            <button onClick={()=>setFeedbackOpen(false)} style={{background:"transparent",border:"none",color:"#64748b",fontSize:22,cursor:"pointer"}}>×</button>
          </div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:12,lineHeight:1.5}}>Found a bug? Have an idea to make the app better? Let us know! You can also use your phone's voice-to-text.</div>
          <textarea value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} placeholder="What's on your mind? Describe what's not working or what you'd like to see..." style={{width:"100%",minHeight:120,padding:12,borderRadius:10,border:"1px solid #2d4057",background:"#0f1923",color:"#e2e8f0",fontSize:14,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
          <button onClick={submitFeedback} disabled={!feedbackText.trim()} style={{width:"100%",marginTop:12,padding:"14px 0",borderRadius:12,border:"none",background:feedbackText.trim()?"#16a34a":"#374151",color:"white",fontSize:15,fontWeight:800,cursor:feedbackText.trim()?"pointer":"not-allowed"}}>
            Send Feedback
          </button>
        </Modal>
      )}
      </div>
    </div>
  );
}

// -- Statistical Context Bar --