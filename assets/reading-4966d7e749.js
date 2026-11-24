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
