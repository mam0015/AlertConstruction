(function(global){
  'use strict';

  const THEME_KEY='ac_product_theme_v1';
  const script=document.currentScript;
  const root=script?new URL('../',script.src):new URL('../',location.href);

  function applyTheme(value){
    const theme=value==='light'?'light':'dark';
    document.documentElement.dataset.acTheme=theme;
    localStorage.setItem(THEME_KEY,theme);
    document.querySelectorAll('[data-theme-label]').forEach(node=>node.textContent=theme==='light'?'Light':'Dark');
    document.querySelectorAll('[data-theme-toggle]').forEach(node=>node.setAttribute('aria-label',theme==='light'?'Switch to dark mode':'Switch to light mode'));
  }
  function installTheme(){
    applyTheme(localStorage.getItem(THEME_KEY)||'dark');
    document.querySelectorAll('[data-theme-toggle]').forEach(button=>button.addEventListener('click',()=>applyTheme(document.documentElement.dataset.acTheme==='light'?'dark':'light')));
  }
  function safeNext(){
    const raw=new URLSearchParams(location.search).get('next')||'';
    if(!raw)return'';
    try{const url=new URL(raw,location.origin);return url.origin===location.origin&&url.pathname.startsWith(root.pathname)?url.href:''}catch(_){return''}
  }
  function relative(path){return new URL(path,root).href}
  function statusUrl(reason='access_required'){const url=new URL('access-status/',root);url.searchParams.set('reason',reason);return url.href}
  function correctPortal(){
    if(global.ACAuth?.isCustomer?.())return relative('customer-portal/');
    if(global.ACAuth?.hasAccess?.())return global.ACAuth.managementDestination();
    return statusUrl(global.ACAuth?.isPending?.()?'pending':global.ACAuth?.isRejected?.()?'rejected':'access_required');
  }
  async function guard(area){
    if(!global.ACAuth)throw new Error('Secure account service is unavailable.');
    await global.ACAuth.ready;
    const signedIn=global.ACAuth.isSignedIn();
    if(area==='customer'){
      if(!signedIn){location.replace(relative(`customer-login/?next=${encodeURIComponent(location.pathname+location.search)}`));return false}
      if(!global.ACAuth.isCustomer()){location.replace(statusUrl('customer_only'));return false}
      return true;
    }
    if(area==='management'){
      if(!signedIn){location.replace(relative(`team-login/?next=${encodeURIComponent(location.pathname+location.search)}`));return false}
      if(!global.ACAuth.hasAccess()){location.replace(statusUrl(global.ACAuth.isPending()?'pending':global.ACAuth.isRejected()?'rejected':'management_required'));return false}
      return true;
    }
    if(area==='owner'){
      if(!(await guard('management')))return false;
      if(!global.ACAuth.can('owner')){location.replace(statusUrl('owner_only'));return false}
      return true;
    }
    return true;
  }
  function redirectAfterSignIn(){const next=safeNext();location.replace(next||correctPortal())}
  function signOutTo(path='login/'){return global.ACAuth.signOut().then(()=>location.replace(relative(path)))}

  global.ACAccountContext={root,relative,safeNext,statusUrl,correctPortal,guard,redirectAfterSignIn,signOutTo,applyTheme,installTheme};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installTheme);else installTheme();
})(window);
