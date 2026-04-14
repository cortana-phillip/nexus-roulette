// -- Constants & Lookup Tables --
import { useState, useEffect, useMemo } from "react";

// -- Constants --
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const DZ_LABELS = ["1st Dozen","2nd Dozen","3rd Dozen"];
const COL_LABELS = ["1st Col","2nd Col","3rd Col"];
const DZ_BD = ["#f59e0b","#3b82f6","#a855f7"];
const DZ_TX = ["#fbbf24","#60a5fa","#c084fc"];
const COL_BD = ["#2dd4bf","#f472b6","#a3e635"];
const COL_TX = ["#5eead4","#f9a8d4","#bef264"];
const TRACK_COLORS = ["#f59e0b","#2dd4bf","#a855f7","#f97316","#38bdf8"];
const TRACK_ICONS = { fibonacci:"🎲", solution:"🎯", custom:"🃏" };
const KEY = "nexus-roulette-v1";
const APP_VERSION = "0.40.6";
const ROI_PRESETS = [5,10,15,20,25,30];
const UNITS = [0.25, 0.50, 1.00];

const CURRENCIES = {
  USD:{ symbol:"$",  name:"US Dollar",        flag:"🇺🇸", rate:1,      dec:2 },
  EUR:{ symbol:"€",  name:"Euro",              flag:"🇪🇺", rate:0.92,   dec:2 },
  GBP:{ symbol:"£",  name:"British Pound",     flag:"🇬🇧", rate:0.79,   dec:2 },
  JPY:{ symbol:"¥",  name:"Japanese Yen",      flag:"🇯🇵", rate:149.5,  dec:0 },
  CAD:{ symbol:"C$", name:"Canadian Dollar",   flag:"🇨🇦", rate:1.36,   dec:2 },
  AUD:{ symbol:"A$", name:"Australian Dollar", flag:"🇦🇺", rate:1.53,   dec:2 },
  MXN:{ symbol:"$",  name:"Mexican Peso",      flag:"🇲🇽", rate:17.1,   dec:2 },
  CHF:{ symbol:"Fr", name:"Swiss Franc",       flag:"🇨🇭", rate:0.90,   dec:2 },
  SGD:{ symbol:"S$", name:"Singapore Dollar",  flag:"🇸🇬", rate:1.35,   dec:2 },
  HKD:{ symbol:"HK$",name:"Hong Kong Dollar",  flag:"🇭🇰", rate:7.82,   dec:2 },
  KRW:{ symbol:"₩",  name:"Korean Won",        flag:"🇰🇷", rate:1325,   dec:0 },
  BRL:{ symbol:"R$", name:"Brazilian Real",    flag:"🇧🇷", rate:4.97,   dec:2 },
  ARS:{ symbol:"$",  name:"Argentine Peso",    flag:"🇦🇷", rate:870,    dec:0 },
  CHIP:{ symbol:"🪙",name:"Chips (no currency)",flag:"🎰", rate:1,      dec:2 },
};

