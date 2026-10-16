const fs=require('fs'),D=__dirname;
const b=n=>'data:image/webp;base64,'+fs.readFileSync(`${D}/tex/${n}.webp`).toString('base64');
let s=fs.readFileSync(`${D}/src.css`,'utf8').replace('{{LEATHER}}',b('leather')).replace('{{CHARCOAL}}',b('charcoal')).replace('{{PARCHMENT}}',b('parchment'));
fs.writeFileSync(`${D}/hearth-reskin.css`,s); console.log('hearth-reskin.css',s.length,'bytes');
