// Builds themes.css + contrast.md/contrast.json from palettes.js and inlines the CSS into app/index.html (run: node themes/build.js)
const fs=require('fs'); const P=require('./palettes.js');
// ---------- colour maths ----------
function parse(c){ c=c.trim(); if(c==='transparent') return [0,0,0,0];
  let m=c.match(/^#([0-9a-f]{6})$/i); if(m){const n=parseInt(m[1],16);return [n>>16&255,n>>8&255,n&255,1];}
  m=c.match(/^rgba?\(([^)]+)\)$/); if(m){const p=m[1].split(',').map(Number);return [p[0],p[1],p[2],p[3]??1];}
  throw new Error('bad colour '+c);}
const over=(fg,bg)=>{const a=fg[3];return [fg[0]*a+bg[0]*(1-a),fg[1]*a+bg[1]*(1-a),fg[2]*a+bg[2]*(1-a),1];};
const lum=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
function audit(v,hc,tone){ v=Object.assign({__tone:tone},v);
  const bgPage=[v['page-grad-top'],v.page,v['page-grad-bottom']].map(parse);
  const card=parse(v['card-surface']);
  const bgCard=[over(parse(v['card-glow-top']),card),over(parse(v['card-glow-bottom']),card)];
  const all=[...bgPage,...bgCard];
  const worst=(fg,bgs)=>Math.min(...bgs.map(b=>ratio(over(parse(fg),b),b)));
  const body=hc?7:4.5;
  const rows=[
    ['Body text (ink)','ink',all,body],['Secondary text (ink-soft)','ink-soft',all,body],
    ['Faded/meta text (ink-faded)','ink-faded',all,4.5],['Small caps labels (rs-label-ink)','rs-label-ink',all,4.5],
    ['Accent text (gold) on page','gold',bgPage,4.5],['Accent text (gold) on cards','gold',bgCard,4.5],
    ['Danger/low HP (crimson) on cards','crimson',bgCard,4.5],['Heal (moss) on cards','moss',bgCard,4.5],['Temp HP on cards','temp-hp',bgCard,4.5],
  ].map(([label,k,bgs,min])=>({label,k,val:v[k],ratio:worst(v[k],bgs),min}));
  const H=[parse(v['header-a']),parse(v['header-b'])];
  rows.push({label:'Wordmark on header plate',k:'header-ink',val:v['header-ink'],ratio:Math.min(...H.map(b=>ratio(parse(v['header-ink']),b))),min:3});
  rows.push({label:'Header subtitle (9px caps)',k:'header-sub',val:v['header-sub'],ratio:Math.min(...H.map(b=>ratio(parse(v['header-sub']),b))),min:4.5});
  const B=[parse(v['btn-a']),parse(v['btn-b'])];
  rows.push({label:'Ability plate text (plate-ink)',k:'plate-ink',val:v['plate-ink'],ratio:Math.min(...H.map(b=>ratio(parse(v['plate-ink']),b))),min:4.5});
  rows.push({label:'Primary button text',k:'btn-ink',val:v['btn-ink'],ratio:Math.min(...B.map(b=>ratio(parse(v['btn-ink']),b))),min:4.5});
  rows.push({label:'Focus ring vs page (non-text)',k:'focus',val:v.focus,ratio:worst(v.focus,bgPage),min:3});
  const S=v.turn?{turn:v.turn,select:v.select}:semantic(v.__tone||'light',hc);
  rows.push({label:'Turn ring (amber) vs page/cards (non-text)',k:'turn',val:S.turn,ratio:worst(S.turn,all),min:3});
  rows.push({label:'Selection ring (blue) vs page/cards (non-text)',k:'select',val:S.select,ratio:worst(S.select,all),min:3});
  rows.forEach(r=>r.pass=r.ratio>=r.min-1e-9); return rows;
}
// classic app themes as shipped in v1.5.0 (contrast fixes applied; were 3.82 / 4.11 / 1.99 / 2.5 light, 3.04 / 4.27 dark)
const BASE={
  light:{ 'page-grad-top':'#ecdcb0',page:'#e3cf9f','page-grad-bottom':'#d4ba80','card-surface':'#e8d6a8','card-glow-top':'rgba(255,249,232,.55)','card-glow-bottom':'rgba(255,249,232,.12)',
    ink:'#2a1a0c','ink-soft':'#4a3018','ink-faded':'#5e4527','rs-label-ink':'#5a4024',gold:'#5e4010',crimson:'#7a1e1a',moss:'#4a5e2c','temp-hp':'#2c5d6d',
    'header-a':'#1b1915','header-b':'#3e382f','header-ink':'#a87c38','header-sub':'#c9ad7a','plate-ink':'#f6e7c6','btn-a':'#4b2f1d','btn-b':'#36210f','btn-ink':'#f3e3c0',focus:'#7a5218'},
  dark:{ 'page-grad-top':'#2a1f15',page:'#221912','page-grad-bottom':'#18110b','card-surface':'#2e2218','card-glow-top':'rgba(255,214,150,.065)','card-glow-bottom':'rgba(255,214,150,.015)',
    ink:'#f3e3c0','ink-soft':'#d8c298','ink-faded':'#b9a27a','rs-label-ink':'#c4ad84',gold:'#d4a04b',crimson:'#e57866',moss:'#8aa66a','temp-hp':'#7fb2c2',
    'header-a':'#1b1915','header-b':'#3e382f','header-ink':'#d4a04b','header-sub':'#c9ad7a','plate-ink':'#f6e7c6','btn-a':'#7a5030','btn-b':'#5c3a20','btn-ink':'#fbefd6',focus:'#e2b45e'},
};
// ---------- semantic turn / selection colours (v1.5.0) ----------
function semantic(tone,hc){
  if(hc) return {turn:'#ffd83d','turn-soft':'rgba(255, 216, 61, .22)',select:'#7fb2ff','select-soft':'rgba(127, 178, 255, .28)'};
  return tone==='dark'
    ? {turn:'#f0b450','turn-soft':'rgba(240, 180, 80, .16)',select:'#6fb0f0','select-soft':'rgba(111, 176, 240, .26)'}
    : {turn:'#8a5408','turn-soft':'rgba(200, 130, 20, .18)',select:'#1b5fa8','select-soft':'rgba(27, 95, 168, .20)'};
}
// ---------- CSS ----------
const appTokens=['page','page-deep','page-edge','page-stain-dark','page-stain','ink','ink-soft','ink-faded','ink-ghost','leather','leather-deep','leather-soft',
 'crimson','oxblood','crimson-soft','gold','gold-deep','moss','temp-hp','indigo','rule','rule-soft','page-grad-top','page-grad-bottom','card-surface','card-border','card-shadow','hp-fill-start','hp-fill-end'];
