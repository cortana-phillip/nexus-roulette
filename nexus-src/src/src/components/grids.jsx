// -- Number Grids --
function FibGrid({onNumber, onGhost, dozenTargets, colTargets, fibRow, trackOverlays, flashNum}) {
  const rows = Array.from({length:12}, (_,r) => [r*3+1,r*3+2,r*3+3]);
  const dts = dozenTargets||[0], cts = colTargets||[];
  const pressTimer = React.useRef(null);
  function numCell(val) {
    const isZ = val==="0"||val==="00";
    const cat = isZ ? "loss" : getCategory(val,dts,cts,fibRow);
    const cs = catStyle(cat);
    const overlays = (trackOverlays||[]).filter(o => {
      if(isZ) return false;
      if(o.type==="fibonacci") return (o.dozenTargets||[]).includes(dozenOf(val))||(o.colTargets||[]).includes(colOf(val));
      if(o.type==="solution") return (o.activeBets||[]).some(b=>b.number===val);
      return false;
    });
    const isFlash = flashNum===val;
    return (
      <button key={val}
        onClick={()=>guardedTap(val,onNumber)}
        onContextMenu={e=>{e.preventDefault();if(onGhost)onGhost(val);}}
        onTouchStart={()=>{if(onGhost)pressTimer.current=setTimeout(()=>onGhost(val),600);}}
        onTouchEnd={()=>clearTimeout(pressTimer.current)}
        onTouchMove={()=>clearTimeout(pressTimer.current)}
        style={{padding:"8px 0",borderRadius:7,border:"1px solid "+(isFlash?"#ffffff":cs.bd),background:isFlash?"#ffffff22":cs.bg,color:cs.tx,fontSize:12,fontWeight:800,cursor:"pointer",minHeight:42,transition:"background 0.1s,border 0.1s"}}>
        <div>{val}</div>
        {overlays.length>0 && (
          <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:1}}>
            {overlays.map((o,i) => <div key={i} style={{width:5,height:5,borderRadius:"50%",background:o.color}}/>)}
          </div>
        )}
      </button>
    );
  }
  return (
    <div style={{width:"100%",minWidth:0,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:4}}>
        {["0","00"].map(v => (
          <button key={v} onClick={()=>guardedTap(v,onNumber)} style={{padding:"11px 0",borderRadius:8,border:"1px solid #1f2937",background:"#1a0a0a",color:"#6b7280",fontSize:14,fontWeight:800,cursor:"pointer",width:"100%"}}>{v}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:2}}>
        {[0,1,2].map(i => (
          <div key={i} style={{textAlign:"center",fontSize:8,color:cts.includes(i)?COL_TX[i]:"#334155",fontWeight:700,textTransform:"uppercase"}}>Col {i+1}</div>
        ))}
      </div>
      {[0,1,2].map(dz => {
        const act = dts.includes(dz);
        return (
          <div key={dz} style={{borderRadius:8,marginBottom:4,border:"1px solid "+(act?DZ_BD[dz]:"#1a1a2e"),padding:act?"3px":"0",minWidth:0}}>
            {act && <div style={{textAlign:"center",fontSize:8,color:DZ_BD[dz],fontWeight:700,textTransform:"uppercase",padding:"1px 0 2px"}}>{DZ_LABELS[dz]}</div>}
            {rows.slice(dz*4,dz*4+4).map(([a,b,c]) => (
              <div key={a} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:4,minWidth:0}}>
                {[a,b,c].map(n => numCell(String(n)))}
              </div>
            ))}
          </div>
        );
      })}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
        {[["jackpot","#fbbf24","Jackpot"],["win","#4ade80","Win"],["breakeven","#a3e635","Breakeven"],["partial-loss","#f97316","Partial Loss"],["loss","#374151","Total Loss"]].map(([c,col,l]) => (
          <div key={c} style={{display:"flex",alignItems:"center",gap:3}}>
            <div style={{width:7,height:7,borderRadius:2,background:col}}/>
            <span style={{fontSize:8,color:"#475569"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SolGrid({onNumber, droughts, entry, maxLvl, activeBets, wheelNums, trackOverlays}) {
  const activeSet = new Set((activeBets||[]).map(b=>b.number));
  const zeros = wheelNums.filter(v=>v==="0"||v==="00");
  const nums36 = wheelNums.filter(v=>v!=="0"&&v!=="00");
  return (
    <div style={{width:"100%"}}>
      <div style={{display:"grid",gridTemplateColumns:zeros.length===2?"1fr 1fr":"1fr",gap:4,marginBottom:4}}>
        {zeros.map(v => {
          const d=droughts[v]||0, cs=numDroughtStyle(d,entry,maxLvl,false);
          return (
            <button key={v} onClick={()=>guardedTap(v,onNumber)} style={{padding:"9px 0",borderRadius:8,border:"1px solid "+cs.bd,background:cs.bg,color:cs.tx,fontSize:13,fontWeight:800,cursor:"pointer"}}>
              <div>{v}</div><div style={{fontSize:8}}>{d}</div>
            </button>
          );
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:3}}>
        {nums36.map(val => {
          const d=droughts[val]||0, isAct=activeSet.has(val);
          const cs=numDroughtStyle(d,entry,maxLvl,isAct);
          const inR=d>=entry, ab=(activeBets||[]).find(b=>b.number===val);
          const overlays=(trackOverlays||[]).filter(o=>o.type==="solution"&&(o.activeBets||[]).some(b=>b.number===val));
          return (
            <button key={val} onClick={()=>guardedTap(val,onNumber)} style={{padding:"7px 0",borderRadius:6,border:(inR||isAct?"2":"1")+"px solid "+cs.bd,background:cs.bg,color:cs.tx,fontSize:10,fontWeight:800,cursor:"pointer",position:"relative"}}>
              <div>{val}</div>
              <div style={{fontSize:7,color:isAct?"#4ade80":inR?"#fbbf24":"#1f2937"}}>{d}</div>
              {ab && <div style={{position:"absolute",top:1,right:1,fontSize:6,color:"#4ade80",fontWeight:900}}>L{ab.level+1}</div>}
              {overlays.length>0 && (
                <div style={{display:"flex",justifyContent:"center",gap:1,marginTop:1}}>
                  {overlays.map((o,i) => <div key={i} style={{width:4,height:4,borderRadius:"50%",background:o.color}}/>)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

