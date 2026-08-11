(function(global){
  'use strict';

  const config=global.AC_PLATFORM_CONFIG||{};
  const SESSION_KEY='ac_auth_session_v1';
  const PRESENCE_ID_KEY='ac_presence_session_id_v1';
  const PRESENCE_SENT_KEY='ac_presence_started_v1';
  const AUTH_SCRIPT_SRC=document.currentScript?.src||'';
  const TEAM_ROLES=new Set(['owner','admin','manager','estimator','site_supervisor','worker','builder']);
  const SAVE_ROLES=new Set(['owner','admin','estimator','manager','builder']);
  const TOOL_ROLES={
    electrical:['owner','admin'],
    plumbing:['owner','admin'],
    cladding:['owner','admin'],
    'renovation-budget':['owner','admin'],
    'property-estimate':['owner','admin'],
    'plan-ai':['owner','admin'],
    'quote-analysis':['owner','admin'],
    invoice:['owner','admin'],
    'permit-checklist':['owner','admin'],
    projects:['owner','admin','estimator','manager','site_supervisor'],
    checklist:['owner','admin','manager','site_supervisor'],
    catalogue:['owner','admin'],
    'photo-timeline':['owner','admin','manager','site_supervisor','estimator'],
    finance:['owner','admin'],
    builder:['owner','admin']
  };

  let session=readSession();
  let profile=null;
  let customerProfile=null;
  let accountContext=null;
  let workspace=null;
  let profileError='';
  let pendingJoinCount=0;
  let readyResolve;
  let presenceTimer=null;
  let pendingTimer=null;
  const ready=new Promise(resolve=>readyResolve=resolve);

  function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}}
  function eventDetail(){return{session,profile,customerProfile,accountContext,workspace,profileError,pendingJoinCount}}
  function saveSession(value){session=value||null;if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY);global.dispatchEvent(new CustomEvent('ac-auth-changed',{detail:eventDetail()}))}
  function base(){return String(config.supabaseUrl||'').replace(/\/$/,'')}
  function appRoot(){
    if(AUTH_SCRIPT_SRC)return new URL('../',AUTH_SCRIPT_SRC);
    const markers=['/customer-login/','/team-login/','/customer-portal/','/access-status/','/request-job/','/login/'];
    const marker=markers.find(value=>location.pathname.includes(value));
    if(marker)return new URL(location.pathname.slice(0,location.pathname.indexOf(marker)+1),location.origin);
    return new URL(location.pathname.replace(/[^/]*$/,''),location.origin);
  }
  function portalRedirect(portal='login',invitationToken=''){
    const path=({customer:'customer-login/',team:'team-login/',login:'login/'})[portal]||'login/';
    const url=new URL(path,appRoot());
    if(portal==='team'&&invitationToken)url.searchParams.set('invite',String(invitationToken));
    return url.href;
  }
  function publicHeaders(extra={}){return{apikey:config.publishableKey||'','Content-Type':'application/json',...extra}}
  async function request(path,options={}){
    if(!base()||!config.publishableKey)throw new Error('Account service is not configured.');
    const response=await fetch(base()+path,{...options,headers:publicHeaders(options.headers||{})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.msg||data.error_description||data.message||data.error||`Account service error (${response.status}).`);
    return data;
  }
  async function fetchUser(accessToken){return request('/auth/v1/user',{headers:{Authorization:`Bearer ${accessToken}`}})}
  function cleanAuthUrl(paramsAreQuery){
    const query=new URLSearchParams(location.search);
    if(paramsAreQuery){['access_token','refresh_token','token_type','expires_in','expires_at','type','error','error_description'].forEach(key=>query.delete(key))}
    const text=query.toString();
    history.replaceState(null,'',location.pathname+(text?`?${text}`:''));
  }
  async function consumeAuthRedirect(){
    const hashParams=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
    const queryParams=new URLSearchParams(location.search);
    const usingHash=hashParams.has('access_token')||hashParams.has('error');
    const params=usingHash?hashParams:queryParams;
    const redirectError=params.get('error_description')||params.get('error');
    if(redirectError){cleanAuthUrl(!usingHash);throw new Error(String(redirectError).replace(/\+/g,' '))}
    const accessToken=params.get('access_token');
    if(!accessToken)return'';
    const user=await fetchUser(accessToken);
    const expiresIn=Number(params.get('expires_in')||3600);
    saveSession({access_token:accessToken,refresh_token:params.get('refresh_token')||'',token_type:params.get('token_type')||'bearer',expires_in:expiresIn,expires_at:Math.floor(Date.now()/1000)+expiresIn,user});
    const type=params.get('type')||'';
    if(type)sessionStorage.setItem('ac_auth_redirect_type',type);
    cleanAuthUrl(!usingHash);
    return type;
  }
  async function signIn(email,password){
    const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
    saveSession(data);sessionStorage.removeItem(PRESENCE_SENT_KEY);await loadProfile();return data;
  }
  async function signUpFor(accountType,email,password,fullName,portal,invitationToken=''){
    const redirect=portalRedirect(portal,invitationToken);
    const data=await request(`/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',body:JSON.stringify({email,password,data:{account_type:accountType,full_name:String(fullName||'').trim()}})});
    if(data.access_token){saveSession(data);sessionStorage.removeItem(PRESENCE_SENT_KEY)}
    await loadProfile();
    return data;
  }
  function signUpCustomer(email,password,fullName=''){return signUpFor('customer',email,password,fullName,'customer')}
  function signUpTeam(email,password,fullName='',invitationToken=''){return signUpFor('team',email,password,fullName,'team',invitationToken)}
  async function signUp(email,password,companyName,teamCode=''){
    if(String(teamCode||'').trim())throw new Error('Permanent Team Codes were retired in V53. Open the individual secure invitation link from your company Owner.');
    return signUpCustomer(email,password,companyName||'');
  }
  async function refresh(){
    if(!session?.refresh_token)return null;
    try{const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});saveSession(data);return data}
    catch(_){clearIdentity();saveSession(null);return null}
  }
  function clearIdentity(){profile=null;customerProfile=null;accountContext=null;workspace=null;profileError='';pendingJoinCount=0;clearInterval(presenceTimer);clearInterval(pendingTimer);presenceTimer=null;pendingTimer=null}
  async function signOut(){
    try{await recordPresence('sign_out')}catch(_){}
    try{if(session?.access_token)await request('/auth/v1/logout',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}})}catch(_){}
    clearIdentity();sessionStorage.removeItem(PRESENCE_SENT_KEY);sessionStorage.removeItem(PRESENCE_ID_KEY);sessionStorage.removeItem('ac_team_invitation_token_v53');saveSession(null);
  }
  async function ensure(){if(!session)return null;const expires=Number(session.expires_at||0)*1000;if(expires&&expires<Date.now()+60000)await refresh();return session}
  async function headers(){const current=await ensure();return current?.access_token?{Authorization:`Bearer ${current.access_token}`}:{}}
  async function restRows(path,current=session){
    if(!current?.access_token)return[];
    const response=await fetch(`${base()}${path}`,{headers:publicHeaders({Authorization:`Bearer ${current.access_token}`})});
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.message||`Account check failed (${response.status}).`)}
    return response.json();
  }
  async function fetchAccountContext(current){
    const response=await fetch(`${base()}/rest/v1/rpc/get_ac_account_context`,{method:'POST',headers:publicHeaders({Authorization:`Bearer ${current.access_token}`}),body:'{}'});
    if(response.ok)return response.json();
    if([404,406].includes(response.status))return null;
    const data=await response.json().catch(()=>({}));
    if(String(data.code||'').includes('PGRST202'))return null;
    throw new Error(data.message||`Account context check failed (${response.status}).`);
  }
  function legacyContext(){
    if(!profile)return{account_type:'unclassified',status:'setup_required',can_access_management:false,can_access_customer_portal:false};
    const active=profile.active!==false&&!['pending','rejected'].includes(profile.role);
    return{account_type:'team',status:active?'active':profile.role==='pending'?'accepted_pending':profile.role==='rejected'?'rejected':'revoked',role:profile.role,organisation_id:profile.organisation_id,can_access_management:active,can_access_customer_portal:false,legacy:true};
  }
  async function loadProfile(){
    profile=null;customerProfile=null;accountContext=null;workspace=null;profileError='';pendingJoinCount=0;
    const current=await ensure();if(!current?.user?.id)return null;
    try{
      accountContext=await fetchAccountContext(current);
      if(!accountContext){
        const rows=await restRows(`/rest/v1/profiles?id=eq.${encodeURIComponent(current.user.id)}&select=id,organisation_id,role,full_name,email,active,created_at,updated_at`,current);
        profile=rows[0]||null;accountContext=legacyContext();
      }else if(accountContext.account_type==='team'){
        const rows=await restRows(`/rest/v1/profiles?id=eq.${encodeURIComponent(current.user.id)}&select=id,organisation_id,role,full_name,email,active,created_at,updated_at`,current);
        profile=rows[0]||null;
      }else if(accountContext.account_type==='customer'){
        const rows=await restRows(`/rest/v1/ac_customer_profiles?id=eq.${encodeURIComponent(current.user.id)}&select=id,email,full_name,phone,active,created_at,updated_at`,current);
        customerProfile=rows[0]||null;
      }
      if(accountContext.account_type==='team'&&!profile)profileError='No authorised team profile was found.';
      if(profile?.organisation_id&&accountContext.can_access_management)await loadWorkspace(current);
      if(profile?.role==='owner'&&accountContext.can_access_management)await refreshPendingCount(false);
      if(hasAccess()){startPresence();startPendingMonitor()}
    }catch(error){profileError=error.message||'The secure account context could not be checked.'}
    global.dispatchEvent(new CustomEvent('ac-auth-changed',{detail:eventDetail()}));return profile||customerProfile;
  }
  function user(){return session?.user||null}
  function currentProfile(){return profile}
  function currentCustomerProfile(){return customerProfile}
  function context(){return accountContext}
  function currentWorkspace(){return workspace}
  async function loadWorkspace(current=session){
    workspace=null;if(!profile?.organisation_id||!current?.access_token)return null;
    try{const rows=await restRows(`/rest/v1/organisations?id=eq.${encodeURIComponent(profile.organisation_id)}&select=id,name,created_at,updated_at`,current);workspace=rows[0]||null}catch(_){}
    return workspace;
  }
  function role(){return profile?.role||accountContext?.role||''}
  function accountType(){return accountContext?.account_type||''}
  function isCustomer(){return accountType()==='customer'&&accountContext?.can_access_customer_portal===true}
  function hasAccess(){return accountType()==='team'&&accountContext?.can_access_management===true&&!!profile&&profile.active!==false&&TEAM_ROLES.has(role())}
  function can(...roles){return hasAccess()&&(!roles.length||roles.includes(role())||role()==='owner')}
  function canSave(){return hasAccess()&&SAVE_ROLES.has(role())}
  function canUseTool(tool){const allowed=TOOL_ROLES[String(tool||'')]||[];return hasAccess()&&allowed.includes(role())}
  function allowedTools(){return Object.keys(TOOL_ROLES).filter(canUseTool)}
  function isPending(){return accountType()==='team'&&['pending','accepted_pending','awaiting_approval'].includes(String(accountContext?.status||profile?.role||''))}
  function isRejected(){return accountType()==='team'&&accountContext?.status==='rejected'}
  function roleLabel(value=role()){return({owner:'Owner',admin:'Admin',estimator:'Estimator',manager:'Project Manager',site_supervisor:'Site Supervisor',worker:'Worker',pending:'Pending Owner Approval',rejected:'Join Request Declined',builder:'Builder',customer:'Customer'})[value]||String(value||'Member').replace(/_/g,' ')}
  function managementDestination(value=role()){
    return new URL('management/',appRoot()).href;
  }
  function portalDestination(){if(isCustomer())return new URL('customer-portal/',appRoot()).href;if(hasAccess())return managementDestination();return new URL('access-status/',appRoot()).href}
  async function requestPasswordReset(email,portal='login'){const redirect=portalRedirect(portal);return request(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',body:JSON.stringify({email})})}
  async function resendVerification(email,portal='login'){const redirect=portalRedirect(portal);return request(`/auth/v1/resend?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',body:JSON.stringify({type:'signup',email})})}
  async function updatePassword(password){const current=await ensure();if(!current?.access_token)throw new Error('Open the password reset email again or sign in first.');const updated=await request('/auth/v1/user',{method:'PUT',headers:{Authorization:`Bearer ${current.access_token}`},body:JSON.stringify({password})});if(updated?.id){session.user=updated;saveSession(session)}return updated}
  async function deleteAccount(){
    const current=await ensure();if(!current?.access_token)throw new Error('Sign in again before deleting your account.');
    const response=await fetch(`${base()}/functions/v1/account-delete`,{method:'POST',headers:publicHeaders({Authorization:`Bearer ${current.access_token}`}),body:JSON.stringify({confirmation:'DELETE'})});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||data.message||`Account deletion failed (${response.status}).`);
    clearIdentity();saveSession(null);['ac_project_workspace_v1','ac_active_project_v1','ac_cloud_sync_checkpoint_v1','ac_price_catalogue_cache_v1'].forEach(key=>localStorage.removeItem(key));try{indexedDB.deleteDatabase('ac_project_files_v1')}catch(_){}return data;
  }
  async function rpc(name,body={},keepalive=false){
    const current=await ensure();if(!current?.access_token)throw new Error('Sign in again to continue.');
    const response=await fetch(`${base()}/rest/v1/rpc/${name}`,{method:'POST',keepalive,headers:publicHeaders({Authorization:`Bearer ${current.access_token}`}),body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||`${name} failed.`);return data;
  }
  async function publicRpc(name,body={}){
    const auth=await headers();
    const response=await fetch(`${base()}/rest/v1/rpc/${name}`,{method:'POST',headers:publicHeaders(auth),body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||`${name} failed.`);return data;
  }
  function inspectTeamInvitation(token){return publicRpc('inspect_ac_team_invitation',{p_token:String(token||'')})}
  async function acceptTeamInvitation(token){const result=await rpc('accept_ac_team_invitation',{p_token:String(token||'')});await loadProfile();return result}
  function presenceSessionId(){let value=sessionStorage.getItem(PRESENCE_ID_KEY)||'';if(!/^[0-9a-f-]{36}$/i.test(value)){value=crypto.randomUUID();sessionStorage.setItem(PRESENCE_ID_KEY,value)}return value}
  async function recordPresence(event='heartbeat',keepalive=false){if(!hasAccess())return false;const path=(location.pathname||'/').slice(0,180),device=(navigator.userAgentData?.platform||navigator.platform||'Web').slice(0,80);await rpc('record_ac_presence',{p_session_id:presenceSessionId(),p_event:event,p_path:path,p_device:device},keepalive);return true}
  function startPresence(){if(!sessionStorage.getItem(PRESENCE_SENT_KEY)){sessionStorage.setItem(PRESENCE_SENT_KEY,'1');recordPresence('sign_in').catch(()=>{})}if(!presenceTimer)presenceTimer=setInterval(()=>recordPresence('heartbeat').catch(()=>{}),180000)}
  async function refreshPendingCount(notify=true){
    if(profile?.role!=='owner'||!hasAccess()||!session?.access_token)return 0;
    const previous=pendingJoinCount;
    const response=await fetch(`${base()}/rest/v1/profiles?organisation_id=eq.${encodeURIComponent(profile.organisation_id)}&role=eq.pending&active=eq.false&select=id`,{headers:publicHeaders({Authorization:`Bearer ${session.access_token}`})});
    if(response.ok)pendingJoinCount=(await response.json()).length;
    if(notify&&pendingJoinCount!==previous)global.dispatchEvent(new CustomEvent('ac-auth-changed',{detail:eventDetail()}));return pendingJoinCount;
  }
  function startPendingMonitor(){if(profile?.role!=='owner'||pendingTimer)return;pendingTimer=setInterval(()=>{if(document.visibilityState==='visible')refreshPendingCount().catch(()=>{})},60000)}
  async function audit(action,payload={}){if(!hasAccess()||!profile?.organisation_id)return false;try{await rpc('log_ac_project_action',{p_action:action,p_project_id:payload.projectId||null,p_record_id:payload.recordId||null,p_module:payload.module||null,p_details:payload.details||{}});return true}catch(_){return false}}
  async function init(){let redirectType='';try{redirectType=await consumeAuthRedirect()}catch(error){profileError=error.message||'The secure email link could not be opened.'}await ensure();if(session)await loadProfile();readyResolve(session);global.dispatchEvent(new CustomEvent('ac-auth-ready',{detail:{...eventDetail(),redirectType}}));if(redirectType)global.dispatchEvent(new CustomEvent('ac-auth-redirect',{detail:{type:redirectType}}))}

  global.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')recordPresence('heartbeat').catch(()=>{})});
  global.ACAuth={ready,signIn,signUp,signUpCustomer,signUpTeam,signOut,refresh,headers,user,profile:currentProfile,customerProfile:currentCustomerProfile,context,workspace:currentWorkspace,role,roleLabel,accountType,isCustomer,can,canSave,canUseTool,allowedTools,isPending,isRejected,hasAccess,loadProfile,loadWorkspace,refreshPendingCount,pendingJoinCount:()=>pendingJoinCount,isSignedIn:()=>!!session,profileError:()=>profileError,requestPasswordReset,resendVerification,updatePassword,deleteAccount,audit,recordPresence,inspectTeamInvitation,acceptTeamInvitation,managementDestination,portalDestination,appRoot,config,toolRoles:TOOL_ROLES};
  init();
})(window);