const CHANGELOG = [
  { v:"0.35.0", date:"Apr 13, 2026", title:"Manual Betting", changes:[
    "Place bets directly on the roulette table — tap any number, dozen, column, or even money bet",
    "Casino-style chip selector with denominations from 25¢ to $500",
    "Undo, Clear, Double (2×), and Repeat last bet buttons",
    "Chip indicators show on the board where your bets are placed",
    "Manual bets resolve alongside strategy tracks on each spin",
    "Bets clear after every spin",
  ]},
  { v:"0.34.0", date:"Apr 13, 2026", title:"Full Roulette Table", changes:[
    "Complete roulette table with outside bets — columns (2:1), dozens, and even money",
    "Winning spin highlights the number AND all matching outside bets with golden glow",
    "Strategy bet numbers highlighted with track colors on the board",
  ]},
  { v:"0.33.0", date:"Apr 13, 2026", title:"Roulette Table Display", changes:[
    "Visual roulette table layout with traditional number arrangement",
    "Winning number highlighted with golden marker after each spin",
    "Update notifications now show what's new in each update",
  ]},
  { v:"0.32.0", date:"Apr 13, 2026", title:"Feedback Button", changes:[
    "Bug report & idea suggestion button (🐛) — floating top-left corner",
    "Submit feedback with text or voice-to-text, goes directly to developer",
  ]},
  { v:"0.31.0", date:"Apr 13, 2026", title:"Game Mode & Auto-Updates", changes:[
    "Game Mode — spin a virtual roulette wheel with your strategies, default mode on launch",
    "Auto-update detection — get notified when a new version is available, tap to update",
    "Session Profit display with last spin result",
    "Changelog versioning system",
  ]},
  { v:"0.30.0", date:"Apr 13, 2026", title:"Cloud Sync & Strategy Editing", changes:[
    "Google Drive backup — auto-saves on every session save, manual Restore from Cloud button",
    "Editing a strategy now parks the original and creates a new active variation",
    "Losses now properly tracked in session profit (was only showing wins)",
    "Hard reset now deletes cloud backup too",
    "Import session data loads and activates the imported session",
  ]},
  { v:"0.29.0", date:"Apr 13, 2026", title:"Three-Mode Layout", changes:[
    "Three app modes: Game, Live, Experimental (formerly Simulation)",
    "Full drought panel — even money, dozens, and columns all visible",
    "Session clock isolated — no more edit panel resets",
    "Network-first service worker — updates load without clearing cache",
  ]},
  { v:"1.2.0", date:"Apr 2025", title:"Cash Flow Tracking", changes:[
    "Cash Out button -- withdraw any amount from your bankroll at any time",
    "Full money flow log -- tracks every buy in and cash out with spin number",
    "Net Money In metric -- total bought in minus total cashed out",
    "Onboarding restart detects bankroll delta: increase = buy in, decrease = cash out",
    "Stats page shows Initial Bankroll, Total Buy Ins, Total Cash Outs, Net Money In, Net P&L",
    "Frequent buy ins flag losing sessions; cash outs with steady bankroll indicate casino winnings flowing out",
  ]},
  { v:"1.1.0", date:"Apr 2025", title:"Big Update", changes:[
    "Onboarding wizard -- set bankroll, currency & default buy-in on first launch",
    "Buy In modal -- add funds anytime, adjustable to the cent from any screen",
    "Multi-currency support (14 currencies) with live symbol formatting",
    "Currency conversion -- true exchange rate OR keep-same-numbers mode",
    "Bankroll tap-to-edit -- tap the bank amount in the header to edit directly",
    "In-app changelog -- you're reading it!",
    "Settings tab -- currency, default buy-in, onboarding reset",
  ]},
  { v:"1.0.0", date:"Apr 2025", title:"Live Deployment", changes:[
    "Deployed to Netlify via drag-and-drop",
    "Switched to CDN-loaded React (80KB vs 225KB bundle)",
    "Fixed ES module import/export syntax for browser compatibility",
  ]},
  { v:"0.9.0", date:"Apr 2025", title:"Spin Log", changes:[
    "Spin Log tab -- logs spins & updates droughts without advancing strategy levels",
    "Dozen & column drought heat cards (WARM/COOLING/COLD/FROZEN)",
    "Undo last spin, clear all spins",
    "Recent spins display (last 50)",
  ]},
  { v:"0.8.0", date:"Apr 2025", title:"Full Table View", changes:[
    "Full Table tab -- complete progression table for any active track",
    "Column legend explaining every header",
    "Jackpot mode columns (PW / JP return & profit) for dozen+column mix",
    "Track selector tabs for multi-track table view",
  ]},
  { v:"0.7.0", date:"Apr 2025", title:"Result Flash", changes:[
    "Result flash panel after each tracker tap with per-track outcomes",
    "Jackpot detection -- gold panel when 2+ tracks win simultaneously",
    "Net delta displayed on every result",
  ]},
  { v:"0.6.0", date:"Apr 2025", title:"Sessions", changes:[
    "Session save & resume system with localStorage persistence",
    "Session Stats tab with per-track performance breakdown",
    "Export all sessions as JSON with full metrics",
    "Tear session -- reset while keeping settings",
  ]},
  { v:"0.5.0", date:"Apr 2025", title:"Park & Play", changes:[
    "Park & Play -- freeze a track's level while still logging spins",
    "Multi-track color-coded dot overlay on number grid",
    "Track selector chip in Tracker tab",
  ]},
  { v:"0.4.0", date:"Apr 2025", title:"The Solution", changes:[
    "The Solution strategy -- single number drought targeting",
    "Entry threshold config (default 120 misses)",
    "Active bets panel with per-number level & bet size",
    "In-range number display sorted by drought depth",
  ]},
  { v:"0.3.0", date:"Apr 2025", title:"Jackpot Mode", changes:[
    "Progression Bet jackpot mode -- dozen + column mix with 6× payout math",
    "Number color coding: Jackpot (gold), Win (green), Breakeven (lime), Partial Loss (orange), Total Loss (dark)",
    "ROI stepper with quick presets 5-30%",
    "Stop loss configuration per track",
  ]},
  { v:"0.2.0", date:"Apr 2025", title:"Multi-Track", changes:[
    "Multi-track session model -- Active / Parked / Closed states",
    "Shared bankroll with per-track P&L tracking",
    "Add Track panel with Progression Bet and Solution types",
    "Unit size selection ($0.25 / $0.50 / $1.00)",
  ]},
  { v:"0.1.0", date:"Apr 2025", title:"Initial Build", changes:[
    "Basic roulette number grid with tap interaction",
    "American (0, 00) and European (0) wheel modes",
    "Bankroll & P&L display in header",
    "4-tab layout: Tracker / Full Table / Spin Log / Session Stats",
  ]},
];

