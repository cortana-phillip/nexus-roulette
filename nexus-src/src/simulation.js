// -- Simulation Engine --
const EVEN_PREDS_SIM = {
  red:v=>RED.has(+v), black:v=>+v>=1&&+v<=36&&!RED.has(+v),
  odd:v=>+v>0&&+v%2===1, even:v=>+v>0&&+v%2===0,
  high:v=>+v>=19&&+v<=36, low:v=>+v>=1&&+v<=18
};
const SIM_COLORS=["#f59e0b","#2dd4bf","#a855f7","#f97316","#38bdf8","#4ade80","#f87171","#e879f9"];

function simBuildTable(cfg){
  const unit=cfg.unit||1,maxChips=cfg.stopLoss/unit;
  const evts=cfg.evenTargets||[],dts=cfg.dozenTargets||[],cts=cfg.colTargets||[];
  const eff=(cfg.betMode||"progression")==="flat"?"flat":(evts.length>0?"martingale":"progression");
  if(eff==="flat"){const pm=evts.length>0?2:3,subs=evts.length>0?evts.length:(dts.length+cts.length)||1;return[{level:1,c:1,totalBet:subs,totalInvest:subs,ret:pm,profit:pm-subs,flat:true}];}
  if(eff==="martingale"){const rows=[];let invest=0,c=1;for(let l=1;l<=30;l++){const ni=invest+c;if(maxChips!==undefined&&ni>maxChips)break;const ret=2*c,profit=ret-ni;if(profit<=0)break;rows.push({level:l,c,totalBet:c,totalInvest:ni,ret,profit});invest=ni;c*=2;}return rows;}
  const subs=(dts.length+cts.length)||1,hasMix=dts.length>0&&cts.length>0,pm=hasMix?6:3;
  const r=cfg.roi/100,denom=pm-subs*(1+r);if(denom<=0)return[];
  const rows=[];let invest=0;
  for(let l=1;l<=500;l++){const c=invest===0?1:Math.ceil(invest*(1+r)/denom);const tb=c*subs;if(maxChips!==undefined&&invest+tb>maxChips)break;invest+=tb;const ret=c*pm,profit=ret-invest;if(profit<=0)break;rows.push({level:l,c,totalBet:tb,totalInvest:invest,ret,profit});}
  return rows;
}

function simCheckHit(val,cfg){
  if(val==="0"||val==="00")return{hit:false,count:0};
  const evts=cfg.evenTargets||[];
  if(evts.length>0){const count=evts.filter(k=>EVEN_PREDS_SIM[k]&&EVEN_PREDS_SIM[k](val)).length;return{hit:count>0,count};}
  const dts=cfg.dozenTargets||[],cts=cfg.colTargets||[];
  let count=0;if(dts.includes(dozenOf(val)))count++;if(cts.includes(colOf(val)))count++;
  return{hit:count>0,count};
}

function simUpdStreak(st,o){
  if(o>0){if(st.streak>=0){st.streak++;}else{st.streaks.push(st.streak);st.streak=1;}if(st.streak>st.maxWin)st.maxWin=st.streak;}
  else{if(st.streak<=0){st.streak--;}else{st.streaks.push(st.streak);st.streak=-1;}if(Math.abs(st.streak)>st.maxLoss)st.maxLoss=Math.abs(st.streak);}
}

