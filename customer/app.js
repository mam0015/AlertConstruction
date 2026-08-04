(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  function message(text,type='error'){const box=$('message');box.textContent=text;box.className=`message show ${type}`;box.scrollIntoView({block:'nearest'})}
  function destination(){const value=new URLSearchParams(location.search).get('next')||'';return value.startsWith('/')&&!value.startsWith('//')?value:'./dashboard/index.html'}

  document.querySelectorAll('.tab').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(item=>item.classList.toggle('active',item===button));document.querySelectorAll('.form').forEach(form=>form.classList.toggle('active',form.id===button.dataset.tab))}));

  $('signin').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.submitter;button.disabled=true;button.textContent='Signing in…';
    try{
      await ACCustomerAuth.signIn($('signInEmail').value.trim(),$('signInPassword').value);
      if(!ACCustomerAuth.hasAccess())throw new Error(ACCustomerAuth.profileError()||'This account does not have customer access.');
      location.href=destination();
    }catch(error){message(error.message)}
    finally{button.disabled=false;button.textContent='Sign In'}
  });

  $('signup').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.submitter;button.disabled=true;button.textContent='Creating account…';
    try{
      const data=await ACCustomerAuth.signUp($('signUpEmail').value.trim(),$('signUpPassword').value,$('signUpName').value.trim(),$('signUpPhone').value.trim());
      if(data.access_token){message('Account created. Opening your dashboard…','good');setTimeout(()=>location.href=destination(),600)}
      else message('Check your email to verify your account, then sign in.','good');
    }catch(error){message(error.message)}
    finally{button.disabled=false;button.textContent='Create Customer Account'}
  });

  $('resetRequestBtn').addEventListener('click',async()=>{const email=$('signInEmail').value.trim();if(!email)return message('Enter your email in the Sign In form first.');try{await ACCustomerAuth.requestPasswordReset(email);message('Password reset email sent.','good')}catch(error){message(error.message)}});
  $('resendBtn').addEventListener('click',async()=>{const email=$('signUpEmail').value.trim();if(!email)return message('Enter the account email first.');try{await ACCustomerAuth.resendVerification(email);message('Verification email sent again.','good')}catch(error){message(error.message)}});
  $('signOutBtn').addEventListener('click',async()=>{await ACCustomerAuth.signOut();render()});

  async function render(){
    await ACCustomerAuth.ready;const user=ACCustomerAuth.user(),active=ACCustomerAuth.hasAccess();
    $('guest').style.display=user?'none':'block';$('account').style.display=user?'block':'none';
    if(!user)return;
    $('accountEmail').textContent=user.email||'';
    if(!active&&ACCustomerAuth.profileError())message(ACCustomerAuth.profileError());
  }
  ACCustomerAuth.ready.then(render);render();
})();
