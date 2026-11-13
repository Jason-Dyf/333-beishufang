const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve('kaoyan333-site/assets/data');
function loadCtx(files){
  const w={};const ctx=vm.createContext({window:w,console});
  for(const f of files){vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});}
  return w;
}
const qfiles=fs.readdirSync(path.join(root,'quizparts')).filter(f=>/\.js$/.test(f)).map(f=>path.join(root,'quizparts',f));
const Q=(loadCtx(qfiles).K3_QRAW||[]);
const PRE={ "edu-principle":"ep", "edu-china":"cn", "edu-foreign":"wj", "edu-psych":"xl" };
const BOOKOF={ q1200:()=>"q1200_ti", dd1000:(q)=>"dd_"+(PRE[q.subj]||"ep")+"_ti" };
const cache={};
function pagesOf(bid){
  if(!cache[bid]){
    const f=path.join(root,'src','s-'+bid+'.js');
    if(!fs.existsSync(f)) return null;
    const s=loadCtx([f]).K3_SRC[bid];
    cache[bid]=s.pages.map(t=>String(t||'').replace(/\s/g,''));
  }
  return cache[bid];
}
function needle(q){ return String(q.q||'').replace(/^【[^】]*】/,'').replace(/[\s（）()　]/g,''); }
const map={};let hit=0,miss=0,skip=0;
for(const q of Q){
  const bn=BOOKOF[q.bank]; if(!bn){skip++;continue;}
  const bid=bn(q); const pages=pagesOf(bid); if(!pages){skip++;continue;}
  const n=needle(q);
  if(n.length<8){miss++;continue;}
  let pg=0;
  for(const L of [14,10,8]){
    const nd=n.slice(0,L);
    for(let i=1;i<pages.length;i++){ if(pages[i].indexOf(nd)>=0){pg=i;break;} }
    if(pg)break;
  }
  if(pg){ map[q.bank+"|"+q.id]=bid+":"+pg; hit++; } else miss++;
}
fs.writeFileSync(path.join(root,'qsrc.js'),'window.K3_QSRC='+JSON.stringify(map)+';\n');
console.log('questions',Q.length,'hit',hit,'miss',miss,'skip',skip,'keys',Object.keys(map).length);