function simOneSession(strategies,params){
  const wn=params.wheelType==="european"?["0",...Array.from({length:36},(_,i)=>String(i+1))]:["0","00",...Array.from({length:36},(_,i)=>String(i+1))];
  const droughts={};wn.forEach(n=>droughts[n]=0);
  const states=strategies.map(cfg=>({
    cfg,table:simBuildTable(cfg),level:0,pnl:0,wins:0,losses:0,sequences:0,stopLossHits:0,
    streak:0,maxWin:0,maxLoss:0,streaks:[],pnlSeq:[],activeBets:[],
    waitForWin:!!(cfg.parkRules||[]).find(r=>r.type==="wait_for_win"&&r.enabled),
    parkAfterLoss:false,
  }));
  for(let s=0;s<params.spinsPerSession;s++){
    const val=wn[Math.floor(Math.random()*wn.length)];
    Object.keys(droughts).forEach(k=>droughts[k]++);droughts[val]=0;
    for(const st of states){
      if(st.cfg.type==="solution"){
        if(st.parkAfterLoss){if(droughts[val]+1>=(st.cfg.entryThreshold||120))st.parkAfterLoss=false;else continue;}
        if(st.waitForWin){if(droughts[val]+1>=(st.cfg.entryThreshold||120))st.waitForWin=false;else continue;}
        const entry=st.cfg.entryThreshold||120,unit=st.cfg.unit||1;
        Object.entries(droughts).forEach(([k,v])=>{if(k!=="0"&&k!=="00"&&v>=entry&&!st.activeBets.find(b=>b.number===k))st.activeBets.push({number:k,level:0});});
        const resolved=[];
        for(const bet of st.activeBets){
          const row=st.table[Math.min(bet.level,st.table.length-1)];
          if(val===bet.number){const profit=(row?row.profit:0)*unit;st.pnl+=profit;st.wins++;st.sequences++;st.pnlSeq.push(st.pnl);resolved.push(bet.number);simUpdStreak(st,1);st.parkAfterLoss=false;}
          else{st.pnl-=(row?row.c:1)*unit;bet.level++;if(bet.level>=st.table.length){st.stopLossHits++;st.losses++;st.sequences++;st.pnlSeq.push(st.pnl);resolved.push(bet.number);simUpdStreak(st,-1);if((st.cfg.parkRules||[]).find(r=>r.type==="wait_for_win"&&r.enabled))st.waitForWin=true;if((st.cfg.parkRules||[]).find(r=>r.type==="park_after_stop_loss"&&r.enabled))st.parkAfterLoss=true;}}
        }
        st.activeBets=st.activeBets.filter(b=>!resolved.includes(b.number));
      } else {
        let parked=false;
        if(st.parkAfterLoss){const{hit}=simCheckHit(val,st.cfg);if(hit)st.parkAfterLoss=false;else{parked=true;}}
        if(parked)continue;
        const{hit,count}=simCheckHit(val,st.cfg);
        const row=st.table[Math.min(st.level,st.table.length-1)];
        const unit=st.cfg.unit||1;
        const evts=st.cfg.evenTargets||[],eff=(st.cfg.betMode||"progression")==="flat"?"flat":(evts.length>0?"martingale":"progression");
        const numTargets=evts.length>0?evts.length:((st.cfg.dozenTargets||[]).length+(st.cfg.colTargets||[]).length)||1;
        const payMult=evts.length>0?2:3;
        if(eff==="flat"){
          if(hit){const p=(count*payMult-numTargets)*unit;st.pnl+=p;st.wins++;st.sequences++;st.pnlSeq.push(st.pnl);simUpdStreak(st,1);}
          else{st.pnl-=numTargets*unit;st.losses++;st.pnlSeq.push(st.pnl);simUpdStreak(st,-1);}
        } else {
          if(hit){const profit=count*payMult*(row?row.c:1)*unit-(row?row.totalInvest:0)*unit;st.pnl+=profit;st.wins++;st.sequences++;st.level=0;st.pnlSeq.push(st.pnl);simUpdStreak(st,1);st.parkAfterLoss=false;}
          else{st.pnl-=(row?row.c:1)*unit*numTargets;if(st.level<st.table.length-1){st.level++;}else{st.stopLossHits++;st.losses++;st.sequences++;st.level=0;st.pnlSeq.push(st.pnl);simUpdStreak(st,-1);if((st.cfg.parkRules||[]).find(r=>r.type==="park_after_stop_loss"&&r.enabled))st.parkAfterLoss=true;}}
        }
      }
    }
  }
  return states.map(st=>{if(st.streak!==0)st.streaks.push(st.streak);return{pnl:Math.round(st.pnl*100)/100,wins:st.wins,losses:st.losses,sequences:st.sequences,stopLossHits:st.stopLossHits,maxWin:st.maxWin,maxLoss:st.maxLoss,streaks:st.streaks,pnlSeq:st.pnlSeq};});
}

