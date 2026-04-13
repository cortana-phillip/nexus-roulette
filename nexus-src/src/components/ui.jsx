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
  const g = 2;
  const winStr = winningNumber ? String(winningNumber) : null;
  const winN = winStr && winStr!=="0" && winStr!=="00" ? +winStr : null;
  // Compute winning groups
  const winGroups = {};
  if(winN) {
    winGroups.col = winN%3===0?2:winN%3===1?0:1;
    winGroups.doz = winN<=12?0:winN<=24?1:2;
    if(RED.has(winN)) winGroups.red=true; else winGroups.black=true;
    if(winN%2===1) winGroups.odd=true; else winGroups.even=true;
    if(winN<=18) winGroups.low=true; else winGroups.high=true;
  }
  var glow = function(on){return on?"0 0 8px #fbbf24, inset 0 0 6px #fbbf2444":"none";};
  var obdr = function(on){return on?"2px solid #fbbf24":"1px solid #374151";};
  var otxt = function(on){return on?"#fbbf24":"#94a3b8";};
  var obg = function(on,base){return on?(base||"#1c1000"):(base||"#0f1923");};

  function numStyle(num, isZero) {
    var numStr = String(isZero ? (num===0?"0":"00") : num);
    var isRed = !isZero && RED.has(num);
    var isWin = winStr===numStr;
    var betColor = bets[numStr]||null;
    return {
      position:"relative", display:"flex", alignItems:"center", justifyContent:"center",
      height:32, borderRadius:3, cursor:"default",
      background: isZero?"#166534":isRed?"#991b1b":"#1e293b",
      border: isWin?"2px solid #fbbf24":betColor?"2px solid "+betColor:"1px solid #374151",
      color: isWin?"#fbbf24":"white",
      fontSize: isZero?10:11, fontWeight:800,
      boxShadow: isWin?"0 0 10px #fbbf24, inset 0 0 6px #fbbf2444":betColor?"inset 0 0 5px "+betColor+"44":"none",
      zIndex: isWin?2:1, transition:"box-shadow 0.3s",
    };
  }

  function Mkr(){return React.createElement("div",{style:{position:"absolute",top:-5,right:-3,width:12,height:12,borderRadius:"50%",background:"#fbbf24",border:"2px solid #92400e",boxShadow:"0 0 6px #fbbf24",animation:"pulse 1s infinite"}});}

  return (
    <div style={{width:"100%",overflow:"hidden",borderRadius:8,border:"1px solid #2d4057",background:"#0a1218",padding:4,display:"flex",flexDirection:"column",gap:g}}>
      {/* Main grid: zeros + numbers + column bets */}
      <div style={{display:"flex",gap:g}}>
        <div style={{display:"flex",flexDirection:"column",gap:g,width:26,flexShrink:0}}>
          <div style={{...numStyle(0,true),flex:1}}>0{winStr==="0"&&React.createElement(Mkr)}</div>
          {isAmerican&&<div style={{...numStyle(0,true),flex:1}}>00{winStr==="00"&&React.createElement(Mkr)}</div>}
        </div>
        <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(12,1fr)",gridTemplateRows:"repeat(3,32px)",gap:g}}>
          {BOARD_ROWS.map(function(row){return row.map(function(num){return(
            React.createElement("div",{key:num,style:numStyle(num,false)},num,winStr===String(num)&&React.createElement(Mkr))
          );});})}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:g,width:28,flexShrink:0}}>
          {[2,1,0].map(function(c){return React.createElement("div",{key:c,style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:3,border:obdr(winGroups.col===c),color:otxt(winGroups.col===c),background:obg(winGroups.col===c),boxShadow:glow(winGroups.col===c),fontSize:8,fontWeight:700,transition:"all 0.3s"}},"2:1");})}
        </div>
      </div>
      {/* Dozens row */}
      <div style={{display:"flex",gap:g,marginLeft:26+g}}>
        {[{l:"1st 12",i:0},{l:"2nd 12",i:1},{l:"3rd 12",i:2}].map(function(d){return React.createElement("div",{key:d.i,style:{flex:1,padding:"6px 0",borderRadius:3,textAlign:"center",fontSize:10,fontWeight:700,border:obdr(winGroups.doz===d.i),color:otxt(winGroups.doz===d.i),background:obg(winGroups.doz===d.i),boxShadow:glow(winGroups.doz===d.i),transition:"all 0.3s"}},d.l);})}
      </div>
      {/* Even money row */}
      <div style={{display:"flex",gap:g,marginLeft:26+g}}>
        {[
          {l:"1-18",k:"low",bg:"#0f1923"},
          {l:"EVEN",k:"even",bg:"#0f1923"},
          {l:"RED",k:"red",bg:"#7f1d1d"},
          {l:"BLK",k:"black",bg:"#1e293b"},
          {l:"ODD",k:"odd",bg:"#0f1923"},
          {l:"19-36",k:"high",bg:"#0f1923"},
        ].map(function(em){var on=!!winGroups[em.k];return React.createElement("div",{key:em.k,style:{flex:1,padding:"6px 0",borderRadius:3,textAlign:"center",fontSize:9,fontWeight:700,border:obdr(on),color:on?"#fbbf24":em.k==="red"?"#f87171":em.k==="black"?"#94a3b8":"#94a3b8",background:on?"#1c1000":em.bg,boxShadow:glow(on),transition:"all 0.3s"}},em.l);})}
      </div>
    </div>
  );
}
