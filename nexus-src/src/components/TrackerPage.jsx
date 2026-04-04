// -- Tracker Page --
  function TrackerPage() {
    const dts = primaryTrack&&primaryTrack.type==="fibonacci" ? primaryTrack.config.dozenTargets||[] : [];
    const cts = primaryTrack&&primaryTrack.type==="fibonacci" ? primaryTrack.config.colTargets||[] : [];
    const hasMix = dts.length>0&&cts.length>0;
    const row = primFibRow;
    const outcomes = row ? {
      partial:{ret:3*row.c,profit:3*row.c-row.totalInvest},
      jackpot:hasMix?{ret:6*row.c,profit:6*row.c-row.totalInvest}:null
    } : null;
    const solBets = primaryTrack&&primaryTrack.type==="solution" ? primaryTrack.config.activeBets||[] : [];
    const recentSpins = [...sess.spins].reverse().slice(0,30);

    return (
      <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%"}}>

        {/* Session clock */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0c1520",borderRadius:10,padding:"8px 14px",border:"1px solid #2d4057"}}>
          <div>
            {sess.sessionStartedAt
              ? <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",animation:"pulse 1.5s infinite"}}/>
                  <span style={{fontSize:12,color:"#94a3b8"}}>Session Active</span>
                  <span style={{fontSize:16,fontWeight:800,color:"#4ade80",fontVariantNumeric:"tabular-nums"}}>{formatElapsed(nowTick - sess.sessionStartedAt)}</span>
                </div>
              : <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#fbbf24"}}/>
                  <span style={{fontSize:12,color:"#fbbf24"}}>Catch-up Mode</span>
                  <span style={{fontSize:10,color:"#64748b"}}>-- spin any number to start session</span>
                </div>
            }
          </div>
          {sess.sessionStartedAt && (
            <button onClick={()=>{if(window.confirm("End session and save?"))endSession();}} style={{padding:"6px 12px",borderRadius:8,border:"1px solid #7f1d1d",background:"#200505",color:"#f87171",fontSize:11,fontWeight:700,cursor:"pointer"}}>■ End Session</button>
          )}
        </div>
        {sess.spins.length>0 && (
          <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2,WebkitOverflowScrolling:"touch"}}>
            {recentSpins.map((val,i)=>{
              const isZ=val==="0"||val==="00", r=!isZ&&RED.has(+val);
              const hitTracks=(trackOverlays||[]).filter(o=>{
                if(isZ)return false;
                if(o.type==="fibonacci")return (o.dozenTargets||[]).includes(dozenOf(val))||(o.colTargets||[]).includes(colOf(val));
                if(o.type==="solution")return (o.activeBets||[]).some(b=>b.number===val);
                return false;
              });
              const borderColor=i===0?"#ffffff":hitTracks.length>0?hitTracks[0].color:isZ?"#22c55e":r?"#ef4444":"#374151";
              return(
                <div key={i} style={{flexShrink:0,width:28,height:28,borderRadius:6,background:isZ?"#166534":r?"#7f1d1d":"#0d1117",border:"2px solid "+borderColor,color:isZ?"#bbf7d0":r?"#fecaca":"#f1f5f9",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {val}
                </div>
              );
            })}
          </div>
        )}

        {/* Even money droughts */}
        {sess.spins.length>0 && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:3}}>
            {emDroughts.map(em=>(
              <div key={em.key} style={{borderRadius:7,border:"1px solid "+(em.drought>=8?"#dc2626":em.drought>=5?"#f59e0b":"#2d4057"),background:em.drought>=8?"#200505":em.drought>=5?"#1c1000":"#0f1923",padding:"4px 2px",textAlign:"center"}}>
                <div style={{fontSize:8,color:em.color,fontWeight:700,textTransform:"uppercase"}}>{em.label}</div>
                <div style={{fontSize:13,fontWeight:800,color:em.drought>=8?"#f87171":em.drought>=5?"#fbbf24":"#94a3b8"}}>{em.drought}</div>
              </div>
            ))}
          </div>
        )}

        {/* Track cards with drag-to-reorder */}
        <Lbl>Active Strategy Tracks</Lbl>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {nonClosedTracks.map((t,idx) => {
            const tbl=computeTableForTrack(t);
            const isSel=selectedTrackId===t.id;
            const isHighlight=highlightTrackId===t.id;
            const isDragging=draggingId===t.id;
            const isDragOver=dragOverId===t.id;
            const isEditing=editTrackId===t.id;
            const dolPnl=t.pnl*(t.config.unit||1);
            return (
              <div key={t.id}>
                <div
                  onTouchStart={e=>{if(e.target.dataset.handle){e.preventDefault();setDraggingId(t.id);}}}
                  onTouchMove={e=>{if(draggingId&&draggingId!==t.id){e.preventDefault();setDragOverId(t.id);}}}
                  onTouchEnd={()=>{if(draggingId&&dragOverId){moveTrack(draggingId,dragOverId);}setDraggingId(null);setDragOverId(null);}}
                  onClick={()=>setSelectedTrackId(isSel?null:t.id)}
                  style={{background:"#0f1923",borderRadius:12,padding:"10px 12px",border:"2px solid "+(isHighlight?"#ffffff":isEditing?"#60a5fa":isDragOver?"#60a5fa":isSel?t.color:"#2d4057"),cursor:"pointer",opacity:isDragging?0.4:1,transition:"border 0.3s,opacity 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span data-handle="1" style={{fontSize:14,color:"#374151",cursor:"grab",userSelect:"none",touchAction:"none",flexShrink:0}}>⠿</span>
                    <div style={{width:10,height:10,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                    <span style={{fontSize:11,fontWeight:700,color:t.color,flex:1}}>{TRACK_ICONS[t.type]} {t.type==="fibonacci"?"Progression Bet":"The Solution"}</span>
                    <span style={{fontSize:9,color:t.state==="active"?"#4ade80":t.state==="parked"?"#fbbf24":"#94a3b8",fontWeight:700}}>[{t.state.toUpperCase()}]</span>
                    <span style={{fontSize:12,fontWeight:800,color:dolPnl>=0?"#4ade80":"#f87171"}}>{dolPnl>=0?"+":"-"}{cur.symbol}{Math.abs(dolPnl).toFixed(cur.dec)}</span>
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:6}}>
                    <span style={{fontSize:10,color:"#94a3b8"}}>Lvl <strong style={{color:t.level>=10?"#f87171":t.level>=6?"#fbbf24":"#e2e8f0"}}>{t.level}</strong>/{tbl.length}</span>
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={e=>{e.stopPropagation();parkToggle(t.id);}} style={{flex:1,padding:"4px 0",borderRadius:6,border:"1px solid #2d4057",background:t.state==="parked"?"#134e2a":"#1e2d3d",color:t.state==="parked"?"#4ade80":"#94a3b8",fontSize:9,fontWeight:700,cursor:"pointer"}}>{t.state==="parked"?"▶ Resume":"⏸ Park"}</button>
                    <button onClick={e=>{e.stopPropagation();setEditTrackId(isEditing?null:t.id);}} style={{padding:"4px 8px",borderRadius:6,border:"1px solid "+(isEditing?"#60a5fa":"#1e3a5f"),background:isEditing?"#1e3a5f":"transparent",color:"#60a5fa",fontSize:9,cursor:"pointer"}}>✏️ Edit</button>
                    <button onClick={e=>{e.stopPropagation();if(window.confirm("Close track?"))closeTrack(t.id);}} style={{padding:"4px 8px",borderRadius:6,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:9,cursor:"pointer"}}>×</button>
                  </div>
                </div>
                {isEditing && (
                  <EditTrackCfg track={t} currency={currency} tableMinBet={settings.tableMinBet||1} onSave={cfg=>updateTrackConfig(t.id,cfg)} onCancel={()=>setEditTrackId(null)}/>
                )}
              </div>
            );
          })}
          <div style={{display:"flex",gap:6}}>
            {!addOpen && (
              <button onClick={()=>setAddOpen(true)} style={{flex:1,padding:"10px 0",borderRadius:12,border:"2px dashed #2d4057",background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer"}}>+ Add Track</button>
            )}
            {prevSessState && (
              <button onClick={undoLastSpin} style={{padding:"10px 14px",borderRadius:12,border:"1px solid #f59e0b",background:"#1c1000",color:"#fbbf24",fontSize:12,fontWeight:700,cursor:"pointer"}}>↩ Undo</button>
            )}
          </div>
        </div>

        {addOpen && <AddTrackPanel onAdd={addTrack} onClose={()=>setAddOpen(false)} nextColor={nextColorIdx} type={pendingTrackType} cfg={pendingTrackCfg} onTypeChange={(t)=>{setPendingTrackType(t);setPendingTrackCfg(t==="fibonacci"?defaultFibCfg():defaultSolCfg());}} onCfgChange={setPendingTrackCfg} closedTracks={sess.tracks.filter(t=>t.state==="closed")} currency={currency} tableMinBet={settings.tableMinBet||1}/>}

        {!primaryTrack && !addOpen && (
          <div style={{background:"#1e2d3d",borderRadius:14,padding:"20px",textAlign:"center",border:"1px dashed #2d4057"}}>
            <div style={{fontSize:24,marginBottom:8}}>🎲</div>
            <div style={{color:"#64748b",fontSize:13,marginBottom:12}}>No active tracks yet</div>
            <button onClick={()=>setAddOpen(true)} style={{padding:"10px 20px",borderRadius:10,border:"none",background:"#16a34a",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add First Strategy</button>
          </div>
        )}

        {/* Solution candidates -- shown even without active Solution track */}
        {solCandidates.length>0 && (
          <Card>
            <Lbl>{"🎯 Solution Candidates ("+solCandidates.length+")"}</Lbl>
            <div style={{fontSize:10,color:"#64748b",marginBottom:6}}>Tap a number to start tracking it with The Solution</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {solCandidates.slice(0,20).map(num=>{
                const d=sess.droughts[num]||0;
                return(
                  <button key={num} onClick={()=>{setPendingTrackType("solution");setPendingTrackCfg({...defaultSolCfg(),activeBets:[{number:num,level:0}]});setAddOpen(true);}} style={{padding:"6px 8px",borderRadius:8,border:"1px solid #f59e0b",background:"#1c1000",cursor:"pointer",textAlign:"center",minWidth:44}}>
                    <div style={{fontSize:13,fontWeight:900,color:RED.has(+num)?"#f87171":"#f1f5f9"}}>{num}</div>
                    <div style={{fontSize:8,color:"#fbbf24",fontWeight:700}}>{d}sp</div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Dozen/Column droughts */}
        {sess.spins.length>0 && (
          <Card>
            <div style={{display:"flex",gap:5,marginBottom:6}}>
              {[0,1,2].map(i=><DCard key={i} label={DZ_LABELS[i]} range={["1-12","13-24","25-36"][i]} drought={dozD[i]} colorBd={DZ_BD[i]} colorTx={DZ_TX[i]}/>)}
            </div>
            <div style={{display:"flex",gap:5}}>
              {[0,1,2].map(i=><DCard key={i} label={COL_LABELS[i]} range={["1,4..34","2,5..35","3,6..36"][i]} drought={colD[i]} colorBd={COL_BD[i]} colorTx={COL_TX[i]}/>)}
            </div>
          </Card>
        )}

        {primaryTrack && primaryTrack.type==="fibonacci" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {hasMix && outcomes && outcomes.jackpot && (
              <div style={{background:"#1c1500",borderRadius:14,padding:12,border:"1px solid #f59e0b"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[{l:"JP Bet",v:row?fmtChips(row.totalBet,primaryTrack.config.unit,currency):"--",c:"#fbbf24"},{l:"JP Return",v:fmtMoney(outcomes.jackpot.ret*(primaryTrack.config.unit||1),currency),c:"#fbbf24"},{l:"JP Profit",v:(outcomes.jackpot.profit*(primaryTrack.config.unit||1)>=0?"+":"-")+cur.symbol+Math.abs(outcomes.jackpot.profit*(primaryTrack.config.unit||1)).toFixed(cur.dec),c:outcomes.jackpot.profit>=0?"#4ade80":"#f87171"}].map(({l,v,c}) => (
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{fontSize:8,color:"#78350f",textTransform:"uppercase",marginBottom:2}}>{l}</div>
                      <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:primaryTrack.color}}/>
                  <span style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1}}>Miss Level</span>
                </div>
                <span style={{fontSize:26,fontWeight:800,color:primaryTrack.level>=10?"#f87171":primaryTrack.level>=6?"#fbbf24":"#86efac"}}>
                  {primaryTrack.level}<span style={{fontSize:12,color:"#475569",fontWeight:400}}>/{primFibTbl.length}</span>
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[{l:"Bet/Spin",v:row?fmtChips(row.totalBet,primaryTrack.config.unit,currency):"--",c:"#60a5fa"},{l:"Total Spent",v:row?fmtChips(row.totalInvest,primaryTrack.config.unit,currency):"--",c:"#f87171"},{l:"Partial Win",v:outcomes?fmtMoney(outcomes.partial.ret*(primaryTrack.config.unit||1),currency):"--",c:"#a78bfa"},{l:"Partial Profit",v:outcomes?signChips(outcomes.partial.profit,primaryTrack.config.unit||1,currency):"--",c:outcomes&&outcomes.partial.profit>=0?"#4ade80":"#f97316"}].map(({l,v,c}) => (
                  <div key={l} style={{background:"#0f1923",borderRadius:10,padding:"10px 8px",textAlign:"center",border:"1px solid #2d4057"}}>
                    <div style={{fontSize:8,color:"#64748b",textTransform:"uppercase",marginBottom:2}}>{l}</div>
                    <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              <FibGrid onNumber={v=>tapNumber(v,true)} onGhost={ghostSpin} dozenTargets={dts} colTargets={cts} fibRow={row} trackOverlays={trackOverlays.filter(o=>o.id!==primaryTrack.id)} flashNum={flashNum}/>
              <div style={{textAlign:"center",fontSize:9,color:"#374151",marginTop:4}}>Long-press any number to log as ghost spin (no progression)</div>
              {primaryTrack.level>=primFibTbl.length-1&&primFibTbl.length>0 && (
                <div style={{marginTop:8,background:"#7f1d1d",borderRadius:8,padding:8,textAlign:"center",fontSize:11,color:"#fca5a5"}}>Stop loss reached!</div>
              )}
            </Card>
          </div>
        )}

        {primaryTrack && primaryTrack.type==="solution" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {solBets.length>0 && (
              <Card>
                <Lbl>Active Bets</Lbl>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {solBets.map(b => {
                    const row=solTable[Math.min(b.level,solTable.length-1)];
                    return (
                      <div key={b.number} style={{background:"#0f1923",borderRadius:10,padding:"10px 12px",border:"1px solid "+primaryTrack.color,textAlign:"center",minWidth:70}}>
                        <div style={{fontSize:18,fontWeight:900,color:RED.has(+b.number)?"#f87171":"#f1f5f9"}}>{b.number}</div>
                        <div style={{fontSize:9,color:"#64748b"}}>Lvl {b.level+1}</div>
                        <div style={{fontSize:11,color:"#60a5fa",fontWeight:700}}>{row?fmtChips(row.totalBet,primaryTrack.config.unit,currency):"--"}/spin</div>
                        <button onClick={()=>addSolBet(primaryTrack.id,b.number)} style={{marginTop:3,fontSize:8,background:"transparent",border:"1px solid #7f1d1d",borderRadius:4,color:"#f87171",padding:"2px 5px",cursor:"pointer"}}>×</button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            <Card>
              <Lbl>{inRange.length>0?inRange.length+" numbers at or past entry":"No numbers in range yet"}</Lbl>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {inRange.map(num => {
                  const d=sess.droughts[num]||0, isAct=solBets.some(b=>b.number===num);
                  const over=d-solEntryThreshold, deep=d>solEntryThreshold+solTable.length;
                  return (
                    <button key={num} onClick={()=>addSolBet(primaryTrack.id,num)} style={{padding:"7px 9px",borderRadius:9,cursor:"pointer",textAlign:"center",minWidth:48,border:(isAct?"2":"1")+"px solid "+(isAct?primaryTrack.color:deep?"#dc2626":"#f59e0b"),background:isAct?"#0d2a0d":deep?"#200505":"#1c1000"}}>
                      <div style={{fontSize:14,fontWeight:900,color:RED.has(+num)?"#f87171":"#f1f5f9"}}>{num}</div>
                      <div style={{fontSize:8,color:deep?"#f87171":"#fbbf24",fontWeight:700}}>+{over}</div>
                    </button>
                  );
                })}
              </div>
            </Card>
            <Card>
              <Lbl>Tap Winning Number</Lbl>
              <SolGrid onNumber={v=>tapNumber(v,true)} droughts={sess.droughts} entry={solEntryThreshold} maxLvl={solTable.length} activeBets={solBets} wheelNums={wheelNums} trackOverlays={trackOverlays.filter(o=>o.id!==primaryTrack.id)} flashNum={flashNum}/>
            </Card>
          </div>
        )}

        {nonClosedTracks.filter(t=>t.state==="active").length>0 && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>Abandon Progression</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {nonClosedTracks.filter(t=>t.state==="active").map(t=>{
                const tbl=computeTableForTrack(t);
                const row=tbl[Math.min(t.level,tbl.length-1)];
                return(
                  <button key={t.id} onClick={()=>{if(window.confirm(`Abandon progression at level ${t.level}?`))updSess(s=>{const tr=s.tracks.find(x=>x.id===t.id);if(tr){tr.pnl-=row?row.totalInvest:0;tr.bets.push({type:"abandon",level:tr.level});tr.level=0;}});}}
                    style={{flex:1,padding:"8px 10px",borderRadius:9,border:"1px solid "+(t.color+"66"),background:"#0f1923",color:t.color,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                    {TRACK_ICONS[t.type]} Lvl {t.level}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Always-visible catch-up grid -- log spins any time */}
        <Card>
          <Lbl>{sess.sessionStartedAt ? "Tap Winning Number" : "Catch-up -- Tap to Log Spin"}</Lbl>
          <FibGrid
            onNumber={v=>tapNumber(v, nonClosedTracks.some(t=>t.state==="active"))}
            onGhost={ghostSpin}
            dozenTargets={primaryTrack&&primaryTrack.type==="fibonacci"?dts:[]}
            colTargets={primaryTrack&&primaryTrack.type==="fibonacci"?cts:[]}
            fibRow={primaryTrack&&primaryTrack.type==="fibonacci"?row:null}
            trackOverlays={trackOverlays}
            flashNum={flashNum}
          />
          <div style={{textAlign:"center",fontSize:9,color:"#374151",marginTop:4}}>Long-press = ghost spin (drought tracking only)</div>
        </Card>

      </div>
    );
  }
