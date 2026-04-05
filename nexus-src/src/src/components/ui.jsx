// -- Base UI Components --
function Card({children, style}) {
  return (
    <div style={{background:"#1e2d3d",borderRadius:14,padding:"12px 14px",width:"100%",border:"1px solid #2d4057",minWidth:0,overflow:"hidden",...(style||{})}}>
      {children}
    </div>
  );
}

function Lbl({children}) {
  return (
    <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
      {children}
    </div>
  );
}

function Modal({children, onClose}) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0f1923",borderRadius:"20px 20px 0 0",padding:"20px 16px 36px",width:"100%",maxWidth:460,border:"1px solid #2d4057",borderBottom:"none",maxHeight:"90vh",overflowY:"auto"}}>
        {children}
      </div>
    </div>
  );
}

function MoneyInput({value, onChange, currCode, label}) {
  const [raw, setRaw] = useState(String(value));
  const cur = getCur(currCode);

  function commit(str) {
    const n = parseFloat(str.replace(/[^0-9.]/g,""));
    if(!isNaN(n) && n >= 0) onChange(Math.round(n * 100) / 100);
    else setRaw(value.toFixed(cur.dec));
  }

  return (
    <div>
      {label && <Lbl>{label}</Lbl>}
      <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:12,border:"1px solid #2d4057",overflow:"hidden"}}>
        <div style={{padding:"0 14px",fontSize:20,color:"#64748b",fontWeight:700}}>{cur.symbol}</div>
        <input
          type="number"
          inputMode="decimal"
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={e => commit(e.target.value)}
          onFocus={e => e.target.select()}
          onKeyDown={e => e.key==="Enter" && commit(e.target.value)}
          style={{flex:1,padding:"14px 0",fontSize:22,fontWeight:800,color:"#86efac",background:"transparent",border:"none",outline:"none",WebkitAppearance:"none"}}
        />
      </div>
    </div>
  );
}

function ROIStepper({value, onChange, disabled}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6,opacity:disabled?0.4:1,pointerEvents:disabled?"none":"auto"}}>
      <div style={{display:"flex",alignItems:"center",background:"#0f1923",borderRadius:12,border:"1px solid "+(disabled?"#1e2d3d":"#2d4057"),overflow:"hidden"}}>
        <button onClick={()=>onChange(Math.max(1,value-1))} style={{padding:"10px 18px",background:"transparent",border:"none",color:"#60a5fa",fontSize:22,fontWeight:700,cursor:"pointer"}}>-</button>
        <div style={{flex:1,textAlign:"center",fontSize:24,fontWeight:900,color:disabled?"#374151":"#86efac"}}>{disabled?"Auto":value+"%"}</div>
        <button onClick={()=>onChange(Math.min(99,value+1))} style={{padding:"10px 18px",background:"transparent",border:"none",color:"#60a5fa",fontSize:22,fontWeight:700,cursor:"pointer"}}>+</button>
      </div>
      {!disabled && <div style={{display:"flex",gap:5}}>
        {ROI_PRESETS.map(p => (
          <button key={p} onClick={()=>onChange(p)} style={{flex:1,padding:"7px 0",borderRadius:8,border:"1px solid "+(value===p?"#86efac":"#2d4057"),background:value===p?"#134e2a":"#0f1923",color:value===p?"#86efac":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer"}}>{p}%</button>
        ))}
      </div>}
    </div>
  );
}

function DCard({label, range, drought, colorBd, colorTx}) {
  const bd = droughtBadge(drought);
  return (
    <div style={{flex:1,background:"#1e2d3d",borderRadius:12,padding:"9px 5px",border:"1px solid "+colorBd,textAlign:"center"}}>
      <div style={{fontSize:8,color:colorTx,fontWeight:700,textTransform:"uppercase",marginBottom:1}}>{label}</div>
      <div style={{fontSize:7,color:"#475569",marginBottom:4}}>{range}</div>
      <div style={{fontSize:24,fontWeight:900,color:"#e2e8f0",lineHeight:1}}>{drought}</div>
      <div style={{fontSize:7,color:"#475569",marginBottom:2}}>misses</div>
      <div style={{fontSize:8,fontWeight:700,color:bd.c}}>{bd.t}</div>
    </div>
  );
}
