document.documentElement.classList.add('js');
(() => {
  const sections=[...document.querySelectorAll('main > section')];
  const links=[...document.querySelectorAll('.topbar nav a')];
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    links.forEach(link=>{if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});
  }),{rootMargin:'-15% 0px -55% 0px'});
  sections.forEach(section=>observer.observe(section));
})();

// Hamburger menu for narrow viewports.
(() => {
  const toggle=document.querySelector('.nav-toggle');
  const nav=document.getElementById('primary-nav');
  if(!toggle||!nav)return;
  const overlay=document.createElement('button');
  overlay.className='nav-overlay';overlay.type='button';
  overlay.setAttribute('aria-label','Close navigation');overlay.tabIndex=-1;
  document.querySelector('.topbar').prepend(overlay);
  const closeNav=()=>{toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');nav.classList.remove('nav-open');document.querySelector('.topbar').classList.remove('menu-open');nav.inert=true};
  nav.inert=true;
  overlay.addEventListener('click',()=>{closeNav();toggle.focus()});
  toggle.addEventListener('click',()=>{
    const open=toggle.getAttribute('aria-expanded')==='true';
    toggle.setAttribute('aria-expanded',String(!open));
    nav.classList.toggle('nav-open',!open);
    document.querySelector('.topbar').classList.toggle('menu-open',!open);
    toggle.setAttribute('aria-label',open?'Open menu':'Close menu');
    nav.inert=open;
    if(!open)nav.querySelector('a')?.focus();
  });
  nav.addEventListener('click',e=>{if(e.target.closest('a'))closeNav()});
  document.addEventListener('keydown',e=>{
    if(!nav.classList.contains('nav-open'))return;
    if(e.key==='Escape'){closeNav();toggle.focus()}
    if(e.key==='Tab'){
      const links=[...nav.querySelectorAll('a')];
      if(e.shiftKey&&document.activeElement===links[0]){e.preventDefault();toggle.focus()}
      else if(!e.shiftKey&&document.activeElement===toggle){e.preventDefault();links[0]?.focus()}
      else if(!e.shiftKey&&document.activeElement===links.at(-1)){e.preventDefault();toggle.focus()}
    }
  });
  document.addEventListener('click',e=>{
    if(!nav.classList.contains('nav-open'))return;
    if(toggle.contains(e.target)||nav.contains(e.target))return;
    closeNav();
  });

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

// Enhance normal document scrolling without intercepting wheel or touch input.
(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const hero=document.querySelector('.hero-grid');
  const reveals=[...document.querySelectorAll('.hero-intro .intro-label,.hero-intro .intro-copy,.sticky-heading h2,.section-content > .experience-switcher,.section-content > .skills-tabs,.timeline-entry,.skill-tile,#education .plain-list li,#languages .plain-list li,#contact h2,#contact .social-icons')];
  const facts=[...document.querySelectorAll('.fact')];
  let frame=0;
  let observer;
  const counters=new Map();
  function count(el){
    const target=Number(el.dataset.count);
    const start=performance.now();
    function tick(now){
      const progress=Math.min(1,(now-start)/950);
      el.textContent=String(Math.round(target*(1-Math.pow(1-progress,3))));
      if(progress<1&&!reduced.matches)counters.set(el,requestAnimationFrame(tick));
      else{el.textContent=String(target);counters.delete(el)}
    }
    counters.set(el,requestAnimationFrame(tick));
  }
  function syncHero(){
    frame=0;
    const rect=hero.getBoundingClientRect();
    if(rect.bottom>0&&rect.top<innerHeight&&innerWidth>700&&!reduced.matches){
      hero.style.setProperty('--hero-shift',`${Math.min(55,Math.max(-55,-rect.top*.09))}px`);
    }
  }
  function scroll(){if(!frame)frame=requestAnimationFrame(syncHero)}
  function setup(){
    observer?.disconnect();
    counters.forEach((id,el)=>{cancelAnimationFrame(id);el.textContent=el.dataset.count});counters.clear();
    document.documentElement.classList.toggle('motion-ready',!reduced.matches);
    if(reduced.matches){hero.style.removeProperty('--hero-shift');return}
    reveals.forEach((el,i)=>{el.classList.add('scroll-reveal');el.style.setProperty('--reveal-delay',`${el.matches('.plain-list li')?i%3*80:0}ms`)});
    facts.forEach((el,i)=>{el.style.setProperty('--fact-offset',`${45+i*55}px`);el.style.setProperty('--reveal-delay',`${i*110}ms`)});
    observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      entry.target.classList.add('is-revealed');
      const counter=entry.target.querySelector('[data-count]');
      if(counter)count(counter);
      observer.unobserve(entry.target);
    }),{threshold:.08,rootMargin:'0px 0px -25px 0px'});
    [...reveals,...facts].forEach(el=>observer.observe(el));
    syncHero();
  }
  addEventListener('scroll',scroll,{passive:true});
  addEventListener('resize',scroll,{passive:true});
  reduced.addEventListener('change',setup);
  setup();
})();

