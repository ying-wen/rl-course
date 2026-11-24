(()=>{const root=document.documentElement,$=id=>document.getElementById(id),menus=[];
function menu(bid,mid,wide,open){const b=$(bid),m=$(mid);if(!b||!m)return;
 const x={b,m,set(o,back){if(o)for(const y of menus)if(y!==x)y.set(false);m.hidden=!o;b.setAttribute('aria-expanded',String(o));if(o&&open)open(m,b);if(!o&&back)b.focus()}};
 menus.push(x);b.addEventListener('click',e=>{e.stopPropagation();x.set(m.hidden)});
 m.addEventListener('click',e=>{if(e.target.closest('a'))x.set(false)});
 if(wide)matchMedia(wide).addEventListener('change',e=>{if(e.matches)x.set(false)})}
menu('yw-more','yw-menu','(min-width:768px)');
menu('nav-more','nav-menu','(min-width:921px)');
menu('ch-btn','ch-pop',null,(m,b)=>{
 const cur=root.dataset.chapter||m.dataset.current||'';
 for(const r of m.querySelectorAll('.ch-row')){const on=cur!==''&&r.dataset.ch===cur,a=r.querySelector('.ch-main');r.classList.toggle('cur',on);on?a.setAttribute('aria-current','true'):a.removeAttribute('aria-current')}
 m.style.left='';if(!matchMedia('(max-width:767px)').matches){const r=m.getBoundingClientRect(),over=r.right-(document.documentElement.clientWidth-16);if(over>0)m.style.left=(-over)+'px'}
 const r=m.querySelector('.ch-row.cur');m.scrollTop=r?r.offsetTop-(m.clientHeight-r.offsetHeight)/2:0;
 const f=r?r.querySelector('.ch-main'):m.querySelector('a');if(f)f.focus({preventScroll:true})});
document.addEventListener('click',e=>{for(const x of menus)if(!x.m.hidden&&!x.m.contains(e.target)&&!x.b.contains(e.target))x.set(false)});
document.addEventListener('keydown',e=>{const open=menus.find(x=>!x.m.hidden);if(!open)return;
 if(e.key==='Escape'){open.set(false,true);e.stopPropagation();return}
 if(!open.m.contains(document.activeElement))return;
 if(['ArrowUp','ArrowDown'].includes(e.key)){const a=[...open.m.querySelectorAll('.ch-main,.yw-menu a,.nav-menu a')].filter(x=>x.offsetParent),i=a.indexOf(document.activeElement);
  if(a.length){e.preventDefault();a[Math.max(0,Math.min(a.length-1,i<0?0:i+(e.key==='ArrowDown'?1:-1)))].focus()}}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key)||(e.key.length===1&&!e.metaKey&&!e.ctrlKey))e.stopPropagation()},true);
const h=document.querySelector('.site-header');if(h){let last=-1,raf=0;const upd=()=>{raf=0;const v=Math.max(0,Math.round(h.getBoundingClientRect().bottom));if(v!==last){last=v;root.style.setProperty('--chrome',v+'px')}};
 addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(upd)},{passive:true});addEventListener('resize',upd);
 if(window.ResizeObserver)new ResizeObserver(upd).observe(document.body);upd()}})();