const rgb=(c,a)=>{const p=parse(c);return `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${a})`;};
function block(id,t){const v=t.v,L=[];
  L.push(`/* ${t.name}${t.optional?' (optional)':''} — base tone: ${t.tone}. ${t.blurb} */`);
  L.push(`html[data-palette="${id}"] {`);
  L.push(`  --palette-tone: ${t.tone};`);
  appTokens.forEach(k=>L.push(`  --${k}: ${v[k]};`));
  const dark=t.tone==='dark', hc=id==='contrast';
  L.push(`  /* v1.x restyle tokens */`);
  L.push(`  --rs-label-ink: ${v['rs-label-ink']};`);
  L.push(`  --rs-card: linear-gradient(180deg, ${v['card-glow-top']} 0%, ${v['card-glow-bottom']} 100%), var(--card-surface);`);
  L.push(`  --rs-card-sunk: linear-gradient(180deg, ${dark?'rgba(0, 0, 0, .18), rgba(0, 0, 0, .08)':rgb(v.ink,.06)+', '+rgb(v.ink,.02)}), var(--page-deep);`);
  L.push(`  --rs-card-border: ${hc?'rgba(255, 255, 255, .75)':v['card-border']};`);
  L.push(`  --rs-gold-line: ${rgb(v.gold,hc?1:.55)};`);
  L.push(`  --rs-gold-soft: ${rgb(v.gold,hc?.22:.15)};`);
  if(hc){L.push(`  --rs-shadow-1: none; --rs-shadow-2: none; --rs-shadow-3: 0 0 0 2px #fff;`);L.push(`  --rs-inset: inset 0 0 0 0 transparent;`);}
  else if(dark){L.push(`  --rs-shadow-1: 0 1px 2px rgba(0, 0, 0, .35), 0 3px 10px rgba(0, 0, 0, .22);`);L.push(`  --rs-shadow-2: 0 2px 4px rgba(0, 0, 0, .35), 0 10px 26px rgba(0, 0, 0, .32);`);L.push(`  --rs-shadow-3: 0 4px 10px rgba(0, 0, 0, .45), 0 24px 60px rgba(0, 0, 0, .55);`);L.push(`  --rs-inset: inset 0 1px 0 ${rgb(v.ink,.07)};`);}
  else {const s=v['card-shadow'];L.push(`  --rs-shadow-1: 0 1px 1px ${s.replace(/[\d.]+\)$/,'.08)')}, 0 2px 6px ${s.replace(/[\d.]+\)$/,'.08)')};`);L.push(`  --rs-shadow-2: 0 1px 2px ${s.replace(/[\d.]+\)$/,'.10)')}, 0 6px 18px ${s.replace(/[\d.]+\)$/,'.12)')};`);L.push(`  --rs-shadow-3: 0 2px 6px ${s.replace(/[\d.]+\)$/,'.18)')}, 0 18px 48px ${s.replace(/[\d.]+\)$/,'.30)')};`);L.push(`  --rs-inset: inset 0 1px 0 rgba(255, 255, 255, .55);`);}
  L.push(`  --rs-btn: linear-gradient(180deg, ${v['btn-a']} 0%, ${v['btn-b']} 100%);`);
  L.push(`  --rs-btn-hover: linear-gradient(180deg, ${v['btn-a']} 0%, ${v['btn-a']} 100%);`);
  L.push(`  --rs-btn-ink: ${v['btn-ink']};`);
  L.push(`  --rs-btn2: linear-gradient(180deg, ${v['card-glow-top']}, ${v['card-glow-bottom']}), var(--page-deep);`);
  L.push(`  --rs-focus: ${v.focus};`);
  L.push(`  --rs-backdrop: ${dark?'rgba(0, 0, 0, .70)':rgb(v['header-a'],.55)};`);
  L.push(`  /* new hooks (see THEMES.md) */`);
  ['header-a','header-b','header-ink','header-sub','plate-ink','tex-grain','tex-shade'].forEach(k=>L.push(`  --${k}: ${v[k]};`));
  { const g=parse(v.gold),k=parse(v.ink); L.push(t.tone==='dark'||id==='contrast'?`  --gold-text: var(--gold);`:`  --gold-text: rgb(${g.slice(0,3).map((x,i)=>Math.round(x*.82+k[i]*.18)).join(', ')});   /* accent as text: a notch deeper for textures */`); }
  { const c=parse(v.crimson),k=parse(v.ink),m=c.map((x,i)=>i<3?x*(t.tone==='dark'?.85:.78)+k[i]*(t.tone==='dark'?.15:.22):x); L.push(`  --crimson-ink: rgb(${m.slice(0,3).map(Math.round).join(', ')});`); }
  { const lt=(t.tone!=='dark' && Math.min(ratio(parse(v.leather),parse(v['card-surface'])),ratio(parse(v.leather),parse(v.page)))<4.5); L.push(`  --leather-text: ${lt?'var(--ink)':'var(--leather)'};${lt?'   /* light header: leather is too pale for titles */':''}`); }
  L.push(`  --control-fill: ${rgb(v.ink,hc?.10:.07)};`);
  L.push(`  --control-fill-hover: ${rgb(v.ink,hc?.2:.13)};`);
  L.push(`  --page-texture: var(--tex-${t.texture});`);
  L.push(`  /* v1.5.0 semantic colours: amber = whose turn, blue = DM selection (same meaning in every theme) */`);
  const S=semantic(t.tone,hc); Object.entries(S).forEach(([k,c])=>L.push(`  --${k}: ${c};`));
  L.push(`}`); return L.join('\n');}
