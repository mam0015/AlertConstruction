(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const next=ACAccountContext.safeNext();
  if(next)document.querySelectorAll('[data-portal-choice]').forEach(link=>{const url=new URL(link.dataset.portalChoice,ACAccountContext.root);url.searchParams.set('next',next);link.href=url.href});
  async function render(){
    await ACAuth.ready;
    if(!ACAuth.isSignedIn())return;
    const context=ACAuth.context()||{};
    $('sessionCard').hidden=false;
    $('sessionTitle').textContent=context.account_type==='customer'?'Customer account signed in':context.account_type==='team'?'Team account signed in':'Signed-in account found';
    $('sessionCopy').textContent=ACAuth.user()?.email||'Secure session';
    $('openPortal').href=ACAccountContext.correctPortal();
  }
  $('signOut').addEventListener('click',()=>ACAccountContext.signOutTo('login/'));
  render();
})();