// Dense binary rain with a soft pointer exclusion; pause when off-screen.
(() => {
  const canvas=document.querySelector('.binary-rain');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let width=0,height=0,streams=[],frame=0,last=0,visible=false;
  const pointer={x:0,y:0,active:false};
  const hero=canvas.parentElement;
  hero.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{pointer.active=false});
  window.addEventListener('blur',()=>{pointer.active=false});
  function resize(){
    const rect=canvas.getBoundingClientRect();
    width=rect.width;height=rect.height;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    streams=Array.from({length:Math.ceil(width/18)},(_,i)=>({x:i*18+5,y:Math.random()*(height+300)-300,speed:18+Math.random()*22,length:12+Math.floor(Math.random()*15),seed:Math.random()*1000}));
  }
  function draw(now){
    frame=0;
    if(!visible||document.hidden||reduced.matches){last=0;return}
    if(now-last>=50){
      const dt=last?Math.min((now-last)/1000,.1):.05;last=now;
      ctx.clearRect(0,0,width,height);
      ctx.font='13px Consolas, monospace';
      const rect=canvas.getBoundingClientRect();
      const px=pointer.x-rect.left,py=pointer.y-rect.top;
      streams.forEach(stream=>{
        stream.y+=stream.speed*dt;
        if(stream.y-stream.length*18>height)stream.y=-20;
        for(let i=0;i<stream.length;i++){
          const digitY=stream.y-i*18;
          const distance=pointer.active?Math.hypot(stream.x-px,digitY-py):Infinity;
          // A clear 110px radius with a soft 70px edge, including over links.
          const edge=Math.max(0,Math.min(1,(distance-110)/70));
          const exclusion=edge*edge*(3-2*edge);
          if(exclusion===0)continue;
          ctx.fillStyle=`rgba(255,229,74,${(1-i/stream.length)*.95*exclusion})`;
          const digit=Math.sin(stream.seed+i*23+Math.floor(now/650))>0?'1':'0';
          ctx.fillText(digit,stream.x,stream.y-i*18);
        }
      });
    }
    frame=requestAnimationFrame(draw);
  }
  function sync(){
    if(frame)cancelAnimationFrame(frame);
    frame=0;last=0;
    if(visible&&!document.hidden&&!reduced.matches)frame=requestAnimationFrame(draw);
    else ctx.clearRect(0,0,width,height);
  }
  new ResizeObserver(()=>{resize();sync()}).observe(canvas.parentElement);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()}).observe(canvas);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
})();

// Reveal navigation when the introduction reaches the top of the viewport.
(() => {
  const intro=document.querySelector('.hero-intro');
  const header=document.querySelector('.topbar');
  if(!intro||!header)return;
  document.documentElement.classList.add('deferred-nav');
  let pending=false;
  function update(){
    pending=false;
    const shown=intro.getBoundingClientRect().top<=header.offsetHeight;
    header.classList.toggle('is-visible',shown);
    header.inert=!shown;
    if(!shown){
      header.querySelector('.nav-toggle')?.setAttribute('aria-expanded','false');
      header.querySelector('nav')?.classList.remove('nav-open');
      header.classList.remove('menu-open');
      if(header.querySelector('nav'))header.querySelector('nav').inert=true;
    }
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(update)}}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('pageshow',schedule);
  update();
})();

// Scroll to local anchors without adding fragment identifiers to the URL.
(() => {
  const cleanUrl=()=>history.replaceState(history.state,'',location.pathname+location.search);
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest('a[href^="#"]');
    if(!link||link.hasAttribute('download')||link.target==='_blank')return;
    const hash=link.getAttribute('href');
    if(!hash||hash==='#')return;
    let id;
    try{id=decodeURIComponent(hash.slice(1))}catch{return}
    const target=document.getElementById(id);
    if(!target)return;
    event.preventDefault();
    target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    // Preserve keyboard and skip-link navigation as well as visual scrolling.
    const temporary=!target.hasAttribute('tabindex');
    if(temporary)target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
    if(temporary)target.addEventListener('blur',()=>target.removeAttribute('tabindex'),{once:true});
    if(location.hash)cleanUrl();
  });
  // Honor existing bookmarked fragments on entry, then clean the address bar.
  function resolveHash(){
    if(!location.hash)return;
    let id;
    try{id=decodeURIComponent(location.hash.slice(1))}catch{cleanUrl();return}
    const target=document.getElementById(id);
    if(target)target.scrollIntoView({behavior:'instant',block:'start'});
    cleanUrl();
  }
  addEventListener('hashchange',resolveHash);
  if(document.readyState==='complete')resolveHash();
  else addEventListener('load',resolveHash,{once:true});
})();