const T=require('./svgtex.js'); const head=fs.readFileSync(__dirname+'/themes-head.css','utf8').replace('{{STONE}}',T.STONE).replace('{{LEATHER}}',T.LEATHER);
const tail=fs.readFileSync(__dirname+'/themes-tail.css','utf8');
const css=[head,...Object.entries(P).map(([id,t])=>block(id,t)),tail].join('\n\n')+'\n';
fs.writeFileSync(__dirname+'/themes.css',css);
// v1.5.0: the app is a single offline file, so the CSS is inlined into app/index.html
// between <style id="hearthThemes"> … </style> (placed after every other app style block).
// batch 2 (class & ancestry themes) is built by build2.js into themes-2.css, loaded after themes.css
require('./build2.js'); const P2=require('./palettes2.js');
const css2=fs.readFileSync(__dirname+'/themes-2.css','utf8');
const APP=__dirname+'/../app/index.html';
if(fs.existsSync(APP)){const h=fs.readFileSync(APP,'utf8');const re=/(<style id="hearthThemes">\n)[\s\S]*?(<\/style>)/;
  if(!re.test(h)) throw new Error('no <style id="hearthThemes"> block in app/index.html');
  const data={};for(const [id,t] of [...Object.entries(P),...Object.entries(P2)]){data[id]={name:t.name,tone:t.tone,color:t.themeColor,texture:t.texture,group:id.startsWith('scott-')?'friends':P2[id]?'classes':(id==='contrast'?'classic':'places')}; if(t.from)data[id].from=t.from;
    if(t.font)data[id].font=t.font; if(t.cards)data[id].cards=t.cards; if(t.optional)data[id].optional=true;
    data[id].blurb=t.blurb.split(/[;]/)[0].replace(/\.$/,'')+'.'; data[id].sw=[t.v.page,t.v['card-surface'],t.v.ink,t.v.gold,t.v['header-b'],t.v.crimson];}
  const re2=/\/\* @palettes \*\/[\s\S]*?\/\* @palettes-end \*\//; let h2=h.replace(re,(m,a,b)=>a+css+'\n'+css2+b);
  if(!re2.test(h2)) throw new Error('no @palettes marker in app/index.html');
  h2=h2.replace(re2,()=>'/* @palettes */window.HEARTH_PALETTES = '+JSON.stringify(data)+';/* @palettes-end */');
  fs.writeFileSync(APP,h2);console.log('injected into app/index.html');}