(()=>{'use strict';
const root=document.documentElement,$=s=>document.querySelector(s);
const store=(()=>{try{return JSON.parse(localStorage.getItem('rl-reader')||'{}')}catch(e){return{}}})();
function save(k,v){if(v==null)delete store[k];else store[k]=v;try{localStorage.setItem('rl-reader',JSON.stringify(store))}catch(e){}}
const narrow=matchMedia('(max-width:1099px)');
// 选读 blocks stay open
document.addEventListener('toggle',e=>{const d=e.target;if(d.matches&&d.matches('details.unfolded')&&!d.open)d.open=true},true);
// contents: persistent on wide screens, a drawer below 1100px
const tocBtn=$('#toc-toggle');
function tocOpen(){return narrow.matches?root.dataset.toc==='open':root.dataset.toc!=='closed'}
function syncToc(){if(tocBtn)tocBtn.setAttribute('aria-pressed',tocOpen())}
if(narrow.matches&&root.dataset.toc==='closed')delete root.dataset.toc;
tocBtn&&tocBtn.addEventListener('click',()=>{
 if(narrow.matches){if(root.dataset.toc==='open')delete root.dataset.toc;else{root.dataset.toc='open';if(slides)slides.closeDrawer()}}
 else{if(root.dataset.toc==='closed'){delete root.dataset.toc;save('toc',null)}else{root.dataset.toc='closed';save('toc','closed')}}
 syncToc()});
narrow.addEventListener('change',()=>{if(narrow.matches)delete root.dataset.toc;else if(store.toc==='closed')root.dataset.toc='closed';else delete root.dataset.toc;syncToc()});
$('.scrim')&&$('.scrim').addEventListener('click',()=>{delete root.dataset.toc;syncToc()});
document.querySelectorAll('aside.toc a').forEach(a=>a.addEventListener('click',()=>{if(narrow.matches){delete root.dataset.toc;syncToc()}}));
syncToc();
// settings: theme and size
delete root.dataset.font;
const panel=$('#settings'),setBtn=$('#settings-toggle');
function mark(){panel&&panel.querySelectorAll('button[data-k]').forEach(b=>{const k=b.dataset.k,v=b.dataset.v;b.setAttribute('aria-pressed',String((root.dataset[k]||(k==='theme'?'auto':'m'))===v))})}
setBtn&&setBtn.addEventListener('click',e=>{e.stopPropagation();panel.hidden=!panel.hidden;setBtn.setAttribute('aria-expanded',!panel.hidden)});
panel&&panel.addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;const k=b.dataset.k,v=b.dataset.v;
 const dflt={theme:'auto',size:'m'}[k];if(v===dflt){delete root.dataset[k];save(k,null)}else{root.dataset[k]=v;save(k,v)}mark();if(slides)slides.later()});
