(function(){
  'use strict';
  const story=document.getElementById('transformStory');
  const sticky=story?.querySelector('.transform-sticky');
  const progressBar=document.getElementById('transformProgress');
  const percent=document.getElementById('transformPercent');
  const state=document.getElementById('transformState');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking=false;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

  function update(){
    ticking=false;
    if(!story||!sticky||reduced)return;
    const rect=story.getBoundingClientRect();
    const distance=Math.max(1,story.offsetHeight-window.innerHeight);
    const progress=clamp(-rect.top/distance,0,1);
    sticky.style.setProperty('--about-reveal',`${(progress*100).toFixed(2)}%`);
    sticky.style.setProperty('--about-scale',(1.035-progress*.015).toFixed(4));
    sticky.style.setProperty('--scan-left',`${(progress*100).toFixed(2)}%`);
    sticky.style.setProperty('--scan-opacity',String(clamp(progress*(1-progress)*4,0,1)));
    sticky.style.setProperty('--before-opacity',String(clamp(1-progress*2.25,0,1)));
    sticky.style.setProperty('--before-y',`${(progress*-32).toFixed(1)}px`);
    sticky.style.setProperty('--after-opacity',String(clamp((progress-.48)*2.3,0,1)));
    sticky.style.setProperty('--after-y',`${((1-progress)*30).toFixed(1)}px`);
    sticky.style.setProperty('--bar-width',`${(progress*100).toFixed(1)}%`);
    sticky.style.setProperty('--scroll-opacity',String(clamp(1-progress*5,0,1)));
    progressBar.style.width=`${(progress*100).toFixed(1)}%`;
    percent.textContent=`${Math.round(progress*100)}%`;
    state.textContent=progress<.3?'Project overload':progress<.68?'Bringing work together':'Clean & manageable';
  }
  function requestUpdate(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
  document.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate);
  update();
})();
