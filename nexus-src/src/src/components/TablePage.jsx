// -- Full Table Page --
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
