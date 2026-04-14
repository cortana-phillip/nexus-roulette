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
function SessionClock({startedAt, endedAt, style, pauseOffset}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if(endedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endedAt]);
  const t = endedAt || now;
  const elapsed = Math.max(0, (t - startedAt) - (pauseOffset||0));
  return React.createElement("span", {style}, formatElapsed(elapsed));
}

// -- Roulette Table Board --
function RouletteBoard({roulette, winningNumber, stratBets, spinning, onBet, boardBets, chipColor, betResults, stratChips, landscape}) {
  const isAmerican = roulette === "american";
  const sb = stratBets || {};
  const bb = boardBets || {};
  const br = betResults || {};
  const sChipsMap = stratChips || {};
  const canBet = !!onBet && !spinning && !betResults;
  const BOARD_ROWS = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];
  const g = 2;
  const cellH = landscape ? Math.floor(Math.min(window.innerHeight - 40, 500) / 3.8) : 30;
  const zeroW = landscape ? 42 : 22;
  const colW = landscape ? 40 : 24;
  const cellFs = landscape ? Math.max(16, Math.floor(cellH/3)) : 11;
  const winStr = winningNumber ? String(winningNumber) : null;
  const winN = winStr && winStr!=="0" && winStr!=="00" ? +winStr : null;
  // Only highlight outside bets on FINAL result, not during spin
  const winGroups = {};
  if(winN && !spinning) {
    winGroups.col = winN%3===0?2:winN%3===1?0:1;
    winGroups.doz = winN<=12?0:winN<=24?1:2;
    if(RED.has(winN)) winGroups.red=true; else winGroups.black=true;
    if(winN%2===1) winGroups.odd=true; else winGroups.even=true;
    if(winN<=18) winGroups.low=true; else winGroups.high=true;
  }
  var glow = function(on){return on?"0 0 8px #fbbf24, inset 0 0 6px #fbbf2444":"none";};

  function numStyle(num, isZero) {
    var numStr = String(isZero ? (num===0?"0":"00") : num);
    var isRed = !isZero && RED.has(num);
    var isWin = winStr===numStr;
    var stratC = sb["s:"+numStr]||null;
    return {
      position:"relative", display:"flex", alignItems:"center", justifyContent:"center",
      height:cellH, borderRadius:3, cursor:"default",
      background: isZero?"#166534":isRed?"#991b1b":"#1e293b",
      border: isWin?"2px solid #fbbf24":stratC?"2px solid "+stratC:"1px solid #374151",
      color: isWin?"#fbbf24":"white",
      fontSize: isZero?(cellFs-1):cellFs, fontWeight:800,
      boxShadow: isWin?"0 0 10px #fbbf24, inset 0 0 6px #fbbf2444":stratC?"inset 0 0 5px "+stratC+"44":"none",
      zIndex: isWin?2:1,
    };
  }

  function Mkr(){return React.createElement("div",{style:{position:"absolute",top:-5,right:-3,width:12,height:12,borderRadius:"50%",background:"#fbbf24",border:"2px solid #92400e",boxShadow:"0 0 6px #fbbf24",animation:"pulse 1s infinite"}});}

  function BetChip({amount,posKey}){
    if(!amount) return null;
    var lbl = amount>=1000?(amount/1000)+"k":amount>=100?amount.toFixed(0):amount>=1?(amount%1!==0?amount.toFixed(2):amount.toFixed(0)):amount<1?(amount*100)+"¢":"";
    var fs = lbl.length>3?6:lbl.length>2?7:8;
    var result = br[posKey]||null;
    var bgC = result==="won"?"#16a34a":result==="lost"?"#991b1b":(chipColor||"#fff");
    var bdC = result==="won"?"#4ade80":result==="lost"?"#f87171":"#92400e";
    var shadow = result==="won"?"0 0 8px #4ade80":result==="lost"?"0 0 6px #ef4444":"0 1px 3px rgba(0,0,0,0.5)";
    return React.createElement("div",{style:{position:"absolute",bottom:-2,left:"50%",transform:"translateX(-50%)",minWidth:16,height:16,borderRadius:8,background:bgC,border:"1.5px solid "+bdC,fontSize:fs,fontWeight:900,color:result?"#fff":"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 2px",zIndex:5,boxShadow:shadow,animation:result==="won"?"pulse 0.8s infinite":"none",whiteSpace:"nowrap"}},lbl);
  }

  function StratChipBadge({chips}){
    if(!chips||chips.length===0) return null;
    return React.createElement("div",{style:{position:"absolute",top:-3,left:-3,display:"flex",gap:1,zIndex:6}},
      chips.map(function(ch,i){
        var lbl=ch.amount>=100?ch.amount.toFixed(0):ch.amount>=1?(ch.amount%1!==0?ch.amount.toFixed(2):ch.amount.toFixed(0)):ch.amount<1?(ch.amount*100)+"¢":"";
        var fs=lbl.length>3?5:lbl.length>2?6:7;
        return React.createElement("div",{key:i,style:{minWidth:14,height:14,borderRadius:7,background:ch.color,border:"1.5px solid #ffffff44",fontSize:fs,fontWeight:900,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 2px",boxShadow:"0 1px 3px rgba(0,0,0,0.5)"}},lbl);
      })
    );
  }

  // Map number to grid position
  var numToPos = {};
  BOARD_ROWS.forEach(function(row,ri){row.forEach(function(n,ci){numToPos[String(n)]={r:ri,c:ci};});});

  function detectBetType(numStr, offsetX, offsetY, cellW, cellH) {
    if(!cellW||!cellH) return {type:"straight",target:numStr};
    var pos = numToPos[numStr];
    if(!pos) return {type:"straight",target:numStr}; // zeros
    var r=pos.r, c=pos.c;
    var edgePct = 0.30;
    var nearRight = offsetX > cellW*(1-edgePct);
    var nearLeft = offsetX < cellW*edgePct;
    var nearBottom = offsetY > cellH*(1-edgePct);
    var nearTop = offsetY < cellH*edgePct;
    var hasRight = c<11, hasBelow = r<2, hasAbove = r>0, hasLeft = c>0;

    // Corner: where 4 numbers meet
    if(nearRight && nearBottom && hasRight && hasBelow) {
      var nums=[BOARD_ROWS[r][c],BOARD_ROWS[r][c+1],BOARD_ROWS[r+1][c],BOARD_ROWS[r+1][c+1]].sort(function(a,b){return a-b;});
      return {type:"corner",target:nums.join("-")};
    }
    if(nearRight && nearTop && hasRight && hasAbove) {
      var nums=[BOARD_ROWS[r-1][c],BOARD_ROWS[r-1][c+1],BOARD_ROWS[r][c],BOARD_ROWS[r][c+1]].sort(function(a,b){return a-b;});
      return {type:"corner",target:nums.join("-")};
    }
    if(nearLeft && nearBottom && hasLeft && hasBelow) {
      var nums=[BOARD_ROWS[r][c-1],BOARD_ROWS[r][c],BOARD_ROWS[r+1][c-1],BOARD_ROWS[r+1][c]].sort(function(a,b){return a-b;});
      return {type:"corner",target:nums.join("-")};
    }
    if(nearLeft && nearTop && hasLeft && hasAbove) {
      var nums=[BOARD_ROWS[r-1][c-1],BOARD_ROWS[r-1][c],BOARD_ROWS[r][c-1],BOARD_ROWS[r][c]].sort(function(a,b){return a-b;});
      return {type:"corner",target:nums.join("-")};
    }
    // Line (double street): at bottom boundary where two columns meet
    if(nearBottom && !hasBelow && nearRight && hasRight) {
      var line=[BOARD_ROWS[0][c],BOARD_ROWS[1][c],BOARD_ROWS[2][c],BOARD_ROWS[0][c+1],BOARD_ROWS[1][c+1],BOARD_ROWS[2][c+1]].sort(function(a,b){return a-b;});
      return {type:"line",target:line.join("-")};
    }
    if(nearBottom && !hasBelow && nearLeft && hasLeft) {
      var line=[BOARD_ROWS[0][c-1],BOARD_ROWS[1][c-1],BOARD_ROWS[2][c-1],BOARD_ROWS[0][c],BOARD_ROWS[1][c],BOARD_ROWS[2][c]].sort(function(a,b){return a-b;});
      return {type:"line",target:line.join("-")};
    }
    // Street: ONLY at outer boundary of the grid (bottom of row 2, left of col 0)
    if(nearLeft && !hasLeft) {
      var st=[BOARD_ROWS[0][c],BOARD_ROWS[1][c],BOARD_ROWS[2][c]].sort(function(a,b){return a-b;});
      return {type:"street",target:st.join("-")};
    }
    if(nearBottom && !hasBelow) {
      var st=[BOARD_ROWS[0][c],BOARD_ROWS[1][c],BOARD_ROWS[2][c]].sort(function(a,b){return a-b;});
      return {type:"street",target:st.join("-")};
    }
    // Split horizontal: left edge with left neighbor
    if(nearLeft && hasLeft) {
      var nums=[BOARD_ROWS[r][c-1],BOARD_ROWS[r][c]].sort(function(a,b){return a-b;});
      return {type:"split",target:nums.join("-")};
    }
    // Split horizontal: right edge
    if(nearRight && hasRight) {
      var nums=[BOARD_ROWS[r][c],BOARD_ROWS[r][c+1]].sort(function(a,b){return a-b;});
      return {type:"split",target:nums.join("-")};
    }
    // Split vertical: bottom edge
    if(nearBottom && hasBelow) {
      var nums=[BOARD_ROWS[r][c],BOARD_ROWS[r+1][c]].sort(function(a,b){return a-b;});
      return {type:"split",target:nums.join("-")};
    }
    // Split vertical: top edge
    if(nearTop && hasAbove) {
      var nums=[BOARD_ROWS[r-1][c],BOARD_ROWS[r][c]].sort(function(a,b){return a-b;});
      return {type:"split",target:nums.join("-")};
    }
    // Center: straight bet
    return {type:"straight",target:numStr};
  }

  // Precompute inside bet chip positions: map anchor cell -> [{amount, posKey, style}]
  var insideBetChips = {};
  var insideCoveredNums = {};
  Object.keys(bb).forEach(function(k){
    if(k.startsWith("s:")) return;
    var parts=k.split(":"); var bType=parts[0]; var bTarget=parts.slice(1).join(":");
    if(!bTarget && (bType==="basket"||bType==="red"||bType==="black"||bType==="odd"||bType==="even"||bType==="low"||bType==="high")) return; // outside bets handled separately
    if(bType!=="split"&&bType!=="street"&&bType!=="corner"&&bType!=="line"&&bType!=="basket") return;
    var betNums = bTarget ? bTarget.split("-") : [];
    betNums.forEach(function(n){insideCoveredNums[n]=true;});
    // Find grid positions of all numbers in this bet
    var positions = betNums.map(function(n){return numToPos[n];}).filter(Boolean);
    if(positions.length===0) return;
    // Find min/max row and col
    var minR=3,maxR=-1,minC=12,maxC=-1;
    positions.forEach(function(p){if(p.r<minR)minR=p.r;if(p.r>maxR)maxR=p.r;if(p.c<minC)minC=p.c;if(p.c>maxC)maxC=p.c;});
    // Determine anchor cell and chip position
    var anchorR, anchorC, chipStyle;
    if(bType==="corner") {
      anchorR=minR; anchorC=minC;
      chipStyle={position:"absolute",bottom:0,right:0,transform:"translate(50%,50%)",zIndex:10};
    } else if(bType==="split") {
      if(minR!==maxR) { // vertical split
        anchorR=minR; anchorC=minC;
        chipStyle={position:"absolute",bottom:0,left:"50%",transform:"translate(-50%,50%)",zIndex:10};
      } else { // horizontal split
        anchorR=minR; anchorC=minC;
        chipStyle={position:"absolute",top:"50%",right:0,transform:"translate(50%,-50%)",zIndex:10};
      }
    } else if(bType==="street") {
      anchorR=1; anchorC=minC; // middle row
      chipStyle={position:"absolute",top:"50%",left:0,transform:"translate(-50%,-50%)",zIndex:10};
    } else if(bType==="line") {
      anchorR=1; anchorC=minC; // middle of left column
      chipStyle={position:"absolute",top:"50%",right:0,transform:"translate(50%,-50%)",zIndex:10};
    } else if(bType==="basket") {
      anchorR=1; anchorC=0;
      chipStyle={position:"absolute",top:"50%",left:0,transform:"translate(-50%,-50%)",zIndex:10};
    }
    var anchorNum = (anchorR!==undefined&&anchorC!==undefined&&BOARD_ROWS[anchorR]) ? String(BOARD_ROWS[anchorR][anchorC]) : betNums[0];
    if(!insideBetChips[anchorNum]) insideBetChips[anchorNum]=[];
    insideBetChips[anchorNum].push({amount:bb[k],posKey:k,style:chipStyle});
  });

  function cell(num,isZero,zeroLabel){
    var numStr=isZero?(zeroLabel||"0"):String(num);
    var betKey="s:"+numStr;
    var sChips=sChipsMap[betKey]||null;
    var isCovered=!!insideCoveredNums[numStr];
    var anchoredChips=insideBetChips[numStr]||[];
    var betBorder=isCovered&&!bb[betKey]?"2px solid #c084fc":null;

    function handleClick(e){
      if(!canBet||!onBet) return;
      if(isZero) {
        // Zeros: center = straight, edge near other zero = split 0-00
        var rect=e.currentTarget.getBoundingClientRect();
        var oy=e.clientY-rect.top;
        var isNear00=zeroLabel==="0"&&oy>rect.height*0.7;
        var isNear0=zeroLabel==="00"&&oy<rect.height*0.3;
        if(isNear00||isNear0) onBet("split","0-00");
        else onBet("straight",numStr);
        return;
      }
      var rect=e.currentTarget.getBoundingClientRect();
      var ox=e.clientX-rect.left, oy=e.clientY-rect.top;
      var det=detectBetType(numStr,ox,oy,rect.width,rect.height);
      onBet(det.type,det.target);
    }

    return React.createElement("div",{key:numStr,onClick:handleClick,style:{...numStyle(num,isZero),cursor:canBet?"pointer":"default",border:betBorder||numStyle(num,isZero).border}},
      numStr,
      winStr===numStr&&!spinning&&React.createElement(Mkr),
      sChips&&React.createElement(StratChipBadge,{chips:sChips}),
      bb[betKey]&&React.createElement(BetChip,{amount:bb[betKey],posKey:betKey})
    );
  }

  // Compute overlay chip positions for inside bets
  var overlayChips = [];
  Object.keys(insideBetChips).forEach(function(anchorNum){
    var pos = numToPos[anchorNum];
    if(!pos) return;
    insideBetChips[anchorNum].forEach(function(ac){
      // Determine position based on bet type
      var parts = ac.posKey.split(":"); var bType = parts[0];
      var betNums = (parts.slice(1).join(":")).split("-").map(function(n){return numToPos[n];}).filter(Boolean);
      if(betNums.length===0) return;
      var minR=3,maxR=-1,minC=12,maxC=-1;
      betNums.forEach(function(p){if(p.r<minR)minR=p.r;if(p.r>maxR)maxR=p.r;if(p.c<minC)minC=p.c;if(p.c>maxC)maxC=p.c;});
      var leftPct, topPx;
      if(bType==="corner") { leftPct=(minC+1)/12*100; topPx=(minR+1)*(cellH+g)-g; }
      else if(bType==="split") {
        if(minR!==maxR) { leftPct=(minC+0.5)/12*100; topPx=(minR+1)*(cellH+g)-g; }
        else { leftPct=(minC+1)/12*100; topPx=minR*(cellH+g)+cellH/2; }
      }
      else if(bType==="street") { leftPct=(minC+0.5)/12*100; topPx=(cellH+g)*3-g; }
      else if(bType==="line") { leftPct=(minC+1)/12*100; topPx=(cellH+g)*3-g; }
      else { leftPct=(minC+0.5)/12*100; topPx=1*(cellH+g)+cellH/2; }
      overlayChips.push({left:leftPct,top:topPx,amount:ac.amount,posKey:ac.posKey});
    });
  });

  return (
    <div style={{width:"100%",borderRadius:8,border:"1px solid #2d4057",background:"#0a1218",padding:3,display:"flex",flexDirection:"column",gap:g,overflow:"hidden",boxSizing:"border-box"}}>
      <div style={{display:"flex",gap:g}}>
        <div style={{display:"flex",flexDirection:"column",gap:g,width:zeroW,flexShrink:0}}>
          {React.createElement("div",{key:"0",onClick:function(e){if(!canBet)return;var rect=e.currentTarget.getBoundingClientRect();var oy=e.clientY-rect.top;if(isAmerican&&oy>rect.height*0.7)onBet("split","0-00");else onBet("straight","0");},style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:3,background:"#166534",border:(winStr==="0"?"2px solid #fbbf24":"1px solid #374151"),color:winStr==="0"?"#fbbf24":"white",fontSize:cellFs-1,fontWeight:800,position:"relative",boxShadow:winStr==="0"?"0 0 10px #fbbf24":"none",cursor:canBet?"pointer":"default"}},"0",winStr==="0"&&!spinning&&React.createElement(Mkr),bb["s:0"]&&React.createElement(BetChip,{amount:bb["s:0"],posKey:"s:0"}))}
          {isAmerican&&React.createElement("div",{key:"00",onClick:function(e){if(!canBet)return;var rect=e.currentTarget.getBoundingClientRect();var oy=e.clientY-rect.top;if(oy<rect.height*0.3)onBet("split","0-00");else onBet("straight","00");},style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:3,background:"#166534",border:(winStr==="00"?"2px solid #fbbf24":"1px solid #374151"),color:winStr==="00"?"#fbbf24":"white",fontSize:cellFs-1,fontWeight:800,position:"relative",boxShadow:winStr==="00"?"0 0 10px #fbbf24":"none",cursor:canBet?"pointer":"default"}},"00",winStr==="00"&&!spinning&&React.createElement(Mkr),bb["s:00"]&&React.createElement(BetChip,{amount:bb["s:00"],posKey:"s:00"}))}
        </div>
        <div style={{position:"relative",flex:1,minWidth:0}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gridTemplateRows:"repeat(3,"+cellH+"px)",gap:g}}>
            {BOARD_ROWS.map(function(row){return row.map(function(num){return cell(num,false);});})}
          </div>
          {overlayChips.length>0 && React.createElement("div",{style:{position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none",zIndex:20}},
            overlayChips.map(function(oc,i){
              var lbl=oc.amount>=1000?(oc.amount/1000)+"k":oc.amount>=1?(oc.amount%1!==0?oc.amount.toFixed(2):oc.amount.toFixed(0)):oc.amount<1?(oc.amount*100)+"¢":"";
              var fs=lbl.length>3?6:lbl.length>2?7:8;
              var result=br[oc.posKey]||null;
              var bgC=result==="won"?"#16a34a":result==="lost"?"#991b1b":(chipColor||"#fff");
              var bdC=result==="won"?"#4ade80":result==="lost"?"#f87171":"#92400e";
              return React.createElement("div",{key:"oc"+i,style:{position:"absolute",left:oc.left+"%",top:oc.top,transform:"translate(-50%,-50%)",minWidth:18,height:18,borderRadius:9,background:bgC,border:"2px solid "+bdC,fontSize:fs,fontWeight:900,color:result?"#fff":"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",boxShadow:result==="won"?"0 0 8px #4ade80":result==="lost"?"0 0 6px #ef4444":"0 2px 8px rgba(0,0,0,0.8)",whiteSpace:"nowrap"}},lbl);
            })
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:g,width:colW,flexShrink:0}}>
          {[2,1,0].map(function(c){var on=winGroups.col===c;var bk="column:"+c;var sc=sb[bk]||null;var sCh=sChipsMap[bk]||null;return React.createElement("div",{key:c,onClick:function(){if(canBet)onBet("column",c);},style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:3,border:bb[bk]?"2px solid #fbbf24":on?"2px solid #fbbf24":sc?"2px solid "+sc:"1px solid #374151",color:on?"#fbbf24":sc?sc:bb[bk]?"#fbbf24":"#94a3b8",background:on?"#1c1000":"#0f1923",boxShadow:on?glow(true):sc?"inset 0 0 6px "+sc+"44":bb[bk]?"0 0 6px #fbbf2466":"none",fontSize:8,fontWeight:700,cursor:canBet?"pointer":"default",position:"relative"}},"2:1",sCh&&React.createElement(StratChipBadge,{chips:sCh}),bb[bk]&&React.createElement(BetChip,{amount:bb[bk],posKey:bk}));})}
        </div>
      </div>
      <div style={{display:"flex",gap:g,marginLeft:zeroW+g}}>
        {[{l:"1st 12",i:0},{l:"2nd 12",i:1},{l:"3rd 12",i:2}].map(function(d){var on=winGroups.doz===d.i;var bk="dozen:"+d.i;var sc=sb[bk]||null;var sCh=sChipsMap[bk]||null;return React.createElement("div",{key:d.i,onClick:function(){if(canBet)onBet("dozen",d.i);},style:{flex:1,padding:landscape?"10px 0":"6px 0",borderRadius:3,textAlign:"center",fontSize:landscape?13:10,fontWeight:700,border:bb[bk]?"2px solid #fbbf24":on?"2px solid #fbbf24":sc?"2px solid "+sc:"1px solid #374151",color:on?"#fbbf24":sc?sc:bb[bk]?"#fbbf24":"#94a3b8",background:on?"#1c1000":"#0f1923",boxShadow:on?glow(true):sc?"inset 0 0 6px "+sc+"44":bb[bk]?"0 0 6px #fbbf2466":"none",cursor:canBet?"pointer":"default",position:"relative"}},d.l,sCh&&React.createElement(StratChipBadge,{chips:sCh}),bb[bk]&&React.createElement(BetChip,{amount:bb[bk],posKey:bk}));})}
      </div>
      <div style={{display:"flex",gap:g,marginLeft:zeroW+g}}>
        {[
          {l:"1-18",k:"low",bg:"#0f1923"},
          {l:"EVEN",k:"even",bg:"#0f1923"},
          {l:"RED",k:"red",bg:"#7f1d1d"},
          {l:"BLK",k:"black",bg:"#1e293b"},
          {l:"ODD",k:"odd",bg:"#0f1923"},
          {l:"19-36",k:"high",bg:"#0f1923"},
        ].map(function(em){var on=!!winGroups[em.k];var bk=em.k;var sc=sb[bk]||null;var sCh=sChipsMap[bk]||null;return React.createElement("div",{key:em.k,onClick:function(){if(canBet)onBet(em.k);},style:{flex:1,padding:"6px 0",borderRadius:3,textAlign:"center",fontSize:9,fontWeight:700,border:bb[bk]?"2px solid #fbbf24":on?"2px solid #fbbf24":sc?"2px solid "+sc:"1px solid #374151",color:on?"#fbbf24":sc?sc:bb[bk]?"#fbbf24":em.k==="red"?"#f87171":em.k==="black"?"#94a3b8":"#94a3b8",background:on?"#1c1000":em.bg,boxShadow:on?glow(true):sc?"inset 0 0 6px "+sc+"44":bb[bk]?"0 0 6px #fbbf2466":"none",cursor:canBet?"pointer":"default",position:"relative"}},em.l,sCh&&React.createElement(StratChipBadge,{chips:sCh}),bb[bk]&&React.createElement(BetChip,{amount:bb[bk],posKey:bk}));})}
      </div>
    </div>
  );
}
