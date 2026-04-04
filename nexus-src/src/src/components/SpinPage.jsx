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
