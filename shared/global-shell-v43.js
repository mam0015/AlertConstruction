(function(){
  'use strict';
  var script=document.currentScript;
  var base=script?new URL('../',script.src):new URL('../',location.href);
  var TRAVEL_KEY='ac_travel_mode_v1';
  var css=document.createElement('link');
  css.rel='stylesheet';
  css.href=new URL('shared/global-shell-v43.css?v=44',base).href;
  document.head.appendChild(css);

  function createBrand(){
    var link=document.createElement('a');
    link.className='at-global-brand';
    link.href=new URL('',base).href;
    link.setAttribute('aria-label','Alert Tradie Pro dashboard');
    link.innerHTML='<span class="at-global-brand-mark"><img src="'+new URL('assets/alert-tradie-pro-logo.png?v=44',base).href+'" alt=""></span><span class="at-global-brand-copy"><strong>Alert Tradie Pro</strong><small>Powered by Alert Construction</small></span>';
    return link;
  }

  function createNavigation(){
    var nav=document.createElement('nav');
    nav.className='at-global-nav';
    nav.setAttribute('aria-label','App navigation');
    nav.innerHTML=
      '<a href="'+new URL('',base).href+'">Dashboard</a>'+
      '<a href="'+new URL('builder/',base).href+'">Operation Hub</a>'+
      '<details class="at-global-tools"><summary>Tools <span aria-hidden="true">⌄</span></summary><div class="at-global-tools-menu">'+
        '<div class="at-global-tools-group"><strong>Estimating</strong><a href="'+new URL('electrical/',base).href+'">Electrical Estimate</a><a href="'+new URL('plumbing/',base).href+'">Plumbing Estimate</a><a href="'+new URL('cladding/',base).href+'">Cladding Estimate</a><a href="'+new URL('renovation-budget/',base).href+'">Renovation Budget</a></div>'+
        '<div class="at-global-tools-group"><strong>Analysis &amp; AI</strong><a href="'+new URL('plan-ai/',base).href+'">AI Plan Estimator</a><a href="'+new URL('quote-analysis/',base).href+'">Quote Price Analysis</a><a href="'+new URL('property-estimate/',base).href+'">Property Value Guide</a></div>'+
        '<div class="at-global-tools-group"><strong>Projects &amp; Site</strong><a href="'+new URL('projects/',base).href+'">Projects &amp; Schedule</a><a href="'+new URL('checklist/',base).href+'">Site Checklist</a><a href="'+new URL('permit-checklist/',base).href+'">Permit Checklist</a></div>'+
        '<div class="at-global-tools-group"><strong>Business</strong><a href="'+new URL('builder/?view=financial-data',base).href+'">Financial Data</a><a href="'+new URL('invoice/',base).href+'">Invoice Generator</a><a href="'+new URL('builder/?view=photo-timeline',base).href+'">Photo Timeline</a><a href="'+new URL('catalogue/',base).href+'">Price Catalogue</a></div>'+
      '</div></details>'+
      '<a href="'+new URL('projects/',base).href+'">Projects</a>'+
      '<a data-role-tool="builder" href="'+new URL('builder/?view=reports',base).href+'">Reports</a>'+
      '<a href="'+new URL('legal/support.html',base).href+'">Support</a>';
    return nav;
  }

  function installNavigation(){
    if(document.querySelector('.app-global-nav,.at-global-nav'))return;
    var host=document.querySelector('.topbar,.top');
    var platform=document.querySelector('.ac-platform');
    if(host){
      host.classList.add('at-global-host');
      var existingBrand=host.querySelector(':scope > .brand');
      if(existingBrand&&existingBrand.querySelector('.brand-wordmark')){
        host.insertBefore(createNavigation(),host.querySelector('.top-actions')||platform||null);
      }else{
        host.insertBefore(createBrand(),host.firstChild);
        if(existingBrand)existingBrand.classList.add('at-module-context');
        host.insertBefore(createNavigation(),host.querySelector('.top-actions')||platform||null);
      }
    }else{
      host=document.createElement('header');
      host.className='at-global-header';
      host.append(createBrand(),createNavigation());
      document.body.prepend(host);
      if(platform){
        platform.classList.add('ac-platform-inline');
        host.appendChild(platform);
      }
    }
    var nav=host.querySelector('.at-global-nav');
    var toggle=document.createElement('button');
    toggle.className='at-global-menu-toggle';
    toggle.type='button';
    toggle.setAttribute('aria-label','Open app navigation');
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>';
    host.insertBefore(toggle,nav);
    toggle.addEventListener('click',function(){
      var open=!host.classList.contains('at-nav-open');
      host.classList.toggle('at-nav-open',open);
      toggle.setAttribute('aria-expanded',String(open));
      toggle.setAttribute('aria-label',open?'Close app navigation':'Open app navigation');
    });
    document.addEventListener('click',function(event){
      if(!host.contains(event.target)){
        host.classList.remove('at-nav-open');
        toggle.setAttribute('aria-expanded','false');
      }
    });
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'){
        host.classList.remove('at-nav-open');
        toggle.setAttribute('aria-expanded','false');
        host.querySelectorAll('.at-global-tools[open]').forEach(function(item){item.open=false});
      }
    });
    nav.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click',function(){host.classList.remove('at-nav-open')});
    });
  }

  function installTravelMode(){
    var themeButton=document.querySelector('[data-ac-theme-toggle]');
    if(!themeButton||document.querySelector('[data-ac-travel-toggle]'))return;
    var button=document.createElement('button');
    button.className='ac-menu-item';
    button.type='button';
    button.setAttribute('data-ac-travel-toggle','');
    button.setAttribute('role','menuitem');
    button.innerHTML='<span class="ac-menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 21 4l-7.5 18-2.2-8.3z"></path><path d="m11.3 13.7 3.5-3.5"></path></svg></span><span class="ac-menu-copy"><strong>Travel mode</strong><small>Reduce motion while on the move</small></span><span class="ac-menu-value" data-ac-travel-current>Off</span>';
    themeButton.after(button);
    function apply(value){
      var on=value==='on';
      document.documentElement.dataset.acTravel=on?'on':'off';
      localStorage.setItem(TRAVEL_KEY,on?'on':'off');
      button.querySelector('[data-ac-travel-current]').textContent=on?'On':'Off';
      window.dispatchEvent(new CustomEvent('ac-travel-changed',{detail:{enabled:on}}));
    }
    button.addEventListener('click',function(){apply(document.documentElement.dataset.acTravel==='on'?'off':'on')});
    apply(localStorage.getItem(TRAVEL_KEY)||'off');
  }

  function addSocialLinks(){
    var footer=document.querySelector('.ac-legal-footer');
    if(!footer||footer.querySelector('[data-at-social]'))return;
    footer.insertAdjacentHTML('beforeend','<span data-at-social>•</span><a data-at-social href="https://www.instagram.com/alertconstruction/" rel="noopener">Instagram</a><span data-at-social>•</span><a data-at-social href="https://www.facebook.com/p/Alert-Construction-61566833507197/" rel="noopener">Facebook</a>');
  }

  function run(){
    installNavigation();
    setTimeout(function(){window.ACApplyRoleNavigation&&window.ACApplyRoleNavigation()},0);
    installTravelMode();
    setTimeout(addSocialLinks,0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
  else run();
})();
