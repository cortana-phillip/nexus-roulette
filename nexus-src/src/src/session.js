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
    droughtThreshold: null,    // park if best target drought < N (null = disabled)
    droughtPreset: null,       // "yellow"|"orange"|"red"|null
    waitForWin: false,         // don't enter until first in-range number wins
    parkAfterStopLoss: false,  // park after stop loss, resume after next win observed
    parkAfterLoss: false,      // park after any miss, resume next spin
    followTheLeader: false,    // auto-switch to highest-drought target each spin
  };
}

// Drought presets per bet type
const DROUGHT_PRESETS = {
  even:   { yellow:12, orange:20, red:30 },
  dozens: { yellow:4,  orange:7,  red:11 },
  cols:   { yellow:4,  orange:7,  red:11 },
};

// Return drought for a given outside bet key using droughts map
function targetDrought(key, droughts) {
  if(key==="red")   return Object.keys(droughts).filter(n=>RED.has(+n)).reduce((m,n)=>Math.min(m,droughts[n]||0), Infinity) === Infinity ? 0 : Object.keys(droughts).filter(n=>RED.has(+n)).reduce((m,n)=>Math.min(m,droughts[n]||0),Infinity);
  if(key==="black") return Object.keys(droughts).filter(n=>+n>0&&!RED.has(+n)&&n!=="00").reduce((m,n)=>Math.min(m,droughts[n]||0),Infinity);
  if(key==="odd")   return Object.keys(droughts).filter(n=>+n>0&&+n%2!==0).reduce((m,n)=>Math.min(m,droughts[n]||0),Infinity);
  if(key==="even")  return Object.keys(droughts).filter(n=>+n>0&&+n%2===0).reduce((m,n)=>Math.min(m,droughts[n]||0),Infinity);
  if(key==="high")  return Object.keys(droughts).filter(n=>+n>=19).reduce((m,n)=>Math.min(m,droughts[n]||0),Infinity);
  if(key==="low")   return Object.keys(droughts).filter(n=>+n>=1&&+n<=18).reduce((m,n)=>Math.min(m,droughts[n]||0),Infinity);
  return 0;
}

// For a dozen/column bet, drought = spins since any number in that group hit
function dozenDrought(d, droughts) {
  const nums = d===0?range(1,12):d===1?range(13,24):range(25,36);
  return Math.min(...nums.map(n=>droughts[String(n)]||0));
}
function colDrought(c, droughts) {
  const nums = Array.from({length:12},(_,i)=>c+1+i*3);
  return Math.min(...nums.map(n=>droughts[String(n)]||0));
}

// Pick the best target dynamically (Follow the Leader)
// Returns {dozenTargets, colTargets, evenTargets} based on highest drought
function resolveDynamicTargets(cfg, droughts) {
  const ftl = cfg.parkRules && cfg.parkRules.followTheLeader;
  if(!ftl) return { dozenTargets: cfg.dozenTargets||[], colTargets: cfg.colTargets||[], evenTargets: cfg.evenTargets||[] };

  const evts = cfg.evenTargets||[];
  const dts  = cfg.dozenTargets||[];
  const cts  = cfg.colTargets||[];

  // Even money Follow the Leader — pick best among same pair types configured
  if(evts.length > 0) {
    const pairs = [["red","black"],["odd","even"],["high","low"]];
    // Which pair types were originally configured?
    const usedPairs = pairs.filter(p=>evts.some(k=>p.includes(k)));
    // From each pair, pick the side with higher drought
    const best = usedPairs.map(([a,b])=>{
      const da=targetDrought(a,droughts), db=targetDrought(b,droughts);
      return da>=db?a:b;
    });
    return { dozenTargets:[], colTargets:[], evenTargets:best };
  }

  // Dozens Follow the Leader — pick N best dozens (N = original count)
  if(dts.length > 0 && cts.length === 0) {
    const sorted = [0,1,2].sort((a,b)=>dozenDrought(b,droughts)-dozenDrought(a,droughts));
    return { dozenTargets: sorted.slice(0,dts.length), colTargets:[], evenTargets:[] };
  }

  // Columns Follow the Leader
  if(cts.length > 0 && dts.length === 0) {
    const sorted = [0,1,2].sort((a,b)=>colDrought(b,droughts)-colDrought(a,droughts));
    return { dozenTargets:[], colTargets: sorted.slice(0,cts.length), evenTargets:[] };
  }

  // Mixed dozens+columns — pick 1 dozen and 1 column with highest droughts
  if(dts.length > 0 && cts.length > 0) {
    const bestD = [0,1,2].reduce((b,i)=>dozenDrought(i,droughts)>dozenDrought(b,droughts)?i:b,0);
    const bestC = [0,1,2].reduce((b,i)=>colDrought(i,droughts)>colDrought(b,droughts)?i:b,0);
    return { dozenTargets:[bestD], colTargets:[bestC], evenTargets:[] };
  }

  return { dozenTargets: dts, colTargets: cts, evenTargets: evts };
}

// Check if drought threshold is met for a given config + droughts
function meetsThreshold(cfg, droughts) {
  const rules = cfg.parkRules||{};
  if(!rules.droughtThreshold) return true;
  const type = cfg.ftlTargetType;
  const t = rules.droughtThreshold;

  // For FTL/dynamic mode, check best available target of the configured type
  if(rules.followTheLeader || type) {
    if(type==="even") {
      const pairs = [["red","black"],["odd","even"],["high","low"]];
      const best = Math.max(...pairs.map(([a,b])=>Math.max(targetDrought(a,droughts),targetDrought(b,droughts))));
      return best >= t;
    }
    if(type==="columns") return Math.max(...[0,1,2].map(c=>colDrought(c,droughts))) >= t;
    // dozens (default)
    return Math.max(...[0,1,2].map(d=>dozenDrought(d,droughts))) >= t;
  }

  // Static target mode: check only configured targets
  const evts=cfg.evenTargets||[], dts=cfg.dozenTargets||[], cts=cfg.colTargets||[];
  if(evts.length>0) {
    const pairs=[["red","black"],["odd","even"],["high","low"]];
    const usedPairs=pairs.filter(p=>evts.some(k=>p.includes(k)));
    return usedPairs.some(([a,b])=>Math.max(targetDrought(a,droughts),targetDrought(b,droughts))>=t);
  }
  const dzs = dts.map(d=>dozenDrought(d,droughts));
  const cls = cts.map(c=>colDrought(c,droughts));
  const all = [...dzs,...cls];
  return all.length===0 || Math.max(...all) >= t;
}
function defaultFibCfg() { return{type:"fibonacci",unit:1,roi:15,betMode:"progression",dozenTargets:[],colTargets:[],evenTargets:[],stopLoss:200,parkRules:defaultParkRules(),ftlTargetType:null,ftlCount:1}; }
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
    const d = JSON.parse(localStorage.getItem(KEY));
    if(d) {
      if(!d.settings) d.settings = defaultSettings();
      if(!d.settings.currency) d.settings.currency = "USD";
      if(!d.settings.defaultBuyIn) d.settings.defaultBuyIn = 100;
      if(d.settings.onboarded === undefined) d.settings.onboarded = true; // existing users skip
      if(d.settings.tableMinBet === undefined) d.settings.tableMinBet = 10;
      if(d.settings.tableMaxBet === undefined) d.settings.tableMaxBet = 500;
      if(d.settings.tableMaxTotal === undefined) d.settings.tableMaxTotal = 10000;
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
      return d;
    }
  } catch(e) {}
  return { savedSessions:[], currentSession:newSession(), settings:defaultSettings() };
}

function saveApp(state) { try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }

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
