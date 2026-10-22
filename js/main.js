document.documentElement.classList.add('js');
(() => {
  const track=document.querySelector('main');
  const panels=[...track.querySelectorAll(':scope > section')];
  const links=[...document.querySelectorAll('.topbar nav a')];
  const desktop=matchMedia('(min-width:901px)');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const previous=document.querySelector('[data-section-prev]');
  const next=document.querySelector('[data-section-next]');
  const label=document.querySelector('[data-section-label]');
  let active=0,locked=false,release;
  function update(index){
    active=index;
    links.forEach(a=>{if(a.hash==='#'+panels[index].id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});
    previous.disabled=index===0;next.disabled=index===panels.length-1;
    label.textContent=links.find(a=>a.hash==='#'+panels[index].id)?.textContent||'';
    history.replaceState(null,'','#'+panels[index].id);
  }
  function go(index,animate=true){
    index=Math.max(0,Math.min(panels.length-1,index));
    if(desktop.matches){
      track.scrollTo({left:index*track.clientWidth,behavior:animate&&!reduced.matches?'smooth':'instant'});
    }else panels[index].scrollIntoView({behavior:'instant',block:'start'});
    update(index);
  }
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    const index=panels.findIndex(p=>'#'+p.id===a.hash);
    if(index<0)return;
    a.addEventListener('click',e=>{e.preventDefault();go(index)});
  });
  previous.addEventListener('click',()=>go(active-1));
  next.addEventListener('click',()=>go(active+1));
  window.addEventListener('wheel',e=>{
    if(!desktop.matches||e.ctrlKey||e.target.closest('.topbar'))return;
    const horizontal=Math.abs(e.deltaX)>Math.abs(e.deltaY);
    const raw=horizontal?e.deltaX:e.deltaY;
    if(Math.abs(raw)<2)return;
    const delta=raw*(e.deltaMode===1?16:e.deltaMode===2?track.clientHeight:1);
    e.preventDefault();
    const panel=panels[active];
    const canRead=!horizontal&&(delta>0?panel.scrollTop+panel.clientHeight<panel.scrollHeight-2:panel.scrollTop>2);
    if(canRead){panel.scrollTop+=delta;return;}
    clearTimeout(release);release=setTimeout(()=>locked=false,240);
    if(locked)return;
    locked=true;go(active+Math.sign(delta),false);
  },{passive:false});
  track.addEventListener('keydown',e=>{
    if(!desktop.matches||e.target!==track)return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(active+(e.key==='ArrowRight'?1:-1))}
  });
  let scrollFrame;
  track.addEventListener('scroll',()=>{
    if(!desktop.matches)return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame=requestAnimationFrame(()=>{
      const i=Math.round(track.scrollLeft/track.clientWidth);
      if(i!==active)update(Math.max(0,Math.min(panels.length-1,i)));
    });
  },{passive:true});
  const mobileObserver=new IntersectionObserver(entries=>{
    if(desktop.matches)return;
    entries.forEach(e=>{if(e.isIntersecting)update(panels.indexOf(e.target))});
  },{rootMargin:'-90px 0px -65% 0px',threshold:0});
  panels.forEach(p=>mobileObserver.observe(p));
  const initial=panels.findIndex(p=>'#'+p.id===location.hash);
  requestAnimationFrame(()=>go(initial<0?0:initial,false));
  let resizeTimer;
  let previousWidth=window.innerWidth;
  addEventListener('resize',()=>{
    // Mobile browser bars change height during reading; never reset that scroll.
    if(window.innerWidth===previousWidth)return;
    previousWidth=window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>go(active,false),150);
  });
  addEventListener('hashchange',()=>{const i=panels.findIndex(p=>'#'+p.id===location.hash);if(i>=0)go(i,false)});
  track.tabIndex=0;
  track.setAttribute('aria-label','Resume. Use the menu or previous and next controls to navigate.');
})();

// Hamburger menu for narrow viewports.
(() => {
  const toggle=document.querySelector('.nav-toggle');
  const nav=document.getElementById('primary-nav');
  if(!toggle||!nav)return;
  const closeNav=()=>{toggle.setAttribute('aria-expanded','false');nav.classList.remove('nav-open')};
  toggle.addEventListener('click',()=>{
    const open=toggle.getAttribute('aria-expanded')==='true';
    toggle.setAttribute('aria-expanded',String(!open));
    nav.classList.toggle('nav-open',!open);
  });
  nav.addEventListener('click',e=>{if(e.target.closest('a'))closeNav()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNav()});
  document.addEventListener('click',e=>{
    if(!nav.classList.contains('nav-open'))return;
    if(toggle.contains(e.target)||nav.contains(e.target))return;
    closeNav();
  });
  matchMedia('(min-width:901px)').addEventListener('change',closeNav);
})();

// Shared accessible keyboard behaviour for the two tab groups.
document.querySelectorAll('[role="tablist"]').forEach(list=>{
  const tabs=[...list.querySelectorAll('[role="tab"]')];
  function select(tab,focus=false){
    tabs.forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!selected});
    if(focus)tab.focus();
  }
  const initialTab=tabs.find(t=>t.getAttribute('aria-selected')==='true')||tabs[0];
  if(initialTab)select(initialTab);
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>select(tab));
    tab.addEventListener('keydown',e=>{
      let target;
      if(e.key==='ArrowRight')target=(i+1)%tabs.length;
      if(e.key==='ArrowLeft')target=(i-1+tabs.length)%tabs.length;
      if(e.key==='Home')target=0;
      if(e.key==='End')target=tabs.length-1;
      if(target!==undefined){e.preventDefault();select(tabs[target],true)}
    });
  });
});
