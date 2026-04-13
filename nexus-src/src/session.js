// -- Session, Track, Settings Factories --
function newSession(roulette, bankroll) {
  return {
    id:uid(), name:"Session "+new Date().toLocaleDateString(),
    created:Date.now(), modified:Date.now(),
    roulette:roulette||"american", bankroll:bankroll||500,
    bankrollCurrent:bankroll||500, totalBuyIn:0, buyIns:[],
    spins:[], droughts:initDroughts(roulette||"american"), tracks:[], totalCashOut:0, cashOuts:[],
    sessionStartedAt:null, sessionEndedAt:null,
  };
}

function newTrack(type, colorIdx, config) {
  return {
    id:uid(), type, color:TRACK_COLORS[colorIdx%TRACK_COLORS.length],
    state:"active", config:{...config}, level:0, pnl:0, bets:[],
    createdAtSpin:0, closedAtSpin:null, wins:0, sequences:0,
  };
}

function defaultParkRules() {
  return {
    droughtThreshold: null,    // park if no target has drought >= N (null = disabled)
    waitForWin: false,         // don't enter until first in-range number wins
    parkAfterStopLoss: false,  // park after stop loss, resume after next observed win
    parkAfterLoss: false,      // park after any miss, resume next spin
  };
}
function defaultFibCfg() { return{type:"fibonacci",unit:1,roi:15,betMode:"progression",dozenTargets:[],colTargets:[],evenTargets:[],stopLoss:200,parkRules:defaultParkRules()}; }
function defaultSolCfg() { return{type:"solution",unit:1,roi:10,entryThreshold:120,stopLoss:200,activeBets:[],parkRules:defaultParkRules()}; }

function computeMartingaleTable(maxChips) {
  const rows=[]; let invest=0, c=1;
  for(let lvl=1;lvl<=30;lvl++) {
    const newInvest=invest+c;
    if(maxChips!==undefined&&newInvest>maxChips) break;
    const ret=2*c, profit=ret-newInvest;
    if(profit<=0) break;
    rows.push({level:lvl,c,totalBet:c,totalInvest:newInvest,ret,profit,roi:profit/newInvest*100});
    invest=newInvest; c*=2;
  }
  return rows;
}

function defaultSettings() {
  return{ currency:"USD", defaultBuyIn:100, onboarded:false, vibration:true, tableMinBet:10, tableMaxBet:500, tableMaxTotal:10000 };
}

function loadApp() {
  try {
    const raw = localStorage.getItem(KEY);
    if(!raw) { console.warn("NEXUS: No saved data found in localStorage (key="+KEY+")"); return { savedSessions:[], currentSession:newSession(), gameSession:newSession(), settings:defaultSettings() }; }
    const d = JSON.parse(raw);
    if(d) {
      if(!d.settings) d.settings = defaultSettings();
      if(!d.settings.currency) d.settings.currency = "USD";
      if(!d.settings.defaultBuyIn) d.settings.defaultBuyIn = 100;
      if(d.settings.onboarded === undefined) d.settings.onboarded = true; // existing users skip
      if(d.settings.tableMinBet === undefined) d.settings.tableMinBet = 10;
      if(d.settings.tableMaxBet === undefined) d.settings.tableMaxBet = 500;
      if(d.settings.tableMaxTotal === undefined) d.settings.tableMaxTotal = 10000;
      if(!d.currentSession) d.currentSession = newSession();
      if(!d.gameSession) d.gameSession = newSession(d.currentSession.roulette, d.currentSession.bankroll);
      if(!d.gameSession.totalBuyIn) d.gameSession.totalBuyIn = 0;
      if(!d.gameSession.buyIns) d.gameSession.buyIns = [];
      if(!d.gameSession.totalCashOut) d.gameSession.totalCashOut = 0;
      if(!d.gameSession.cashOuts) d.gameSession.cashOuts = [];
      if(!d.currentSession.totalBuyIn) d.currentSession.totalBuyIn = 0;
      if(!d.currentSession.buyIns) d.currentSession.buyIns = [];
      if(!d.currentSession.totalCashOut) d.currentSession.totalCashOut = 0;
      if(!d.currentSession.cashOuts) d.currentSession.cashOuts = [];
      if(d.currentSession.sessionStartedAt===undefined) d.currentSession.sessionStartedAt = null;
      if(d.currentSession.sessionEndedAt===undefined) d.currentSession.sessionEndedAt = null;
      // Auto-recalibrate bankroll from track P&Ls to fix any drift
      const sess = d.currentSession;
      sess.bankrollCurrent = Math.round((
        sess.bankroll +
        (sess.totalBuyIn||0) -
        (sess.totalCashOut||0) +
        (sess.tracks||[]).reduce((sum,t) => sum + t.pnl*(t.config.unit||1), 0)
      )*100)/100;
      console.log("NEXUS: Loaded "+((d.savedSessions||[]).length)+" saved sessions, current has "+sess.spins.length+" spins");
      return d;
    }
  } catch(e) { console.error("NEXUS: loadApp crashed:", e); }
  return { savedSessions:[], currentSession:newSession(), gameSession:newSession(), settings:defaultSettings() };
}

function saveApp(state) {
  try{
    localStorage.setItem(KEY, JSON.stringify(state));
  }catch(e){
    console.error("NEXUS: saveApp FAILED:", e);
    alert("WARNING: Could not save data to local storage! Your data may be lost. Error: "+e.message);
  }
}

function computeMetrics(session) {
  const perTrack = session.tracks.map(t => {
    const ws=t.bets.filter(b=>b.outcome==="win").length;
    const ls=t.bets.filter(b=>b.outcome==="loss").length;
    return{id:t.id,type:t.type,color:t.color,state:t.state,
      pnlDollars:t.pnl*(t.config.unit||1),totalBets:t.bets.length,
      wins:ws,losses:ls,winRate:t.bets.length>0?ws/t.bets.length:0,
      maxLevel:t.bets.reduce((m,b)=>Math.max(m,b.level),0),
      jackpots:t.bets.filter(b=>b.cat==="jackpot").length};
  });
  const totalInvested = session.bankroll + (session.totalBuyIn||0);
  return{spins:session.spins.length,netPnL:session.bankrollCurrent-totalInvested,
    bankrollStart:session.bankroll,bankrollCurrent:session.bankrollCurrent,
    totalBuyIn:session.totalBuyIn||0,perTrack};
}
