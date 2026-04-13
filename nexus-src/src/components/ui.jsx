// -- Base UI Components --
function Card({children, style}) {
  return (
    <div style={{background:"#1e2d3d",borderRadius:14,padding:"12px 14px",width:"100%",border:"1px solid #2d4057",...(style||{})}}>
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

// Self-contained clock that won't cause parent re-renders
function SessionClock({startedAt, endedAt, style}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if(endedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endedAt]);
  const t = endedAt || now;
  return React.createElement("span", {style}, formatElapsed(t - startedAt));
}

// -- Roulette Table Board --
function RouletteBoard({roulette, winningNumber, betNumbers}) {
  const isAmerican = roulette === "american";
  const bets = betNumbers || {};
  const BOARD_ROWS = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];
  const cellH = 34;
  const cellW = "1fr";
  const zeroW = 28;
  const gap = 2;
  const winStr = winningNumber ? String(winningNumber) : null;

  function cellStyle(num, isZero) {
    const numStr = String(isZero ? (num === 0 ? "0" : "00") : num);
    const isRed = !isZero && RED.has(num);
    const isWin = winStr === numStr;
    const betColor = bets[numStr] || null;
    return {
      position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      height: cellH, borderRadius: 4, cursor: "default",
      background: isZero ? "#166534" : isRed ? "#991b1b" : "#1e293b",
      border: isWin ? "2px solid #fbbf24" : betColor ? "2px solid "+betColor : "1px solid #374151",
      color: isWin ? "#fbbf24" : "white",
      fontSize: isZero ? 11 : 12, fontWeight: 800,
      boxShadow: isWin ? "0 0 12px #fbbf24, inset 0 0 8px #fbbf2444" : betColor ? "inset 0 0 6px "+betColor+"44" : "none",
      zIndex: isWin ? 2 : 1,
      transition: "box-shadow 0.3s, border 0.3s",
    };
  }

  function Marker() {
    return React.createElement("div", {style: {
      position: "absolute", top: -6, right: -4,
      width: 14, height: 14, borderRadius: "50%",
      background: "#fbbf24", border: "2px solid #92400e",
      boxShadow: "0 0 6px #fbbf24",
      animation: "pulse 1s infinite",
    }});
  }

  return (
    <div style={{width: "100%", overflow: "hidden", borderRadius: 8, border: "1px solid #2d4057", background: "#0a1218", padding: 4}}>
      <div style={{display: "flex", gap: gap}}>
        {/* Zeros column */}
        <div style={{display: "flex", flexDirection: "column", gap: gap, width: zeroW, flexShrink: 0}}>
          <div style={{...cellStyle(0, true), flex: isAmerican ? 1 : 1}}>
            0
            {winStr === "0" && React.createElement(Marker)}
          </div>
          {isAmerican && (
            <div style={{...cellStyle(0, true), flex: 1}}>
              00
              {winStr === "00" && React.createElement(Marker)}
            </div>
          )}
        </div>
        {/* Numbers grid */}
        <div style={{flex: 1, display: "grid", gridTemplateColumns: "repeat(12, " + cellW + ")", gridTemplateRows: "repeat(3, " + cellH + "px)", gap: gap}}>
          {BOARD_ROWS.map((row) => row.map((num) => (
            <div key={num} style={cellStyle(num, false)}>
              {num}
              {winStr === String(num) && React.createElement(Marker)}
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}
