// -- Result Flash Overlay --
function ResultFlash({result, onDismiss}) {
  useEffect(() => { const t=setTimeout(onDismiss,3000); return()=>clearTimeout(t); }, []);
  if(!result) return null;
  const {val, trackResults, totalDelta} = result;
  const isJackpot = trackResults.filter(r=>r.profit>0).length > 1;
  return (
    <div onClick={onDismiss} style={{position:"fixed",bottom:0,left:0,right:0,background:"#0f1923",border:"2px solid "+(isJackpot?"#fbbf24":"#2d4057"),borderRadius:"16px 16px 0 0",padding:"16px 20px",zIndex:1000,cursor:"pointer"}}>
      <div style={{textAlign:"center",marginBottom:10}}>
        <span style={{fontSize:28,fontWeight:900,color:"#e2e8f0"}}>{val}</span>
        <span style={{fontSize:12,color:"#64748b",marginLeft:8}}>tap to dismiss</span>
      </div>
      {isJackpot && (
        <div style={{background:"#1c1500",borderRadius:10,padding:"8px 12px",marginBottom:8,textAlign:"center",border:"1px solid #fbbf24"}}>
          <div style={{fontSize:13,color:"#fbbf24",fontWeight:800}}>JACKPOT</div>
          <div style={{fontSize:20,fontWeight:900,color:"#fbbf24"}}>{totalDelta>=0?"+":"-"}${Math.abs(totalDelta).toFixed(2)}</div>
        </div>
      )}
      {trackResults.map((r,i) => (
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<trackResults.length-1?"1px solid #1e2d3d":"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:r.color}}/>
            <span style={{fontSize:12,color:"#94a3b8"}}>{r.name}</span>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:r.profit>0?"#4ade80":r.profit<0?"#f97316":"#64748b"}}>
            {r.profit>=0?"+":""}{(r.profit*(r.unit||1)).toFixed(2)} {r.outcome}
          </div>
        </div>
      ))}
      {!isJackpot && (
        <div style={{marginTop:8,textAlign:"center",fontSize:12,color:"#64748b"}}>
          Net: <span style={{color:totalDelta>=0?"#4ade80":"#f87171",fontWeight:700}}>{totalDelta>=0?"+":"-"}${Math.abs(totalDelta).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