// -- Currency helpers --
function getCur(code) { return CURRENCIES[code] || CURRENCIES.USD; }

function fmtMoney(amount, currCode) {
  const cur = getCur(currCode);
  if (amount === undefined || amount === null || isNaN(amount)) return cur.symbol + "0";
  const abs = Math.abs(amount);
  let str;
  if (abs >= 1e6) str = (abs/1e6).toFixed(2) + "M";
  else if (abs >= 1000) str = (abs/1000).toFixed(1) + "k";
  else str = abs.toFixed(cur.dec);
  return (amount < 0 ? "-" : "") + cur.symbol + str;
}

function fmtChips(chips, unit, currCode) {
  return fmtMoney(chips * unit, currCode);
}

// Smart format: no decimals unless fractional part exists
function fmtSmart(amount, cur) {
  var abs = Math.abs(amount);
  var hasFrac = abs % 1 !== 0;
  var str = hasFrac ? abs.toFixed(cur.dec) : abs.toFixed(0);
  return (amount<0?"-":"") + cur.symbol + str;
}
function fmtNum(amount) {
  var abs = Math.abs(amount);
  return abs % 1 !== 0 ? abs.toFixed(2) : abs.toFixed(0);
}

// -- Bet Types & Helpers --
const BET_TYPES = [
  {key:"straight",label:"#",name:"Straight",pay:36,desc:"1 number"},
  {key:"split",label:"||",name:"Split",pay:18,desc:"2 numbers"},
  {key:"street",label:"|||",name:"Street",pay:12,desc:"3 numbers"},
  {key:"corner",label:"⊞",name:"Corner",pay:9,desc:"4 numbers"},
  {key:"line",label:"═",name:"Line",pay:6,desc:"6 numbers"},
  {key:"basket",label:"B",name:"Basket",pay:7,desc:"0,00,1,2,3"},
];

function getStreet(n) {
  var row = Math.ceil(n/3);
  return [(row-1)*3+1,(row-1)*3+2,(row-1)*3+3];
}
function getVerticalSplit(n) {
  var st = getStreet(n);
  var idx = st.indexOf(n);
  if(idx<2) return [n, n+1]; // up
  return [n-1, n]; // down
}
function getHorizontalSplit(n) {
  if(n<=3) return [n, n+3]; // right
  return [n-3, n]; // left
}
function getCornerNums(n) {
  var st = getStreet(n);
  var idx = st.indexOf(n);
  var base = idx<2 ? n : n-1; // use left two in row
  if(base+3<=36) return [base, base+1, base+3, base+4];
  return [base-3, base-2, base, base+1]; // use row above
}
function getLineNums(n) {
  var st = getStreet(n);
  var first = st[0];
  if(first+3<=34) return [first,first+1,first+2,first+3,first+4,first+5];
  return [first-3,first-2,first-1,first,first+1,first+2]; // use row above
}

