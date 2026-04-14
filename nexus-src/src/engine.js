// -- Game Engine: Math, Droughts, Table Calculations --

function countDrought(spins, predicate) {
  let count=0;
  for(let i=spins.length-1;i>=0;i--){
    const v=spins[i];
    if(v==="0"||v==="00"){count++;continue;}
    if(predicate(+v)) return count;
    count++;
  }
  return count;
}

function formatElapsed(ms) {
  const s=Math.floor(ms/1000);
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return h>0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${m}:${String(sec).padStart(2,'0')}`;
}

function computeTable(subsets, payoutMult, roiPct, maxChips) {
  const r=roiPct/100, denom=payoutMult-subsets*(1+r);
  if(denom<=0) return [];
  const rows=[]; let invest=0;
  for(let lvl=1;lvl<=500;lvl++) {
    const c=invest===0?1:Math.ceil(invest*(1+r)/denom);
    const tb=c*subsets;
    if(maxChips!==undefined&&invest+tb>maxChips) break;
    invest+=tb;
    const ret=c*payoutMult, profit=ret-invest;
    if(profit<=0) break;
    rows.push({level:lvl,c,totalBet:tb,totalInvest:invest,ret,profit,roi:profit/invest*100});
  }
  return rows;
}

function computeTableForTrack(t) {
  if(t.type==="custom") {
    var positions = t.config.positions||[];
    if(positions.length===0) return [];
    var baseTotalBet = positions.reduce(function(s,p){return s+p.baseAmount;},0);
    if(baseTotalBet===0) return [];
    // Compute min win payout across all winning numbers
    var minWinPayout = Infinity;
    var nums = ["0","00"];
    for(var i=1;i<=36;i++) nums.push(String(i));
    nums.forEach(function(numStr){
      var isZ = numStr==="0"||numStr==="00";
      var n = isZ?null:+numStr;
      var payout = 0;
      positions.forEach(function(p){
        var won=false;
        if(p.type==="straight"&&p.target===numStr) won=true;
        if(!isZ&&n){
          if(p.type==="dozen"){if((n<=12?0:n<=24?1:2)===p.target)won=true;}
          if(p.type==="column"){if((n%3===0?2:n%3===1?0:1)===p.target)won=true;}
          if(p.type==="red"&&RED.has(n))won=true;
          if(p.type==="black"&&!RED.has(n))won=true;
          if(p.type==="odd"&&n%2===1)won=true;
          if(p.type==="even"&&n%2===0)won=true;
          if(p.type==="low"&&n<=18)won=true;
          if(p.type==="high"&&n>=19)won=true;
        }
        if(won) payout += p.baseAmount*(p.type==="straight"?36:(p.type==="dozen"||p.type==="column")?3:2);
      });
      if(payout>0 && payout<minWinPayout) minWinPayout=payout;
    });
    if(minWinPayout===Infinity) return [];
    var betMode = t.config.betMode||"flat";
    var maxChips = t.config.stopLoss/(t.config.unit||1);
    if(betMode==="flat") {
      return [{level:1,c:1,totalBet:baseTotalBet,totalInvest:baseTotalBet,ret:minWinPayout,profit:minWinPayout-baseTotalBet,roi:(minWinPayout-baseTotalBet)/baseTotalBet*100,flat:true}];
    }
    return computeTable(baseTotalBet, minWinPayout, t.config.roi, maxChips);
  }
  if(t.type==="fibonacci") {
    const dts=t.config.dozenTargets||[], cts=t.config.colTargets||[], evts=t.config.evenTargets||[];
    const betMode=t.config.betMode||"progression";
    const effectiveBetMode = betMode==="flat" ? "flat" : (evts.length>0 ? "martingale" : "progression");
    const maxChips=t.config.stopLoss/(t.config.unit||1);
    if(effectiveBetMode==="flat") {
      const payMult=evts.length>0?2:3;
      const subs=evts.length>0?evts.length:(dts.length+cts.length)||1;
      return [{level:1,c:1,totalBet:subs,totalInvest:subs,ret:payMult,profit:payMult-subs,roi:(payMult-subs)/subs*100,flat:true}];
    }
    if(evts.length>0) {
      if(effectiveBetMode==="martingale") return computeMartingaleTable(maxChips);
      return computeTable(evts.length,2,t.config.roi,maxChips);
    }
    const subs=dts.length+cts.length, hasMix=dts.length>0&&cts.length>0;
    return computeTable(subs||1,hasMix?6:3,t.config.roi,maxChips);
  }
  return computeTable(1,36,t.config.roi,t.config.stopLoss/(t.config.unit||1));
}

function getCategory(val, dts, cts, row, evts) {
  if(val==="0"||val==="00") return "loss";
  const n=+val;
  if(evts&&evts.length>0) {
    const hits=evts.filter(key=>{const em=EVEN_MONEY.find(e=>e.key===key);return em&&em.pred(n);}).length;
    if(hits===0) return "loss";
    if(hits>=2) return "jackpot";
    return "win";
  }
  const inD=dts.includes(dozenOf(val)), inC=cts.includes(colOf(val));
  if(!inD&&!inC) return "loss";
  if(inD&&inC) return "jackpot";
  if(!row) return "win";
  const profit=3*row.c-row.totalInvest, pct=profit/row.totalInvest;
  if(pct>0.04) return "win";
  if(pct>-0.04) return "breakeven";
  return "partial-loss";
}

function droughtBadge(d) {
  if(d===0) return{t:"JUST HIT",c:"#4ade80"};
  if(d<=3)  return{t:"WARM",c:"#86efac"};
  if(d<=7)  return{t:"COOLING",c:"#fbbf24"};
  if(d<=12) return{t:"COLD",c:"#f97316"};
  return{t:"FROZEN",c:"#f87171"};
}

function numDroughtStyle(d, entry, maxLvl, isAct) {
  if(isAct) return{bg:"#0d2a0d",bd:"#4ade80",tx:"#4ade80"};
  if(d===0) return{bg:"#0a1a0a",bd:"#166534",tx:"#22c55e"};
  if(d<entry-30) return{bg:"#080808",bd:"#111827",tx:"#1f2937"};
  if(d<entry) { const p=(d-(entry-30))/30; return{bg:"#1a1000",bd:"rgba(245,158,11,"+(0.2+p*0.5)+")",tx:"rgba(251,191,36,"+(0.3+p*0.7)+")"}; }
  if(d<=entry+maxLvl) return{bg:"#1c1000",bd:"#f59e0b",tx:"#fbbf24"};
  return{bg:"#200505",bd:"#dc2626",tx:"#f87171"};
}

const catStyle = cat => {
  if(cat==="jackpot")      return{bd:"#fbbf24",tx:"#fbbf24",bg:"#1c1500"};
  if(cat==="win")          return{bd:"#4ade80",tx:"#4ade80",bg:"#0a1f0a"};
  if(cat==="breakeven")    return{bd:"#a3e635",tx:"#a3e635",bg:"#0d1a00"};
  if(cat==="partial-loss") return{bd:"#f97316",tx:"#f97316",bg:"#1a0a00"};
  return{bd:"#1f2937",tx:"#1f2937",bg:"#080808"};
};