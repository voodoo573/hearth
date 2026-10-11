// Batch 2: class & ancestry themes. Same token set as palettes.js; mk() derives
// the secondary tokens from a handful of hand-picked colours, then build2.js
// nudges any colour that misses its WCAG target and logs the change.
const hex=c=>c.replace('#','').match(/../g).map(h=>parseInt(h,16));
const toHex=a=>'#'+a.map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return toHex(A.map((x,i)=>x+(B[i]-x)*t));};
const rgba=(c,a)=>{const h=hex(c);return `rgba(${h[0]},${h[1]},${h[2]},${a})`;};
function mk(o){
  const d=o.tone==='dark', {page,card,ink,gold}=o; const v={};
  v.page=page; v['card-surface']=card;
  v['page-grad-top']=o.top||(d?mix(page,card,.7):mix(page,'#ffffff',.4));
  v['page-grad-bottom']=o.bottom||(d?mix(page,'#000000',.45):mix(page,ink,.09));
  v['page-deep']=o.deep||(d?mix(page,card,.5):mix(page,ink,.05));
  v['page-edge']=d?mix(card,ink,.14):mix(page,ink,.22);
  v['card-border']=d?rgba(o.line||gold,.27):rgba(o.line||ink,.26);
  v['card-shadow']=d?'rgba(0,0,0,.5)':rgba(ink,.15);
  v.ink=ink; v['ink-soft']=o.soft||mix(ink,page,.2); v['ink-faded']=o.faded||mix(ink,page,.36); v['rs-label-ink']=o.label||mix(ink,page,.32); v['ink-ghost']=mix(ink,page,.7);
  v.leather=o.hb; v['leather-deep']=o.ha; v['leather-soft']=mix(o.hb,ink,.15);
  v.crimson=o.crimson; v.oxblood=o.crimson; v['crimson-soft']=o.crimson;
  v.gold=gold; v['gold-deep']=mix(gold,page,.18);
  v.moss=o.moss; v['temp-hp']=o.temp; v.indigo=o.indigo;
  v.rule=d?mix(page,o.line||gold,.25):mix(page,ink,.45); v['rule-soft']=rgba(o.line||(d?gold:ink),d?.22:.3);
  v['hp-fill-start']=o.crimson; v['hp-fill-end']=o.hpEnd||gold;
  v['page-stain-dark']=rgba(o.stain||gold,d?.07:.1); v['page-stain']=rgba(o.stain2||o.stain||gold,d?.035:.06);
  v['header-a']=o.ha; v['header-b']=o.hb; v['header-ink']=o.hink; v['header-sub']=o.hsub; v['plate-ink']=o.plate;
  v['card-glow-top']=d?rgba(o.glow||ink,.07):'rgba(255,255,255,.55)'; v['card-glow-bottom']=d?rgba(o.glow||ink,.015):'rgba(255,255,255,.12)';
  v['btn-a']=o.btn[0]; v['btn-b']=o.btn[1]; v['btn-ink']=o.btnInk;
  v.focus=o.focus||(d?gold:v['gold-deep']);
  v['tex-grain']=o.grain||(d?rgba(ink,.05):rgba(ink,.04)); v['tex-shade']=o.shade||(d?'rgba(0,0,0,.5)':rgba(ink,.14));
  return {name:o.name, from:o.from, tone:o.tone, themeColor:o.themeColor||o.ha, texture:o.texture||'none', blurb:o.blurb, v};
}
module.exports = {
  dawn: mk({name:'Sacred Dawn', themeColor:'#2a2416', from:'paladin · cleric', tone:'light', texture:'parchment',
    blurb:'Sunlit white marble and temple stone, warm sun-gold accents and a pale gold header; bright, clean and hopeful.',
    page:'#f6f2e8', card:'#fffdf7', ink:'#2a2416', gold:'#7d5800', crimson:'#a3261e', moss:'#2e6b34', temp:'#1d5c70', indigo:'#2b3f75',
    ha:'#ffffff', hb:'#f0dfae', hink:'#5a3c00', hsub:'#5e4a1e', plate:'#2a2416', btn:['#d4a640','#b8892c'], btnInk:'#1c1404',
    stain:'#e8b84a', bottom:'#e7dfcc', line:'#b08a3a'}),
  shade: mk({name:'Nightshade', from:'rogue', tone:'dark', texture:'leather',
    blurb:'Soot-black leather and smoke-grey text with a thin trickle of poison green; quiet, sly and low-glare.',
    page:'#0c0c0d', card:'#18181b', ink:'#e6e6e4', gold:'#9fe36e', crimson:'#ff7d72', moss:'#66d6c2', temp:'#8ab8e8', indigo:'#a0aee0',
    ha:'#070707', hb:'#25252a', hink:'#a9ea78', hsub:'#b8b2a7', plate:'#ece8e0', btn:['#2f3a22','#1f2716'], btnInk:'#d8f5c0',
    line:'#b4aea4', glow:'#ffffff', stain:'#7ad04a'}),
  wildwood: mk({name:'Wildwood', from:'ranger · druid', tone:'dark', texture:'leather',
    blurb:'Dark bark and olive moss with ash-wood text and a fletching-red accent; earthy, tangled and outdoorsy.',
    page:'#111a0b', card:'#1b2812', ink:'#ece6cc', top:'#1c2a10', gold:'#ff8f6a', crimson:'#ff8a8a', moss:'#a8d860', temp:'#7cc4d0', indigo:'#a6b0e0',
    ha:'#0b1206', hb:'#34521c', hink:'#f0d8a0', hsub:'#c8be9e', plate:'#f0e8d0', btn:['#5c6428','#3f4618'], btnInk:'#f6f2dc',
    line:'#c8b888', stain:'#9ab040'}),
  moonsilver: mk({name:'Moonsilver', from:'wizard · elf', tone:'dark', texture:'stars',
    blurb:'Deep sea-night blue, moonlit silver text and seafoam accents, with faint drifting motes; serene and scholarly.',
    page:'#141a22', card:'#1f2733', ink:'#edf1f6', gold:'#8fe8d2', crimson:'#ff8a96', moss:'#b4e07c', temp:'#86c8ff', indigo:'#b4c2ff',
    ha:'#0e131a', hb:'#4a5a70', hink:'#f2f6fb', hsub:'#d2dce8', plate:'#eef3fa', btn:['#3e5470','#2a3c54'], btnInk:'#ffffff',
    line:'#a8c4e0', grain:'rgba(200,240,230,.55)', stain:'#4ab8a0'}),
  pact: mk({name:'Eldritch Deep', from:'warlock · drow / Underdark', tone:'dark', texture:'stars',
    blurb:'Lightless violet-black with faelight-lilac accents, sickly green lettering and glowing spores; unsettling but readable.',
    page:'#0c0814', card:'#191026', ink:'#ece6f6', gold:'#d9a6ff', crimson:'#ff8090', moss:'#b9ec6a', temp:'#7ee0f0', indigo:'#a8b0ff',
    ha:'#07040c', hb:'#2c1645', hink:'#c6f070', hsub:'#bba8d6', plate:'#efe8fa', btn:['#5a2d86','#3c1a5e'], btnInk:'#ffffff',
    line:'#b49ae0', grain:'rgba(190,240,120,.5)', stain:'#9a5ae0', stain2:'#9ad050'}),
  surge: mk({name:'Wild Surge', from:'sorcerer', tone:'dark', texture:'none',
    blurb:'A raw-magic gradient from magenta through violet to ember orange, with hot-pink accents; loud, vivid and unpredictable.',
    page:'#1c0a26', card:'#2a1036', ink:'#fbeef8', gold:'#ff8ad8', crimson:'#ff8a7a', moss:'#9ee6a0', temp:'#80d4ff', indigo:'#b0b4ff',
    top:'#4a0f4a', bottom:'#3a1208', ha:'#5a0f6e', hb:'#c2410c', hink:'#fff0c8', hsub:'#ffe0f0', plate:'#ffffff', btn:['#c0267a','#8a1658'], btnInk:'#ffffff',
    line:'#ff9ad8', stain:'#ff5aa0', stain2:'#ff8a3a'}),
  encore: mk({name:'Velvet Encore', from:'bard', tone:'dark', texture:'weave',
    blurb:'Plush wine-red velvet, gilt lettering and gold-trimmed cards like a theatre box; rich, warm and showy.',
    page:'#2c0514', card:'#420a1e', ink:'#fbeedd', top:'#3c0819', gold:'#f2c65a', crimson:'#ff8c8c', moss:'#a8dc84', temp:'#88cce0', indigo:'#b8bcf0',
    ha:'#22030e', hb:'#7a1234', hink:'#f6cf6a', hsub:'#e6c8b0', plate:'#fff4e2', btn:['#d4a63a','#a87a1c'], btnInk:'#250608',
    line:'#f2c65a', stain:'#ff4a6a', glow:'#ffc8d0'}),
  warpaint: mk({name:'Warpaint', from:'barbarian', tone:'light', texture:'parchment',
    blurb:'Bleached bone pages, a charcoal fur header and slashes of ochre-red war paint; raw, bold and primal.',
    page:'#e3e1dc', card:'#f3f2ee', ink:'#1c1916', gold:'#a2340f', crimson:'#7e0f1e', moss:'#2f6230', temp:'#1d5868', indigo:'#2a3a6c',
    ha:'#121110', hb:'#38322c', hink:'#ff8a5a', hsub:'#d8ccb8', plate:'#f6efe2', btn:['#9a3412','#6e230a'], btnInk:'#fff4ea',
    stain:'#8a5a2a', shade:'rgba(60,40,20,.2)'}),
  mountain: mk({name:'Still Mountain', themeColor:'#2a3038', from:'monk', tone:'light', texture:'weave',
    blurb:'Pale bamboo paper on a woven-mat texture, a saffron-robe header with slate lettering, saffron accents; calm, disciplined and airy.',
    page:'#ebe9cf', card:'#fbfaee', ink:'#232629', gold:'#a14800', crimson:'#a01e2a', moss:'#3c6a1e', temp:'#1d5a6c', indigo:'#2c3c70',
    ha:'#e07a10', hb:'#f4a640', hink:'#1c2024', hsub:'#1e2226', plate:'#14171a', btn:['#3e4752','#2a3038'], btnInk:'#ffffff',
    line:'#5a6470', stain:'#e8a040', stain2:'#9aa860'}),
  banner: mk({name:'Banner & Blade', from:'fighter', tone:'light', texture:'none',
    blurb:'Polished steel-grey pages under a heraldic scarlet banner with gold charges; crisp, martial and orderly.',
    page:'#cfd3d8', card:'#e9ecef', ink:'#13161b', gold:'#7a5c00', crimson:'#a3121f', moss:'#256030', temp:'#1a566c', indigo:'#1f3a7a',
    ha:'#5e0c16', hb:'#a8172a', hink:'#ffd65a', hsub:'#ffe2e2', plate:'#ffffff', btn:['#a8172a','#7a0f1e'], btnInk:'#ffffff',
    stain:'#9aa4b0', shade:'rgba(20,30,40,.18)'}),
  clockwork: mk({name:'Clockwork', from:'artificer · gnome', tone:'dark', texture:'stone',
    blurb:'Oxidised verdigris-teal panels, brass plating and copper accents; a tinker\u2019s workshop.',
    page:'#082226', card:'#0f3238', ink:'#e8f4f2', top:'#0c2e33', gold:'#f2a06a', crimson:'#ff8a80', moss:'#b0e070', temp:'#90d8ff', indigo:'#b0bcff',
    ha:'#3a2a10', hb:'#7a5a20', hink:'#ffe6a8', hsub:'#f6ead0', plate:'#fff6e0', btn:['#9a5426','#743a14'], btnInk:'#ffffff',
    line:'#d8a060', stain:'#40c0a8', stain2:'#f2a06a', shade:'rgba(0,10,10,.45)'}),
  scales: mk({name:'Dragonscale', themeColor:'#2a1e08', from:'dragonborn', tone:'dark', texture:'scales',
    blurb:'Burnished olive-bronze scales, a molten bronze header and dragonfire-red accents; armoured and fierce.',
    page:'#191708', card:'#28250f', ink:'#f6eed4', gold:'#ff7448', crimson:'#ff8a9a', moss:'#a6dc78', temp:'#7cc8d8', indigo:'#a8b4ec',
    ha:'#b07a26', hb:'#e0aa50', hink:'#2a1404', hsub:'#2a1808', plate:'#1e1004', btn:['#c4421c','#8e2c10'], btnInk:'#ffffff',
    line:'#d8b060', stain:'#ff6a2a', grain:'rgba(255,220,150,.07)'}),
  hollow: mk({name:'Honeyed Hollow', from:'halfling', tone:'light', texture:'parchment',
    blurb:'Golden honey pages, a leafy green door of a header and amber accents; snug, cheerful and homely.',
    page:'#f5d986', card:'#fff3c8', top:'#fbe8a8', ink:'#2a1f0a', gold:'#8a4a00', crimson:'#a01c1c', moss:'#2e6a1c', temp:'#1d5a6a', indigo:'#2c3a70',
    ha:'#1e3a14', hb:'#3f6a26', hink:'#ffd45a', hsub:'#d8ecb8', plate:'#fbf6dc', btn:['#3f6a26','#2a4c18'], btnInk:'#ffffff',
    stain:'#d89a20', stain2:'#7aa040'}),
  'scott-ultramarine': mk({name:"Scott's Ultramarine", from:'custom · for Scott', tone:'dark', texture:'brushed', themeColor:'#0b0c5a',
    blurb:'Saturated true-ultramarine panels, polished-silver lettering and borders under a brushed-silver header band; bold, cool and crisp.',
    page:'#0b0c5a', card:'#16249a', ink:'#f2f5fa', soft:'#d9e0ec', faded:'#bcc6dc', label:'#c4cde0', gold:'#cfdcff', crimson:'#ff9aa4', moss:'#a8eca0', temp:'#8ae6ff', indigo:'#ffffff',
    top:'#141c86', bottom:'#06073a', deep:'#101a7c',
    ha:'#b9c0cc', hb:'#eef1f6', hink:'#14208f', hsub:'#24305a', plate:'#0e1660', btn:['#dfe4ec','#b4bcc8'], btnInk:'#101a80',
    line:'#c8d2e4', glow:'#e6ecff', stain:'#3a5aff', stain2:'#c8d2e4', grain:'rgba(220,228,245,.05)', focus:'#e6ecff'}),
  'scott-marine': mk({name:"Scott's Royal Marine", from:'custom · for Scott · Royal Marines colours', tone:'dark', texture:'none', themeColor:'#081426',
    blurb:'Deep navy with gold lettering and brass buttons, edged with thin red and green regimental stripes like a stable belt; crisp and military.',
    page:'#05162a', card:'#0c2b4b', ink:'#f4efdf', soft:'#ddd6c0', faded:'#bfb79c', label:'#c9c0a2', gold:'#f5c518', crimson:'#ff7671', moss:'#5fd47a', temp:'#7fd0f0', indigo:'#a8c0ff',
    top:'#0a2442', bottom:'#020a14', deep:'#082038',
    ha:'#04101f', hb:'#0e3258', hink:'#f5c518', hsub:'#e8dcb4', plate:'#f4efdf', btn:['#e8b820','#c2940e'], btnInk:'#0a1426',
    line:'#d4a83a', glow:'#ffe6a0', stain:'#f5c518', stain2:'#2e8b3a', focus:'#f5c518', hpEnd:'#5fd47a'}),
};
