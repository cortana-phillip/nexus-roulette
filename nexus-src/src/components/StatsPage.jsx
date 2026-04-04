// -- Stats Page --
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
              <span style={{fontSize:14,fontWeight:800,color:"#4ade80",fontVariantNumeric:"tabular-nums"}}>{formatElapsed((sess.sessionEndedAt||nowTick)-sess.sessionStartedAt)}</span>
              {(()=>{
                const hrs=((sess.sessionEndedAt||nowTick)-sess.sessionStartedAt)/3600000;
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
              {l:"Net P&L",v:(pnlVal>=0?"+":"-")+cur.symbol+Math.abs(pnlVal).toFixed(cur.dec),c:pnlColor},
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