// ---------- contrast report ----------
const out={}; let md='# Hearth themes: WCAG contrast check\n\nWorst case across the page gradient (top / middle / bottom) and both ends of the card glow. AA body text = 4.5:1 (High Contrast is held to AAA, 7:1). Large wordmark = 3:1. Focus ring = 3:1 (non-text).\n\n';
const sum=[];
for(const [id,t] of [['light',{name:'Current Light (parchment)',v:BASE.light}],['dark',{name:'Current Dark',v:BASE.dark}],...Object.entries(P)]){
  const rows=audit(t.v,id==='contrast',t.tone||(id==='dark'?'dark':'light')); out[id]={name:t.name,rows};
  const fails=rows.filter(r=>!r.pass);
  sum.push(`| ${t.name} | ${rows[0].ratio.toFixed(2)} | ${rows[1].ratio.toFixed(2)} | ${rows[2].ratio.toFixed(2)} | ${rows[3].ratio.toFixed(2)} | ${Math.min(rows[4].ratio,rows[5].ratio).toFixed(2)} | ${fails.length?'**FAIL**: '+fails.map(f=>f.label+' '+f.ratio.toFixed(2)).join('; '):'pass'} |`);
  md+=`## ${t.name}\n\n| Check | Colour | Ratio | Needs | |\n|---|---|---|---|---|\n`+rows.map(r=>`| ${r.label} | \`${r.val}\` | ${r.ratio.toFixed(2)}:1 | ${r.min} | ${r.pass?'pass':'**FAIL**'} |`).join('\n')+'\n\n';
}
md=md.replace('\n\n## ','\n\n## Summary (worst-case ratios)\n\n| Theme | Body ink | Secondary | Faded | Labels | Gold text | Result |\n|---|---|---|---|---|---|---|\n'+sum.join('\n')+'\n\n## ');
fs.writeFileSync(__dirname+'/contrast.md',md); fs.writeFileSync(__dirname+'/contrast.json',JSON.stringify(out,null,1));
console.log(sum.join('\n'));