function simFinalStats(agg,params){
  const pnls=agg.pnlPerSession,sorted=[...pnls].sort((a,b)=>a-b),n=sorted.length||1;
  const p=pct=>sorted[Math.max(0,Math.min(n-1,Math.floor(pct/100*n)))];
  const wsDist={},lsDist={};
  agg.allStreaks.forEach(s=>{if(s>0){wsDist[s]=(wsDist[s]||0)+1;}else{const l=Math.abs(s);lsDist[l]=(lsDist[l]||0)+1;}});
  const twt=Object.values(wsDist).reduce((a,b)=>a+b,0)||1,tlt=Object.values(lsDist).reduce((a,b)=>a+b,0)||1;
  const winProb={},lossProb={};
  Object.entries(wsDist).forEach(([k,v])=>winProb[k]=v/twt);
  Object.entries(lsDist).forEach(([k,v])=>lossProb[k]=v/tlt);
  const maxW=Math.max(...Object.keys(wsDist).map(Number),1),maxL=Math.max(...Object.keys(lsDist).map(Number),1);
  const winCum={},lossCum={};
  for(let i=1;i<=maxW;i++){let c=0;for(let j=i;j<=maxW;j++)c+=(winProb[j]||0);winCum[i]=c;}
  for(let i=1;i<=maxL;i++){let c=0;for(let j=i;j<=maxL;j++)c+=(lossProb[j]||0);lossCum[i]=c;}
  const avgW=Object.entries(wsDist).reduce((a,[k,v])=>a+Number(k)*v,0)/twt;
  const avgL=Object.entries(lsDist).reduce((a,[k,v])=>a+Number(k)*v,0)/tlt;
  return{id:agg.id,name:agg.name,totalPnl:agg.totalPnl,avgPnlPerSession:Math.round(agg.totalPnl/n*100)/100,pnlP25:p(25),pnlMedian:p(50),pnlP75:p(75),pnlMin:sorted[0],pnlMax:sorted[n-1],totalWins:agg.totalWins,totalLosses:agg.totalLosses,totalSequences:agg.totalSequences,winRate:agg.totalSequences>0?agg.totalWins/agg.totalSequences:0,stopLossHits:agg.totalStopLossHits,stopLossRate:agg.totalSequences>0?agg.totalStopLossHits/agg.totalSequences:0,riskOfRuin:pnls.filter(p=>p<=-params.bankrollStart).length/n,longestWinStreak:agg.longestWinStreak,longestLossStreak:agg.longestLossStreak,avgWinStreakLen:Math.round(avgW*100)/100,avgLossStreakLen:Math.round(avgL*100)/100,winStreakDist:wsDist,lossStreakDist:lsDist,winCumulative:winCum,lossCumulative:lossCum,pnlPerSession:pnls};
}


// -- Simulation Engine --

function defaultSimConfig() {
  return {
    sessions: 100,
    spinsPerSession: 500,
    roulette: "european",
    strategies: [], // array of {type, config} same shape as live tracks
  };
}


function spinWheel(roulette) {
  const nums = getWheelNums(roulette);
  return nums[Math.floor(Math.random() * nums.length)];
}

