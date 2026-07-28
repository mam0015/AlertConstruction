(function(){
  'use strict';
  var topbar=document.getElementById('appTopbar');
  var navToggle=document.getElementById('appNavToggle');
  var globalNav=document.getElementById('appGlobalNav');
  var toolsTrigger=document.getElementById('appToolsTrigger');
  var toolsMenu=document.getElementById('appToolsMenu');
  var scene=document.getElementById('buildScene');
  var rig=document.getElementById('houseRig');
  var complete=document.getElementById('houseComplete');
  var buildLine=document.getElementById('buildLine');
  var blueprint=document.getElementById('blueprintLines');
  var copy=document.getElementById('buildCopy');
  var progressBar=document.getElementById('buildProgress');
  var percent=document.getElementById('buildPercent');
  var state=document.getElementById('buildState');
  var hint=document.getElementById('scrollHint');
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ticking=false;

  function clamp(value,min,max){return Math.min(max,Math.max(min,value))}
  function setTools(open){
    if(!toolsMenu||!toolsTrigger)return;
    toolsMenu.hidden=!open;
    toolsTrigger.setAttribute('aria-expanded',String(open));
  }
  function setMobileNav(open){
    if(!topbar||!navToggle)return;
    topbar.classList.toggle('menu-open',open);
    navToggle.setAttribute('aria-expanded',String(open));
    navToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  }

  navToggle?.addEventListener('click',function(){
    setMobileNav(!topbar.classList.contains('menu-open'));
  });
  toolsTrigger?.addEventListener('click',function(event){
    event.stopPropagation();
    setTools(toolsMenu.hidden);
  });
  document.addEventListener('click',function(event){
    if(!event.target.closest('.app-tools'))setTools(false);
    if(window.innerWidth<=850&&!event.target.closest('.app-topbar'))setMobileNav(false);
  });
  document.addEventListener('keydown',function(event){
    if(event.key==='Escape'){setTools(false);setMobileNav(false)}
  });
  globalNav?.querySelectorAll('a').forEach(function(link){
    link.addEventListener('click',function(){setTools(false);setMobileNav(false)});
  });

  function updateScene(){
    ticking=false;
    topbar?.classList.toggle('scrolled',window.scrollY>24);
    if(!scene||reduced||document.documentElement.dataset.acTravel==='on')return;
    var rect=scene.getBoundingClientRect();
    var distance=Math.max(1,scene.offsetHeight-window.innerHeight);
    var raw=clamp(-rect.top/distance,0,1);
    var reveal=clamp((raw-.07)/.72,0,1);
    var right=(1-reveal)*100;
    complete.style.clipPath='inset(0 '+right.toFixed(3)+'% 0 0)';
    buildLine.style.left=(reveal*100).toFixed(2)+'%';
    buildLine.style.opacity=String(reveal>0&&reveal<.995?clamp(reveal*4,0,1):0);
    blueprint.style.opacity=String(clamp(1-reveal*1.18,0,.82));
    rig.style.transform='rotateX('+(2.2-raw*2.8).toFixed(2)+'deg) rotateY('+(-3.8+raw*7.2).toFixed(2)+'deg) translate3d(0,'+(raw*-1.3).toFixed(2)+'%, '+(raw*-46).toFixed(1)+'px) scale('+(1.045+raw*.025).toFixed(3)+')';
    progressBar.style.width=(reveal*100).toFixed(1)+'%';
    percent.textContent=Math.round(reveal*100)+'%';
    state.textContent=reveal<.34?'Structure in progress':reveal<.77?'Fit-off & finishes':'Completed home';
    var copyFade=raw<.57?1:clamp(1-(raw-.57)/.22,0,1);
    copy.style.opacity=String(copyFade);
    copy.style.transform='translate3d(0,'+(raw*-34).toFixed(1)+'px,0)';
    hint.style.opacity=String(clamp(1-raw*5,0,1));
  }
  function requestUpdate(){if(!ticking){ticking=true;requestAnimationFrame(updateScene)}}
  document.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate);
  window.addEventListener('ac-theme-changed',requestUpdate);
  window.addEventListener('ac-travel-changed',requestUpdate);
  updateScene();
})();
