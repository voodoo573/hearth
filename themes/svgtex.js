const enc=s=>'data:image/svg+xml,'+encodeURIComponent(s.replace(/\s+/g,' ').trim());
const stone=`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120">
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .09 -.02"/></filter>
<filter id="d"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" seed="2"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .35 -.08"/></filter>
<rect width="180" height="120" filter="url(#d)"/>
<rect x="0" y="0" width="100" height="60" fill="rgba(255,255,255,.025)"/><rect x="50" y="60" width="90" height="60" fill="rgba(0,0,0,.07)"/>
<rect x="100" y="0" width="80" height="60" fill="rgba(0,0,0,.04)"/>
<rect width="180" height="120" filter="url(#n)"/>
<g fill="none" stroke-linecap="square">
<path d="M0 1H180M0 61H180M100 1V61M0 1V61M50 61V120M140 61V120" stroke="rgba(0,0,0,.5)" stroke-width="2.4"/>
<path d="M0 3.2H180M0 63.2H180M102.2 3V61M2.2 3V61M52.2 63V120M142.2 63V120" stroke="rgba(255,255,255,.07)" stroke-width="1"/>
</g></svg>`;
const leather=`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
<filter id="g"><feTurbulence type="turbulence" baseFrequency=".42" numOctaves="2" seed="11" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.1 .55"/></filter>
<filter id="h"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="4" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 -.02"/></filter>
<filter id="m"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="5" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .3 -.08"/></filter>
<rect width="220" height="220" filter="url(#m)"/><rect width="220" height="220" filter="url(#g)" opacity=".28"/><rect width="220" height="220" filter="url(#h)"/></svg>`;
module.exports={STONE:enc(stone),LEATHER:enc(leather)};