function betCoveredNumbers(type, target) {
  if(type==="straight") return [target];
  if(type==="basket") return ["0","00","1","2","3"];
  if(type==="split") return target.split("-");
  if(type==="street") return target.split("-");
  if(type==="corner") return target.split("-");
  if(type==="line") return target.split("-");
  if(type==="dozen") { var d=+target; return Array.from({length:12},function(_,i){return String(d*12+i+1);}); }
  if(type==="column") { var c=+target; var nums=[]; for(var i=1;i<=36;i++){if((i%3===1&&c===0)||(i%3===2&&c===1)||(i%3===0&&c===2))nums.push(String(i));} return nums; }
  if(type==="red") return Array.from(RED).map(String);
  if(type==="black") { var b=[]; for(var i=1;i<=36;i++){if(!RED.has(i))b.push(String(i));} return b; }
  if(type==="odd") { var o=[]; for(var i=1;i<=36;i+=2)o.push(String(i)); return o; }
  if(type==="even") { var e=[]; for(var i=2;i<=36;i+=2)e.push(String(i)); return e; }
  if(type==="low") { var l=[]; for(var i=1;i<=18;i++)l.push(String(i)); return l; }
  if(type==="high") { var h=[]; for(var i=19;i<=36;i++)h.push(String(i)); return h; }
  return [];
}

function betPayoutMult(type) {
  if(type==="straight") return 36;
  if(type==="split") return 18;
  if(type==="street") return 12;
  if(type==="corner") return 9;
  if(type==="line") return 6;
  if(type==="basket") return 7;
  if(type==="dozen"||type==="column") return 3;
  return 2; // even money
}

function isInsideBet(type) {
  return type==="straight"||type==="split"||type==="street"||type==="corner"||type==="line"||type==="basket";
}

function signChips(chips, unit, currCode) {
  const v = chips * unit;
  return (v >= 0 ? "+" : "-") + getCur(currCode).symbol + Math.abs(v).toFixed(getCur(currCode).dec);
}

function convertAmount(amount, fromCode, toCode) {
  const from = getCur(fromCode), to = getCur(toCode);
  return amount * (to.rate / from.rate);
}

// -- Data helpers --
const uid = () => Math.random().toString(36).slice(2,10);
const dozenOf = v => { if(v==="0"||v==="00")return null; const n=+v; return n<=12?0:n<=24?1:2; };
const colOf = v => { if(v==="0"||v==="00")return null; const n=+v; return n%3===1?0:n%3===2?1:2; };

function getWheelNums(r) {
  const b = r==="american" ? ["0","00"] : ["0"];
  for(let i=1;i<=36;i++) b.push(String(i));
  return b;
}
function initDroughts(r) { const d={}; getWheelNums(r).forEach(n=>d[n]=0); return d; }

const TABLE_LIMIT_PRESETS = [
  {label:"$0.25 min (machine)", minBet:0.25, maxBet:100,   maxTotal:500},
  {label:"$0.50 min (machine)", minBet:0.50, maxBet:100,   maxTotal:500},
  {label:"$1 min",              minBet:1,    maxBet:500,   maxTotal:5000},
  {label:"$10 min",             minBet:10,   maxBet:2000,  maxTotal:10000},
  {label:"$15 min",             minBet:15,   maxBet:2000,  maxTotal:10000},
  {label:"$25 min",             minBet:25,   maxBet:10000, maxTotal:10000},
  {label:"$100 min (high limit)",minBet:100, maxBet:10000, maxTotal:50000},
];

const EVEN_MONEY = [
  {key:"red",   label:"Red",   color:"#ef4444", pred: n=>RED.has(n)},
  {key:"black", label:"Black", color:"#64748b", pred: n=>!RED.has(n)},
  {key:"odd",   label:"Odd",   color:"#a78bfa", pred: n=>n%2===1},
  {key:"even",  label:"Even",  color:"#60a5fa", pred: n=>n%2===0},
  {key:"high",  label:"19-36", color:"#fbbf24", pred: n=>n>=19},
  {key:"low",   label:"1-18",  color:"#86efac", pred: n=>n<=18},
];