(function(){
  'use strict';
  const INVITE_KEY='ac_team_invitation_token_v53';
  const $=id=>document.getElementById(id);
  let inviteToken='',inviteInfo=null;
  function message(text,type='error'){const box=$('message');box.textContent=text;box.className=`pa-message show ${type==='good'?'good':''}`}
  function clearMessage(){$('message').className='pa-message'}
  function setBusy(button,busy,label){button.disabled=busy;if(label)button.textContent=label}
  function selectTab(id){document.querySelectorAll('[data-tab]').forEach(item=>item.classList.toggle('active',item.dataset.tab===id));['teamSignIn','teamSignUp'].forEach(name=>$(name).hidden=name!==id);clearMessage()}
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>selectTab(button.dataset.tab)));
  function readInvite(){const query=new URLSearchParams(location.search).get('invite')||'';if(query){sessionStorage.setItem(INVITE_KEY,query);return query}return sessionStorage.getItem(INVITE_KEY)||''}
  async function inspectInvite(){
    inviteToken=readInvite();if(!inviteToken)return;
    $('inviteSummary').hidden=false;
    try{inviteInfo=await ACAuth.inspectTeamInvitation(inviteToken);if(!inviteInfo?.valid)throw new Error(inviteInfo?.message||'This invitation is no longer valid.');$('inviteCompany').textContent=inviteInfo.organisation_name||'Secure team invitation';$('inviteDetails').textContent=`Invited role: ${ACAuth.roleLabel(inviteInfo.requested_role)} • expires ${new Date(inviteInfo.expires_at).toLocaleString('en-AU')}`;$('createTab').hidden=false;if(inviteInfo.intended_email_masked)$('signUpEmail').placeholder=inviteInfo.intended_email_masked;selectTab('teamSignUp')}catch(error){inviteInfo=null;$('inviteDetails').textContent=error.message;message(error.message)}
  }
  async function acceptIfNeeded(){
    if(ACAuth.hasAccess())return ACAccountContext.redirectAfterSignIn();
    if(ACAuth.isCustomer()){location.replace(ACAccountContext.statusUrl('wrong_portal'));return}
    if(ACAuth.isPending()||ACAuth.isRejected()){location.replace(ACAccountContext.statusUrl(ACAuth.isPending()?'pending':'rejected'));return}
    if(!inviteToken){location.replace(ACAccountContext.statusUrl('invitation_required'));return}
    await ACAuth.acceptTeamInvitation(inviteToken);sessionStorage.removeItem(INVITE_KEY);location.replace(ACAccountContext.statusUrl('pending'));
  }
  $('teamSignIn').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,original=button.textContent;setBusy(button,true,'Signing in…');try{await ACAuth.signIn($('signInEmail').value.trim(),$('signInPassword').value);await acceptIfNeeded()}catch(error){message(error.message)}finally{setBusy(button,false,original)}});
  $('teamSignUp').addEventListener('submit',async event=>{event.preventDefault();if(!inviteInfo?.valid)return message('Open a valid invitation link before creating a Team account.');const button=event.submitter,original=button.textContent;setBusy(button,true,'Creating account…');try{const data=await ACAuth.signUpTeam($('signUpEmail').value.trim(),$('signUpPassword').value,$('fullName').value.trim(),inviteToken);if(data.access_token){await acceptIfNeeded();return}message('Check your email and open the verification link. Your secure invitation will continue automatically.','good')}catch(error){message(error.message)}finally{setBusy(button,false,original)}});
  $('resetRequest').addEventListener('click',async()=>{const email=$('signInEmail').value.trim();if(!email)return message('Enter your work email first.');try{await ACAuth.requestPasswordReset(email,'team');message('Password reset email sent.','good')}catch(error){message(error.message)}});
  $('resendVerification').addEventListener('click',async()=>{const email=$('signUpEmail').value.trim();if(!email)return message('Enter your invited work email first.');try{await ACAuth.resendVerification(email,'team');message('Verification email sent again.','good')}catch(error){message(error.message)}});
  $('passwordForm').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,original=button.textContent;setBusy(button,true,'Updating…');try{await ACAuth.updatePassword($('newPassword').value);$('newPassword').value='';message('Password updated successfully.','good');$('passwordForm').hidden=true}catch(error){message(error.message)}finally{setBusy(button,false,original)}});
  $('signOut').addEventListener('click',()=>ACAccountContext.signOutTo('team-login/'));
  async function render(){
    await inspectInvite();await ACAuth.ready;
    const redirectType=sessionStorage.getItem('ac_auth_redirect_type')||'';sessionStorage.removeItem('ac_auth_redirect_type');
    if(redirectType==='recovery'){$('passwordForm').hidden=false;message('Secure recovery link accepted. Enter a new password.','good')}
    else if(redirectType)message('Email verified successfully. Finishing your secure team request…','good');
    if(!ACAuth.isSignedIn())return;
    if(redirectType&&inviteToken&&!ACAuth.hasAccess()&&!ACAuth.isPending())try{await acceptIfNeeded();return}catch(error){message(error.message)}
    if(ACAuth.hasAccess()){$('guestPanel').hidden=true;$('signedPanel').hidden=false;$('signedEmail').textContent=`${ACAuth.user()?.email||''} • ${ACAuth.roleLabel()}`;$('openManagement').href=ACAuth.managementDestination();return}
    if(ACAuth.isPending()||ACAuth.isRejected())location.replace(ACAccountContext.statusUrl(ACAuth.isPending()?'pending':'rejected'));
    else if(ACAuth.isCustomer())location.replace(ACAccountContext.statusUrl('wrong_portal'));
  }
  render();
})();
