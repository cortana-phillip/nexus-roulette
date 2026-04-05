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
const TRACK_ICONS = { fibonacci:"🎲", solution:"🎯" };
const KEY = "nexus-roulette-v1";
const ROI_PRESETS = [5,10,15,20,25,30];
const UNITS = [0.25, 0.50, 1.00];

// Global haptic feedback helper
function haptic(ms) { try{ if(navigator.vibrate) navigator.vibrate(ms||8); }catch(e){} }

// Debounce guard for number taps - prevents double-tap
const _lastTap = {t:0, v:null};
function guardedTap(val, fn) {
  const now = Date.now();
  if(now - _lastTap.t < 350 && _lastTap.v === val) return; // same number within 350ms = ignore
  _lastTap.t = now; _lastTap.v = val;
  haptic(12);
  fn(val);
}

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

// Google Drive OAuth config
const GDRIVE_CLIENT_ID = "951031370415-8r3icu8790rhoh9b7qq4vccjb7o7vtvg.apps.googleusercontent.com";
const GDRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GDRIVE_BACKUP_FILENAME = "nexus-roulette-backup.json";

// -- Google Drive Sync --
const GDrive = {
  _token: null,
  _fileId: null,

  getToken() { return this._token || localStorage.getItem("nexus_gdrive_token"); },
  setToken(t) { this._token = t; localStorage.setItem("nexus_gdrive_token", t); },
  clearToken() { this._token = null; localStorage.removeItem("nexus_gdrive_token"); localStorage.removeItem("nexus_gdrive_fileid"); },

  async authorize() {
    return new Promise((resolve) => {
      const state = Math.random().toString(36).slice(2);
      const redirect = location.origin + location.pathname;
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GDRIVE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${encodeURIComponent(GDRIVE_SCOPE)}&state=${state}&prompt=consent`;
      const popup = window.open(url, "gdrive_auth", "width=500,height=600");
      const timer = setInterval(() => {
        try {
          if(popup.closed){ clearInterval(timer); resolve(null); return; }
          const hash = popup.location.hash;
          if(hash && hash.includes("access_token")) {
            const params = new URLSearchParams(hash.slice(1));
            const token = params.get("access_token");
            clearInterval(timer);
            popup.close();
            if(token){ GDrive.setToken(token); resolve(token); }
            else resolve(null);
          }
        } catch(e) {}
      }, 500);
    });
  },

  async request(method, url, body, token) {
    const t = token || this.getToken();
    if(!t) return null;
    try {
      const res = await fetch(url, {
        method, headers: {"Authorization":"Bearer "+t, "Content-Type":"application/json"},
        body: body ? JSON.stringify(body) : undefined
      });
      if(res.status===401){ this.clearToken(); return null; }
      if(!res.ok) return null;
      return res.json();
    } catch(e){ return null; }
  },

  async findFile(token) {
    const cached = localStorage.getItem("nexus_gdrive_fileid");
    if(cached) return cached;
    const res = await this.request("GET",
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${GDRIVE_BACKUP_FILENAME}'&fields=files(id,name)`,
      null, token);
    if(res && res.files && res.files.length > 0) {
      localStorage.setItem("nexus_gdrive_fileid", res.files[0].id);
      return res.files[0].id;
    }
    return null;
  },

  async save(data) {
    const token = this.getToken();
    if(!token) return false;
    try {
      const content = JSON.stringify(data);
      let fileId = await this.findFile(token);
      if(fileId) {
        // Update existing
        const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method:"PATCH", headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
          body: content
        });
        return res.ok;
      } else {
        // Create new in appDataFolder
        const meta = await this.request("POST",
          "https://www.googleapis.com/drive/v3/files",
          {name:GDRIVE_BACKUP_FILENAME, parents:["appDataFolder"]}, token);
        if(!meta) return false;
        localStorage.setItem("nexus_gdrive_fileid", meta.id);
        const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${meta.id}?uploadType=media`, {
          method:"PATCH", headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
          body: content
        });
        return res.ok;
      }
    } catch(e){ return false; }
  },

  async load() {
    const token = this.getToken();
    if(!token) return null;
    try {
      const fileId = await this.findFile(token);
      if(!fileId) return null;
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers:{"Authorization":"Bearer "+token}
      });
      if(!res.ok) return null;
      return await res.json();
    } catch(e){ return null; }
  }
};
