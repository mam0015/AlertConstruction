(function(){
  'use strict';
  const scene=document.getElementById('requestScene');
  const sticky=document.getElementById('requestSticky');
  const before=document.getElementById('requestBefore');
  const after=document.getElementById('requestAfter');
  const bar=document.getElementById('requestBar');
  const percent=document.getElementById('requestPercent');
  const scrollHint=document.getElementById('requestScrollHint');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking=false;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

  function update(){
    ticking=false;
    if(!scene||!sticky||reduced)return;
    const rect=scene.getBoundingClientRect();
    const distance=Math.max(1,scene.offsetHeight-window.innerHeight);
    const progress=clamp(-rect.top/distance,0,1);
    sticky.style.setProperty('--req-reveal',`${(progress*100).toFixed(2)}%`);
    sticky.style.setProperty('--req-scale',(1.035-progress*.015).toFixed(4));
    sticky.style.setProperty('--bar-width',`${(progress*100).toFixed(1)}%`);
    sticky.style.setProperty('--scroll-opacity',String(clamp(1-progress*5,0,1)));
    if(bar)bar.style.width=`${(progress*100).toFixed(1)}%`;
    if(percent)percent.textContent=`${Math.round(progress*100)}%`;
    if(scrollHint)scrollHint.style.opacity=String(clamp(1-progress*5,0,1));
    const showAfter=progress>.52;
    if(before)before.style.opacity=showAfter?'0':'1';
    if(after)after.style.opacity=showAfter?'1':'0';
  }
  function requestUpdate(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
  document.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate);
  update();
})();