function runSimulation(simCfg, onProgress, shouldStop) {
  const wheelNums = getWheelNums(simCfg.roulette);
  const allStrategies = simCfg.strategies;
  const results = allStrategies.map(()=>({
    sessions:[],
    totalPnl:0,
    totalSequences:0,
    totalWins:0,
    totalLosses:0,
    stopLossHits:0,
    winStreaks:[],
    lossStreaks:[],
    currentStreak:{type:null,len:0},
  }));

  for(let s=0;s<simCfg.sessions;s++){
    if(shouldStop && shouldStop()) break;

    // Per-session state per strategy
    const sState = allStrategies.map((strat,si)=>({
      level: 0,
      pnl: 0,
      sequences: 0,
      wins: 0,
      losses: 0,
      stopLossHits: 0,
      waitingForWin: strat.config.parkRules?.waitForWin || false,
      parkedAfterLoss: false,
      parkedAfterStopLoss: false,
      activeSolBets: [],
      droughts: initDroughts(simCfg.roulette),
    }));

    let spinNum = 0;
    while(spinNum < simCfg.spinsPerSession){
      if(shouldStop && shouldStop()) break;
      const val = spinWheel(simCfg.roulette);
      const bonus = {};
      spinNum++;

      // Update droughts
      sState.forEach(st=>{
        Object.keys(st.droughts).forEach(k=>st.droughts[k]++);
        st.droughts[val]=0;
      });

      allStrategies.forEach((strat,si)=>{
        const st = sState[si];
        const cfg = strat.config;
        const rules = cfg.parkRules || {};
        const tbl = computeTableForTrack({type:strat.type, config:cfg});

        // Evaluate park conditions
        if(rules.parkAfterLoss && st.parkedAfterLoss){
          st.parkedAfterLoss = false; // resume next spin
          return;
        }

        if(strat.type==="fibonacci"){
          const dts=cfg.dozenTargets||[], cts=cfg.colTargets||[], evts=cfg.evenTargets||[];
          const numTargets=(evts.length||(dts.length+cts.length))||1;
          const betMode=cfg.betMode||"progression";
          const effectiveBetMode=betMode==="flat"?"flat":(evts.length>0?"martingale":"progression");

          // drought threshold check
          if(rules.droughtThreshold){
            let maxDrought=0;
            if(evts.length>0){evts.forEach(k=>{const em=EVEN_MONEY.find(e=>e.key===k);if(em)maxDrought=Math.max(maxDrought,countDrought(Object.keys(st.droughts).map((_,i)=>i),em.pred));});}
            else{[...dts.map(d=>dozD_sim(st.droughts,d)),...cts.map(c=>colD_sim(st.droughts,c))].forEach(v=>maxDrought=Math.max(maxDrought,v));}
            if(maxDrought<rules.droughtThreshold) return;
          }

          const isZ=val==="0"||val==="00";
          let hitCount=0;
          if(!isZ){
            if(evts.length>0){evts.forEach(k=>{const em=EVEN_MONEY.find(e=>e.key===k);if(em&&em.pred(+val))hitCount++;});}
            else{if(dts.includes(dozenOf(val)))hitCount++;if(cts.includes(colOf(val)))hitCount++;}
          }
          const isHit=hitCount>0;
          const payMult=evts.length>0?2:3;
          const row=tbl[Math.min(st.level,tbl.length-1)];

          if(effectiveBetMode==="flat"){
            if(isHit){
              const profit=hitCount*payMult-numTargets;
              st.pnl+=profit*(cfg.unit||1);
              st.wins++;
              pushStreak(results[si],true);
            } else {
              st.pnl-=numTargets*(cfg.unit||1);
              st.losses++;
              pushStreak(results[si],false);
              if(rules.parkAfterLoss) st.parkedAfterLoss=true;
            }
          } else {
            const cat=isZ?"loss":getCategory(val,dts,cts,row,evts);
            if(cat!=="loss"){
              const spinDelta=hitCount*payMult*(row?row.c:1)-(row?row.c:1)*numTargets;
              // Apply gravity bonus if applicable
              const mult=bonus[val]||1;
              const bonusDelta=mult>1?(row?row.c:1)*(mult-35)*(cfg.unit||1):0;
              st.pnl+=spinDelta*(cfg.unit||1)+bonusDelta;
              st.wins++; st.sequences++; st.level=0;
              pushStreak(results[si],true);
              if(rules.waitForWin) st.waitingForWin=false;
            } else {
              st.pnl-=(row?row.c:1)*numTargets*(cfg.unit||1);
              st.losses++;
              if(st.level<tbl.length-1){
                st.level++;
              } else {
                st.stopLossHits++;
                st.level=0;
                if(rules.parkAfterStopLoss){st.parkedAfterStopLoss=true;st.waitingForWin=true;}
              }
              pushStreak(results[si],false);
              if(rules.parkAfterLoss) st.parkedAfterLoss=true;
            }
          }
        }

        if(strat.type==="solution"){
          const entry=cfg.entryThreshold||120;
          const inRange=wheelNums.filter(v=>v!=="0"&&v!=="00"&&(st.droughts[v]||0)>=entry);

          if(rules.waitForWin && st.waitingForWin){
            if(inRange.some(n=>n===val)) st.waitingForWin=false;
            return;
          }

          if(inRange.length===0) return;
          const targetNum=inRange.sort((a,b)=>(st.droughts[b]||0)-(st.droughts[a]||0))[0];
          const row=tbl[Math.min(st.level,tbl.length-1)];

          if(val===targetNum){
            const mult=bonus[val]||1;
            const profit=(row?row.profit:0)*(cfg.unit||1);
            const bonusDelta=mult>1?(row?row.c:1)*(mult-35)*(cfg.unit||1):0;
            st.pnl+=profit+bonusDelta;
            st.wins++; st.sequences++; st.level=0;
            pushStreak(results[si],true);
            if(rules.waitForWin) st.waitingForWin=false;
          } else {
            st.pnl-=(row?row.c:1)*(cfg.unit||1);
            st.losses++;
            if(st.level<tbl.length-1){
              st.level++;
            } else {
              st.stopLossHits++;
              st.level=0;
              if(rules.parkAfterStopLoss) st.waitingForWin=true;
            }
            pushStreak(results[si],false);
            if(rules.parkAfterLoss) st.parkedAfterLoss=true;
          }
        }
      });
    }

    // Record session results
    results.forEach((r,i)=>{
      r.sessions.push({pnl:sState[i].pnl, wins:sState[i].wins, losses:sState[i].losses, stopLossHits:sState[i].stopLossHits});
      r.totalPnl+=sState[i].pnl;
      r.totalWins+=sState[i].wins;
      r.totalLosses+=sState[i].losses;
      r.stopLossHits+=sState[i].stopLossHits;
    });

    if(onProgress) onProgress(s+1, results);
  }

  // Finalize streaks
  results.forEach(r=>{
    if(r.currentStreak.len>0){
      if(r.currentStreak.type) r.winStreaks.push(r.currentStreak.len);
      else r.lossStreaks.push(r.currentStreak.len);
    }
    r.totalSequences=r.totalWins+r.totalLosses;
  });

  return results;
}