document.addEventListener('click',e=>{if(panel&&!panel.hidden&&!panel.contains(e.target)&&e.target!==setBtn){panel.hidden=true}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(panel)panel.hidden=true;if(narrow.matches){delete root.dataset.toc;syncToc()}if(slides)slides.closeDrawer()}});
mark();
// headings, progress and the current section
let heads=[...document.querySelectorAll('article h2[id],article h3[id]')];
document.addEventListener('rl:content',()=>{heads=[...document.querySelectorAll('article h2[id],article h3[id]')];current=null;if(slides)slides.reload();if(!ticking){ticking=true;requestAnimationFrame(update)}});
const tocLinks=new Map();document.querySelectorAll('aside.toc a[href^="#"]').forEach(a=>tocLinks.set(decodeURIComponent(a.getAttribute('href').slice(1)),a));
const bar=$('.progress'),top=$('.top');
let current=null,ticking=false,openedDetails=null;
function sectionAt(){const y=innerHeight*0.28;let h=null;for(const el of heads){if(el.getBoundingClientRect().top<=y)h=el;else break}return h}
function chapterAt(){const y=innerHeight*0.28;let c=null;for(const el of document.querySelectorAll('article.chapter')){if(el.getBoundingClientRect().top<=y)c=el;else break}return c}
function update(){ticking=false;
 const total=document.documentElement.scrollHeight-innerHeight;if(bar)bar.style.width=(total>0?Math.min(100,Math.max(0,scrollY/total*100)):0)+'%';
 if(top)top.classList.toggle('shown',scrollY>innerHeight*1.5);
 if(slides)slides.sync();
 const h=sectionAt();let i=heads.indexOf(h),h2=null;while(i>=0){if(heads[i].tagName==='H2'){h2=heads[i];break}i--}
 const key=h?h.id:null;
 if(key===current)return;current=key;
 document.querySelectorAll('aside.toc a.current').forEach(a=>a.classList.remove('current'));
 document.querySelectorAll('aside.toc li.open').forEach(li=>li.classList.remove('open'));
 const a=(h&&tocLinks.get(h.id))||(h2&&tocLinks.get(h2.id));
 const a2=h2&&tocLinks.get(h2.id);
 if(a2&&a2.parentElement.tagName==='LI')a2.parentElement.classList.add('open');
 if(a){a.classList.add('current');
  const d=a.closest('details');if(d&&!d.open){if(openedDetails&&openedDetails!==d&&!openedDetails.contains(a))openedDetails.open=false;d.open=true;openedDetails=d}
  const menu=$('aside.toc');if(menu&&!narrow.matches){const box=a.getBoundingClientRect();if(box.top<menu.getBoundingClientRect().top+40||box.bottom>innerHeight-40)menu.scrollTop+=box.top-innerHeight/3}}
}
// slides column: all slides of the chapter in one column; the text and the column follow each other
const mapEl=$('#slide-map'),sp=$('.slide-panel');
const slides=mapEl&&sp?(()=>{
 const map=JSON.parse(mapEl.textContent),viewer=document.body.dataset.slideViewer||'',pages=document.body.dataset.slidePages||'';
 const wide=matchMedia('(min-width:1180px)'),still=matchMedia('(prefers-reduced-motion: reduce)');
 const btn=$('#slides-toggle'),list=sp.querySelector('.sp-list'),title=sp.querySelector('.sp-head b'),pos=sp.querySelector('.sp-pos'),
  empty=sp.querySelector('.sp-empty'),scrim=$('.sp-scrim'),PAD=14;
 let group=null,items=[],figs=[],figItem=[],io=null,cur=null,lastG=-1,driver=null,idle=0,smoothUntil=0,ptick=false;
 const isOpen=()=>wide.matches?root.dataset.slides==='open':root.dataset.sdrawer==='open';
 const docTop=el=>el.getBoundingClientRect().top+scrollY;
 const now=()=>performance.now();
 function drive(who,ms){driver=who;clearTimeout(idle);idle=setTimeout(()=>{driver=null},ms||300)}
 function plain(el){const c=el.cloneNode(true);c.querySelectorAll('.slide-link,.katex-mathml,.anchor').forEach(x=>x.remove());return c.textContent.replace(/\s+/g,' ').trim()}
 function caption(el){if(el.matches('article,main')){const t=el.querySelector('.chapter-head .ch-title')||el.querySelector('h1');return '章首'+(t?' · '+plain(t):'')}return plain(el)}
 function make(f,it){const label=f[0],page=f[1],t=f[2];
  const fig=document.createElement('figure');fig.className='sp-fig';fig.dataset.label=label;
  const box=document.createElement('button');box.type='button';box.className='sp-img';box.title='跳到正文对应位置';
  if(page){const img=document.createElement('img');img.alt=t||label;img.decoding='async';img.dataset.src=pages+String(page).padStart(4,'0')+'.webp';box.appendChild(img)}
  else box.classList.add('missing');
  const cap=document.createElement('figcaption'),s=document.createElement('span'),m=document.createElement('span'),a=document.createElement('a');
  s.className='sp-sec';s.textContent=it.cap;m.className='sp-meta';m.textContent=(page?'第 '+page+' 页':'')+(page&&t?' · ':'')+(t||'');
  a.className='sp-open';a.href=viewer+'#'+encodeURIComponent(label);a.target='_blank';a.rel='noopener';a.textContent='在课件中打开 ↗';
  cap.append(s,m,a);fig.append(box,cap);return fig}
 function build(g){
  group=g;items=[];figs=[];figItem=[];cur=null;lastG=-1;list.textContent='';if(io)io.disconnect();
  const keys=Object.keys(map).map(k=>[k,document.getElementById(k)]).filter(([,el])=>el&&g&&(el===g||g.contains(el)));
  keys.sort((a,b)=>a[1]===b[1]?0:(a[1].compareDocumentPosition(b[1])&4?-1:1));
  const at=new Map();
  for(const [k,el] of keys){const e=map[k],f=e.f||[];if(!f.length)continue;
   const it={k,el,cap:e.c||caption(el)},ref=(e.i!=null&&f[e.i])?f[e.i][0]:null;
   if(ref&&at.has(ref)){const o=at.get(ref);it.A=o.g;it.owner=o.owner}
   else{const own=ref?[f[e.i]]:f;it.A=figs.length;it.owner=it;
    for(const x of own){at.set(x[0],{g:figs.length,owner:it});const fig=make(x,it);figs.push(fig);list.appendChild(fig)}
    it.end=figs.length}
   items.push(it)}
  items.forEach((it,j)=>{const end=it.owner.end,nx=items[j+1];it.B=(nx&&nx.A>it.A&&nx.A<end)?nx.A:end;if(it.B<=it.A)it.B=it.A+1});
  figItem=figs.map(()=>null);items.forEach(it=>{for(let x=it.A;x<it.B&&x<figs.length;x++)figItem[x]=it});
  empty.hidden=figs.length>0;
  const head=g&&(g.querySelector('.chapter-head .ch-title')||g.querySelector('h1'));title.textContent=head?plain(head):'本章课件';
  io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){const img=e.target.querySelector('img[data-src]');if(img){img.src=img.dataset.src;img.removeAttribute('data-src')}io.unobserve(e.target)}},{root:list,rootMargin:'900px 0px'});
  figs.forEach(f=>io.observe(f));
 }
 function groupAt(){return chapterAt()||document.querySelector('article.chapter')||$('main')}
 // The reading line sits at 28% of the window and slides down over the last screen, so the closing sections are reached too.
 const base=()=>innerHeight*0.28,zone=()=>innerHeight*0.6,maxScroll=()=>document.documentElement.scrollHeight-innerHeight;
 function lineY(){const left=maxScroll()-scrollY,k=innerHeight*0.9-base();return left>=zone()?base():base()+k*(1-Math.max(0,left)/zone())}
 function scrollLine(Y,behavior){const b=base(),z=zone(),k=innerHeight*0.9-b,max=maxScroll();
  let u=Y-b;if(u>max-z)u=(Y-b-k+k*max/z)/(1+k/z);window.scrollTo({top:Math.max(0,Math.min(max,u)),behavior})}
 const groupEnd=()=>docTop(group)+group.getBoundingClientRect().height;
 // One position in the text for every slide page.  A page whose explanation the build marked
 // (data-slide-at="LABEL", or a chapter-0 passage with data-slide-label) sits at that element;
 // the first page of a section without a mark sits at the section heading; the rest are spaced
 // evenly between their neighbours.  Positions never decrease, so the map can be inverted.
 // A page the text explains out of slide order keeps its own place in At: scrolling follows the
 // monotone Ys, a click on that page goes to the passage (At[g]) that explains it.
 let Ys=null,At=[],Off=[],gest=0;
 function layout(){
  const N=figs.length,at=new Map(),y=new Array(N+1).fill(null),real=new Array(N).fill(null);
  group.querySelectorAll('[data-slide-at]').forEach(el=>{for(const lab of el.dataset.slideAt.split(/\s+/))if(lab&&!at.has(lab))at.set(lab,el)});
  group.querySelectorAll('[data-slide-label]:not(.slide-link)').forEach(el=>{const lab=el.dataset.slideLabel;if(!at.has(lab))at.set(lab,el)});
  const head=new Map();items.forEach(it=>head.set(it.A,it.el));
  const g0=docTop(group),C=[];
  for(let g=0;g<N;g++){const el=at.get(figs[g].dataset.label)||head.get(g);if(!el)continue;
   const t=el===group?g0:docTop(el);real[g]=el;if(t+1>=g0)C.push([g,t])}
  // The text may explain pages in another order than the deck.  Keep the longest chain of
  // anchors whose positions rise with the page number (patience sort), so one passage placed
  // far ahead cannot push every later anchor off the map; the rest are interpolated.
  const tl=[],ti=[],pr=new Array(C.length);
  C.forEach(([g,t],i)=>{let lo=0,hi=tl.length;while(lo<hi){const m=(lo+hi)>>1;if(tl[m]<=t)lo=m+1;else hi=m}
   pr[i]=lo?ti[lo-1]:-1;tl[lo]=t;ti[lo]=i});
  const keep=new Set();for(let i=ti.length?ti[ti.length-1]:-1;i>=0;i=pr[i]){y[C[i][0]]=C[i][1];keep.add(C[i][0])}
  Off=C.filter(c=>!keep.has(c[0])).length?C.slice().sort((a,b)=>a[1]-b[1]).map(([g,t])=>[g,t,keep.has(g)]):[];
  const last=ti.length?C[ti[ti.length-1]][1]:g0;
  y[N]=Math.max(last,groupEnd());if(y[0]==null)y[0]=g0;
  for(let g=1;g<N;g++){if(y[g]!=null)continue;let k=g;while(y[k]==null)k++;const a=y[g-1],b=y[k];for(let j=g;j<k;j++)y[j]=a+(b-a)*(j-g+1)/(k-g+1);g=k}
  Ys=y;At=real}
 function textS(){if(!Ys)layout();const L=scrollY+lineY()+1,N=figs.length;if(L<=Ys[0])return 0;
  // A passage that explains a page out of deck order shows that page until the next anchor.
  if(Off.length){let lo=0,hi=Off.length;while(lo<hi){const m=(lo+hi)>>1;if(Off[m][1]<=L)lo=m+1;else hi=m}
   if(lo&&!Off[lo-1][2])return Off[lo-1][0]}
  let g=0;while(g<N-1&&Ys[g+1]<=L)g++;const a=Ys[g],b=Ys[g+1];return Math.min(N-1e-3,g+(b>a?Math.min(.999,(L-a)/(b-a)):0))}
 function textY(s){if(!Ys)layout();const g=Math.max(0,Math.min(figs.length-1,Math.floor(s))),f=Math.max(0,s-g);return Ys[g]+f*(Ys[g+1]-Ys[g])}
 new ResizeObserver(()=>{Ys=null}).observe(document.body);
 function figTop(i){if(i<figs.length)return figs[i].offsetTop;const l=figs[figs.length-1];return l.offsetTop+l.offsetHeight+20}
 function panelTop(s){const g=Math.floor(s),f=s-g;return figTop(g)+f*(figTop(g+1)-figTop(g))-PAD}
 function panelS(){const T=list.scrollTop+PAD+1;let g=0;while(g<figs.length-1&&figTop(g+1)<=T)g++;const a=figTop(g),b=figTop(g+1);return g+Math.min(.999,Math.max(0,b>a?(T-a)/(b-a):0))}
 function paint(it,s){const g=Math.max(0,Math.min(figs.length-1,Math.floor(s+1e-6)));
  if(it!==cur){figs.forEach((f,i)=>f.classList.toggle('cur',!!it&&i>=it.A&&i<it.B));cur=it}
  if(g!==lastG){if(figs[lastG])figs[lastG].classList.remove('on');figs[g].classList.add('on');lastG=g;pos.textContent=(g+1)+' / '+figs.length}}
 function sync(){if(!isOpen())return;const g=groupAt();if(g!==group){build(g);Ys=null}if(!figs.length||driver==='panel'||driver==='click')return;
  drive('text');const s=textS(),k=Math.floor(s),top=panelTop(s);
  if(lastG>=0&&k!==lastG&&Math.abs(k-lastG)>1){smoothUntil=now()+(still.matches?0:450);list.scrollTo({top,behavior:still.matches?'auto':'smooth'})}
  else if(now()>smoothUntil)list.scrollTop=top;
  paint(figItem[k],s)}
 function fromPanel(){ptick=false;if(!figs.length)return;const s=panelS();scrollLine(textY(s),'instant');paint(figItem[Math.floor(s)],s)}
 list.addEventListener('scroll',()=>{if(driver!=='panel')return;drive('panel');if(!ptick){ptick=true;requestAnimationFrame(fromPanel)}},{passive:true});
 for(const type of ['wheel','touchstart','pointerdown','keydown'])addEventListener(type,e=>{const inPanel=sp.contains(e.target);
  // A gesture on the panel ends any glide still running and starts from the page the text is at.
  if(inPanel&&driver!=='panel'&&figs.length&&isOpen()){smoothUntil=0;list.scrollTo({top:panelTop(textS()),behavior:'instant'})}
  gest++;drive(inPanel?'panel':'text')},{passive:true,capture:true});
 addEventListener('scroll',()=>{if(driver==='panel')drive('panel');else if(driver==='click')drive('click',400)},{passive:true});
 list.addEventListener('click',e=>{const box=e.target.closest('.sp-img');if(!box)return;const fig=box.closest('.sp-fig'),g=figs.indexOf(fig);if(g<0)return;
  // While both columns glide to the clicked page neither one drives the other.
  drive('click',900);if(!Ys)layout();const el=At[g],to=()=>el?docTop(el):textY(g);
  scrollLine(to(),still.matches?'instant':'smooth');
  // Images above load during a long glide and move the passage: settle on it until it stays put.
  const mine=gest,settle=k=>setTimeout(()=>{if(gest!==mine||lastG!==g)return;const y=to();
   if(Math.abs(y-(scrollY+lineY()))>6){drive('click',500);scrollLine(y,'instant')}if(k<4)settle(k+1)},k?350:950);settle(0);
  list.scrollTo({top:figTop(g)-PAD,behavior:still.matches?'auto':'smooth'});paint(figItem[g],g);
  if(!wide.matches)closeDrawer()});
 function setBtn(){if(btn)btn.setAttribute('aria-pressed',String(isOpen()))}
 function closeDrawer(){if(root.dataset.sdrawer){delete root.dataset.sdrawer;setBtn()}}
 function later(){cur=null;driver=null;Ys=null;requestAnimationFrame(sync);setTimeout(()=>{cur=null;driver=null;sync()},260)}
 btn&&btn.addEventListener('click',()=>{
  if(wide.matches){if(root.dataset.slides==='open'){delete root.dataset.slides;save('slides',null)}else{root.dataset.slides='open';save('slides','open')}}
  else if(root.dataset.sdrawer==='open')closeDrawer();
  else{root.dataset.sdrawer='open';if(root.dataset.toc==='open'){delete root.dataset.toc;syncToc()}}
  setBtn();if(isOpen())later()});
 sp.querySelector('.sp-close').addEventListener('click',()=>{if(wide.matches){delete root.dataset.slides;save('slides',null)}else closeDrawer();setBtn()});
 scrim&&scrim.addEventListener('click',closeDrawer);
 wide.addEventListener('change',()=>{if(wide.matches)delete root.dataset.sdrawer;setBtn();if(isOpen())later()});
 addEventListener('load',()=>{if(isOpen())later()});
 setBtn();
 // a chapter loaded into the page (lazy book): rebuild the column for the current group
 function reload(){group=null;Ys=null;if(isOpen())later()}
 return {sync,closeDrawer,later,reload};
})():null;
addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});
addEventListener('resize',()=>{if(slides)slides.later();update()});
update();
})();
