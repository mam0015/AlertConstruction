(function(global){
  'use strict';
  const config=global.AC_PLATFORM_CONFIG||{},SESSION_KEY='ac_auth_session_v1',PRESENCE_ID_KEY='ac_presence_session_id_v1',PRESENCE_SENT_KEY='ac_presence_started_v1',AUTH_SCRIPT_SRC=document.currentScript?.src||'';
  let session=readSession(),profile=null,workspace=null,profileError='',pendingJoinCount=0,readyResolve,presenceTimer=null,pendingTimer=null;
  const SAVE_ROLES=new Set(['owner','admin','estimator','manager','builder']);
  const TOOL_ROLES={
    electrical:['owner','admin','estimator'],
    plumbing:['owner','admin','estimator'],
    cladding:['owner','admin','estimator'],
    'renovation-budget':['owner','admin','estimator'],
    'property-estimate':['owner','admin','estimator'],
    'plan-ai':['owner','admin','estimator'],
    'quote-analysis':['owner','admin','estimator'],
    'permit-checklist':['owner','admin','estimator','manager'],
    projects:['owner','admin','estimator','manager','site_supervisor'],
    checklist:['owner','admin','manager','site_supervisor'],
    catalogue:['owner','admin'],
    builder:['owner','admin','manager','site_supervisor','estimator','worker']
  };
  const ready=new Promise(resolve=>readyResolve=resolve);

  function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}}
  function eventDetail(){return{session,profile,workspace,profileError,pendingJoinCount}}
  function saveSession(value){session=value||null;if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY);global.dispatchEvent(new CustomEvent('ac-auth-changed',{detail:eventDetail()}))}
  function base(){return String(config.supabaseUrl||'').replace(/\/$/,'')}
  function appRoot(){
    if(AUTH_SCRIPT_SRC)return new URL('../',AUTH_SCRIPT_SRC);
    const marker='/login/',index=location.pathname.indexOf(marker),path=index>=0?location.pathname.slice(0,index+1):location.pathname.replace(/[^/]*$/,'');
    return new URL(path||'/',location.origin);
  }
  function authRedirect(){return new URL('login/',appRoot()).href}
  function publicHeaders(extra={}){return{apikey:config.publishableKey||'','Content-Type':'application/json',...extra}}
  async function request(path,options={}){
    if(!base()||!config.publishableKey)throw new Error('Account service is not configured.');
    const response=await fetch(base()+path,{...options,headers:publicHeaders(options.headers||{})}),data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.msg||data.error_description||data.message||data.error||`Account service error (${response.status}).`);
    return data;
  }
  async function fetchUser(accessToken){return request('/auth/v1/user',{headers:{Authorization:`Bearer ${accessToken}`}})}
  async function consumeAuthRedirect(){
    const hashParams=new URLSearchParams(String(location.hash||'').replace(/^#/,'')),queryParams=new URLSearchParams(location.search),params=hashParams.has('access_token')?hashParams:queryParams;
    const redirectError=params.get('error_description')||params.get('error');
    if(redirectError){history.replaceState(null,'',location.pathname);throw new Error(String(redirectError).replace(/\+/g,' '))}
    const accessToken=params.get('access_token');if(!accessToken)return'';
    const user=await fetchUser(accessToken),expiresIn=Number(params.get('expires_in')||3600);
    saveSession({access_token:accessToken,refresh_token:params.get('refresh_token')||'',token_type:params.get('token_type')||'bearer',expires_in:expiresIn,expires_at:Math.floor(Date.now()/1000)+expiresIn,user});
    const type=params.get('type')||'';if(type)sessionStorage.setItem('ac_auth_redirect_type',type);history.replaceState(null,'',location.pathname);return type;
  }
  async function signIn(email,password){const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});saveSession(data);sessionStorage.removeItem(PRESENCE_SENT_KEY);await loadProfile();return data}
  async function signUp(email,password,companyName,teamCode=''){const redirect=authRedirect(),data=await request(`/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',body:JSON.stringify({email,password,data:{organisation_name:companyName||'Alert Construction',team_code:String(teamCode||'').trim().toUpperCase()}})});if(data.access_token){saveSession(data);sessionStorage.removeItem(PRESENCE_SENT_KEY)}await loadProfile();return data}
  async function refresh(){if(!session?.refresh_token)return null;try{const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});saveSession(data);return data}catch(_){profile=null;workspace=null;saveSession(null);return null}}
  async function signOut(){try{await recordPresence('sign_out')}catch(_){}try{if(session?.access_token)await request('/auth/v1/logout',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}})}catch(_){}profile=null;workspace=null;profileError='';pendingJoinCount=0;clearInterval(presenceTimer);clearInterval(pendingTimer);presenceTimer=null;pendingTimer=null;sessionStorage.removeItem(PRESENCE_SENT_KEY);sessionStorage.removeItem(PRESENCE_ID_KEY);saveSession(null)}
  async function ensure(){if(!session)return null;const expires=Number(session.expires_at||0)*1000;if(expires&&expires<Date.now()+60000)await refresh();return session}
  async function headers(){const current=await ensure();return current?.access_token?{Authorization:`Bearer ${current.access_token}`}:{}}
  async function loadProfile(){
    profile=null;workspace=null;profileError='';pendingJoinCount=0;const current=await ensure();if(!current?.user?.id)return null;
    try{
      const response=await fetch(`${base()}/rest/v1/profiles?id=eq.${encodeURIComponent(current.user.id)}&select=id,organisation_id,role,full_name,email,active,created_at,updated_at`,{headers:publicHeaders({Authorization:`Bearer ${current.access_token}`})});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.message||`Profile check failed (${response.status}).`)}
      const rows=await response.json();profile=rows[0]||null;if(!profile)profileError='No authorised team profile was found.';
      if(profile?.organisation_id)await loadWorkspace(current);
      if(['owner','admin'].includes(profile?.role)&&profile.active!==false)await refreshPendingCount(false);
      if(hasAccess()){startPresence();startPendingMonitor()}
    }catch(error){profileError=error.message||'The secure team profile could not be checked.'}
    global.dispatchEvent(new CustomEvent('ac-auth-changed',{detail:eventDetail()}));return profile;
  }
  function user(){return session?.user||null}
  function currentProfile(){return profile}
  function currentWorkspace(){return workspace}
  async function loadWorkspace(current=session){
    workspace=null;if(!profile?.organisation_id||!current?.access_token)return null;
    try{const response=await fetch(`${base()}/rest/v1/organisations?id=eq.${encodeURIComponent(profile.organisation_id)}&select=id,name,join_code,join_code_rotated_at`,{headers:publicHeaders({Authorization:`Bearer ${current.access_token}`})});if(response.ok)workspace=(await response.json())[0]||null}catch(_){}
    return workspace;
  }
  function role(){return profile?.role||''}
  function hasAccess(){return !!session&&!!profile&&profile.active!==false&&!['pending','rejected'].includes(profile.role)}
  function can(...roles){return hasAccess()&&(!roles.length||roles.includes(role())||role()==='owner')}
  function canSave(){return hasAccess()&&SAVE_ROLES.has(role())}
  function canUseTool(tool){const allowed=TOOL_ROLES[String(tool||'')]||[];return hasAccess()&&allowed.includes(role())}
  function allowedTools(){return Object.keys(TOOL_ROLES).filter(canUseTool)}
  function isPending(){return !!session&&!!profile&&profile.active===false&&profile.role==='pending'}
  function roleLabel(value=role()){return({owner:'Owner',admin:'Admin',estimator:'Estimator',manager:'Project Manager',site_supervisor:'Site Supervisor',worker:'Worker',pending:'Pending Owner Approval',rejected:'Join Request Declined',builder:'Builder'})[value]||String(value||'Member').replace(/_/g,' ')}
  async function requestPasswordReset(email){const redirect=authRedirect();return request(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',body:JSON.stringify({email})})}
  async function resendVerification(email){const redirect=authRedirect();return request(`/auth/v1/resend?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',body:JSON.stringify({type:'signup',email})})}
  async function updatePassword(password){const current=await ensure();if(!current?.access_token)throw new Error('Open the password reset email again or sign in first.');const updated=await request('/auth/v1/user',{method:'PUT',headers:{Authorization:`Bearer ${current.access_token}`},body:JSON.stringify({password})});if(updated?.id){session.user=updated;saveSession(session)}return updated}
  async function deleteAccount(){
    const current=await ensure();if(!current?.access_token)throw new Error('Sign in again before deleting your account.');
    const response=await fetch(`${base()}/functions/v1/account-delete`,{method:'POST',headers:publicHeaders({Authorization:`Bearer ${current.access_token}`}),body:JSON.stringify({confirmation:'DELETE'})}),data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||data.message||`Account deletion failed (${response.status}).`);
    profile=null;workspace=null;profileError='';saveSession(null);
    ['ac_project_workspace_v1','ac_active_project_v1','ac_cloud_sync_checkpoint_v1','ac_price_catalogue_cache_v1'].forEach(key=>localStorage.removeItem(key));
    try{indexedDB.deleteDatabase('ac_project_files_v1')}catch(_){}
    return data;
  }
  async function rpc(name,body={},keepalive=false){
    const current=await ensure();if(!current?.access_token)throw new Error('Sign in again to continue.');
    const response=await fetch(`${base()}/rest/v1/rpc/${name}`,{method:'POST',keepalive,headers:publicHeaders({Authorization:`Bearer ${current.access_token}`}),body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||`${name} failed.`);return data;
  }
  function presenceSessionId(){let value=sessionStorage.getItem(PRESENCE_ID_KEY)||'';if(!/^[0-9a-f-]{36}$/i.test(value)){value=crypto.randomUUID();sessionStorage.setItem(PRESENCE_ID_KEY,value)}return value}
  async function recordPresence(event='heartbeat',keepalive=false){if(!hasAccess())return false;const path=(location.pathname||'/').slice(0,180),device=(navigator.userAgentData?.platform||navigator.platform||'Web').slice(0,80);await rpc('record_ac_presence',{p_session_id:presenceSessionId(),p_event:event,p_path:path,p_device:device},keepalive);return true}
  function startPresence(){
    if(!sessionStorage.getItem(PRESENCE_SENT_KEY)){sessionStorage.setItem(PRESENCE_SENT_KEY,'1');recordPresence('sign_in').catch(()=>{})}
    if(!presenceTimer)presenceTimer=setInterval(()=>recordPresence('heartbeat').catch(()=>{}),180000);
  }
  async function refreshPendingCount(notify=true){
    if(!['owner','admin'].includes(profile?.role)||profile.active===false||!session?.access_token)return 0;
    const previous=pendingJoinCount,response=await fetch(`${base()}/rest/v1/profiles?organisation_id=eq.${encodeURIComponent(profile.organisation_id)}&role=eq.pending&active=eq.false&select=id`,{headers:publicHeaders({Authorization:`Bearer ${session.access_token}`})});
    if(response.ok)pendingJoinCount=(await response.json()).length;
    if(notify&&pendingJoinCount!==previous)global.dispatchEvent(new CustomEvent('ac-auth-changed',{detail:eventDetail()}));
    return pendingJoinCount;
  }
  function startPendingMonitor(){
    if(!['owner','admin'].includes(profile?.role)||pendingTimer)return;
    pendingTimer=setInterval(()=>{if(document.visibilityState==='visible')refreshPendingCount().catch(()=>{})},60000);
  }
  async function audit(action,payload={}){if(!hasAccess()||!profile?.organisation_id)return false;try{await rpc('log_ac_project_action',{p_action:action,p_project_id:payload.projectId||null,p_record_id:payload.recordId||null,p_module:payload.module||null,p_details:payload.details||{}});return true}catch(_){return false}}
  async function init(){let redirectType='';try{redirectType=await consumeAuthRedirect()}catch(error){profileError=error.message||'The secure email link could not be opened.'}await ensure();if(session)await loadProfile();readyResolve(session);global.dispatchEvent(new CustomEvent('ac-auth-ready',{detail:{...eventDetail(),redirectType}}));if(redirectType)global.dispatchEvent(new CustomEvent('ac-auth-redirect',{detail:{type:redirectType}}))}

  global.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')recordPresence('heartbeat').catch(()=>{})});
  global.ACAuth={ready,signIn,signUp,signOut,refresh,headers,user,profile:currentProfile,workspace:currentWorkspace,role,roleLabel,can,canSave,canUseTool,allowedTools,isPending,hasAccess,loadProfile,loadWorkspace,refreshPendingCount,pendingJoinCount:()=>pendingJoinCount,isSignedIn:()=>!!session,profileError:()=>profileError,requestPasswordReset,resendVerification,updatePassword,deleteAccount,audit,recordPresence,config,toolRoles:TOOL_ROLES};
  init();
})(window);