function pushStreak(result, isWin) {
  const cur = result.currentStreak;
  if(cur.type===null){ cur.type=isWin; cur.len=1; }
  else if(cur.type===isWin){ cur.len++; }
  else {
    if(cur.type) result.winStreaks.push(cur.len);
    else result.lossStreaks.push(cur.len);
    cur.type=isWin; cur.len=1;
  }
}

function computeSimStats(result) {
  const sessions = result.sessions;
  if(!sessions.length) return null;
  const pnls = sessions.map(s=>s.pnl).sort((a,b)=>a-b);
  const n = pnls.length;
  const pct = p => pnls[Math.floor(p*n/100)]||0;

  function streakDist(arr){
    const max=arr.length?Math.max(...arr):0;
    const dist={};
    arr.forEach(l=>{dist[l]=(dist[l]||0)+1;});
    const total=arr.length||1;
    return Array.from({length:max},(_,i)=>({len:i+1,count:dist[i+1]||0,pct:((dist[i+1]||0)/total*100)}));
  }

  const avgWinStreak = result.winStreaks.length ? result.winStreaks.reduce((a,b)=>a+b,0)/result.winStreaks.length : 0;
  const avgLossStreak = result.lossStreaks.length ? result.lossStreaks.reduce((a,b)=>a+b,0)/result.lossStreaks.length : 0;

  return {
    totalPnl: result.totalPnl,
    avgPnlPerSession: result.totalPnl / n,
    winRate: result.totalSequences > 0 ? result.totalWins/result.totalSequences : 0,
    p25: pct(25), p50: pct(50), p75: pct(75),
    minPnl: pnls[0], maxPnl: pnls[n-1],
    longestWinStreak: result.winStreaks.length ? Math.max(...result.winStreaks) : 0,
    longestLossStreak: result.lossStreaks.length ? Math.max(...result.lossStreaks) : 0,
    avgWinStreak, avgLossStreak,
    winStreakDist: streakDist(result.winStreaks),
    lossStreakDist: streakDist(result.lossStreaks),
    stopLossHits: result.stopLossHits,
    stopLossRate: n > 0 ? result.stopLossHits/n : 0,
    sessionPnls: pnls,
  };
}

// helpers for drought in sim
function dozD_sim(droughts, d) {
  const nums=d===0?range(1,12):d===1?range(13,24):range(25,36);
  return Math.min(...nums.map(n=>droughts[String(n)]||0));
}
function colD_sim(droughts, c) {
  const nums=Array.from({length:12},(_,i)=>c+1+i*3);
  return Math.min(...nums.map(n=>droughts[String(n)]||0));
}
function range(a,b){return Array.from({length:b-a+1},(_,i)=>a+i);}
