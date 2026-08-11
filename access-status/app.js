(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const reason=new URLSearchParams(location.search).get('reason')||'access_required';
  const messages={
    pending:['Waiting for Owner approval.','Your invitation was accepted, but Management Portal access remains locked until the company Owner verifies you and confirms your role.','Approval pending'],
    rejected:['Team access was declined.','This account cannot enter the Management Portal. Contact the company Owner if you believe this decision is incorrect.','Request declined'],
    management_required:['Management access required.','Customer and unclassified accounts cannot open company management routes, even with a direct URL.','Protected route'],
    customer_only:['Customer account required.','The Customer Portal only accepts verified Customer accounts. Team accounts stay in the Management Portal.','Wrong portal'],
    customer_account_required:['Customer account required.','Create a Customer account to use the private Customer Portal and later submit project requests.','Customer access'],
    wrong_portal:['Use the portal for this account.','Customer and Team sessions are separated. Continue using the portal that matches this signed-in account.','Portal separation'],
    invitation_required:['Individual invitation required.','New Team accounts cannot use a permanent shared code. Ask the company Owner for a single-use, time-limited invitation link.','Team invitation'],
    owner_only:['Owner access required.','Only the company Owner can manage invitations, approvals and security roles.','Owner security'],
    access_required:['Secure access required.','Sign in through the correct Customer or Team portal to continue.','Protected route']
  };
  async function render(){await ACAuth.ready;const content=messages[reason]||messages.access_required,context=ACAuth.context()||{};$('statusTitle').textContent=content[0];$('statusCopy').textContent=content[1];$('statusLabel').textContent=content[2];$('accountEmail').textContent=ACAuth.user()?.email||'No active account';$('accountType').textContent=context.account_type==='customer'?'Customer account':context.account_type==='team'?`${ACAuth.roleLabel(context.role)} · ${context.status||'team access'}`:'No authorised portal context';$('signOut').hidden=!ACAuth.isSignedIn();if(ACAuth.isCustomer()){$('primaryAction').textContent='Open Customer Portal';$('primaryAction').href='../customer-portal/'}else if(ACAuth.hasAccess()){$('primaryAction').textContent='Open Management Portal';$('primaryAction').href=ACAuth.managementDestination()}else if(reason==='pending'||reason==='rejected'||reason==='invitation_required'){$('primaryAction').textContent='Return to Team Sign In';$('primaryAction').href='../team-login/'}else{$('primaryAction').textContent='Choose Sign In';$('primaryAction').href='../login/'}}
  $('signOut').addEventListener('click',()=>ACAccountContext.signOutTo('login/'));render();
})();
