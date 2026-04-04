#!/usr/bin/env node
// Nexus Roulette — Build Script
// Concatenates source files in dependency order, compiles JSX, bundles React, outputs index.html

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const REACT = path.join(__dirname, '../node_modules/react/umd/react.production.min.js');
const REACTDOM = path.join(__dirname, '../node_modules/react-dom/umd/react-dom.production.min.js');
const OUT = path.join(__dirname, '../index.html');

// Files concatenated in dependency order
const FILES = [
  // Pure data / constants
  'constants.js',
  // Engine — depends on constants
  'engine.js',
  // Session factories — depends on engine
  'session.js',
  // Simulation engine — depends on engine + constants
  'simulation.js',
  // Base UI — depends on constants
  'components/ui.jsx',
  'components/RouletteIcon.jsx',
  // Grids — depends on engine + constants + ui
  'components/grids.jsx',
  'components/ResultFlash.jsx',
  // Track panels — depends on grids + ui + engine
  'components/TrackPanel.jsx',
  // Modals — depends on ui
  'components/modals.jsx',
  // Sim UI — depends on simulation + ui + engine
  'components/SimModePage.jsx',
  // Page components — inner functions, depend on everything above
  // These are defined as inner functions of App, included via App.jsx
  // App — depends on everything
  'App.jsx',
];

console.log('Building Nexus Roulette...');

const combined = FILES.map(f => {
  const filePath = path.join(SRC, f);
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`  ${f.padEnd(35)} ${content.split('\n').length} lines`);
  return `\n// ===== ${f} =====\n` + content;
}).join('\n');

console.log(`\nTotal source: ${combined.split('\n').length} lines`);

// Compile
let compiled;
try {
  const result = babel.transformSync(combined, {
    presets: [
      ['@babel/preset-react', { runtime: 'classic' }],
      ['@babel/preset-env', { targets: { ie: 11 }, modules: 'commonjs', useBuiltIns: false }]
    ],
    filename: 'app.jsx'
  });
  compiled = result.code;
  console.log(`Compiled: ${Math.round(compiled.length / 1024)}KB`);
} catch (e) {
  console.error('Compile error:', e.message.slice(0, 300));
  process.exit(1);
}

const react = fs.readFileSync(REACT, 'utf8');
const reactdom = fs.readFileSync(REACTDOM, 'utf8');

const iife = `(function(){
  function require(m){
    if(m==='react')return window.React;
    if(m==='react-dom')return window.ReactDOM;
    return{};
  }
  var module={exports:{}},exports=module.exports;
  ${compiled}
  var App=module.exports['default']||module.exports;
  class EB extends React.Component{
    constructor(p){super(p);this.state={e:null};}
    static getDerivedStateFromError(e){return{e:e};}
    render(){
      if(this.state.e)return React.createElement('pre',
        {style:{color:'#f87171',padding:'20px',fontSize:'11px',whiteSpace:'pre-wrap',background:'#0f1923',minHeight:'100vh',margin:0}},
        'Error: '+this.state.e.message+'\\n\\n'+this.state.e.stack
      );
      return this.props.children;
    }
  }
  ReactDOM.createRoot(document.getElementById('root')).render(
    React.createElement(EB,null,React.createElement(App,null))
  );
})();`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Nexus Roulette">
<meta name="theme-color" content="#0f1923">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<title>Nexus Roulette Tracker</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#0f1923;min-height:100%;}
button{-webkit-tap-highlight-color:transparent;touch-action:manipulation;font-family:inherit;cursor:pointer;}
#root{min-height:100vh;}
</style>
</head>
<body>
<div id="root"></div>
<script>${react}</script>
<script>${reactdom}</script>
<script>
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js');}
${iife}
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html);
console.log(`\n✓ Built: ${OUT}`);
console.log(`  Size: ${Math.round(html.length / 1024)}KB`);
