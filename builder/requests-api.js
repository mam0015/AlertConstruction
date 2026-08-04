(function(global){
  'use strict';
  const config=global.AC_PLATFORM_CONFIG||{};
  const ACCESS_ROLES=new Set(['owner','admin','manager','site_supervisor']);
  const MAX_FILE=20*1024*1024;

  function base(){return String(config.supabaseUrl||'').replace(/\/$/,'')}
  function encodePath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  async function context(){
    await global.ACAuth?.ready;
    const profile=global.ACAuth?.profile?.(),role=profile?.role||'';
    if(!global.ACAuth?.hasAccess?.()||!profile?.organisation_id||!ACCESS_ROLES.has(role))throw new Error('Your role does not have access to Requests.');
    return{profile,role,headers:{apikey:config.publishableKey||'','Content-Type':'application/json',...(await global.ACAuth.headers())}};
  }
  async function parse(response){
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.error_description||data?.error||`Requests service error (${response.status}).`);
    return data;
  }
  async function rpc(name,body={}){
    const ctx=await context();
    return parse(await fetch(`${base()}/rest/v1/rpc/${name}`,{method:'POST',headers:ctx.headers,body:JSON.stringify(body)}));
  }

  function list(status=''){return rpc('list_ac_requests',{p_status:status||null})}
  function get(id){return rpc('get_ac_request',{p_request_id:id})}
  function recordContact(id,outcome,followUpDate,note){return rpc('record_ac_request_contact',{p_request_id:id,p_outcome:outcome,p_follow_up_date:followUpDate||null,p_note:note||''})}
  function setStatus(id,status,customerNote='',customerVisible=false){return rpc('set_ac_request_status',{p_request_id:id,p_status:status,p_customer_note:customerNote,p_customer_visible:customerVisible})}
  function createProject(id,supervisorId,name='',adminBrief=''){return rpc('create_ac_project_from_request',{p_request_id:id,p_supervisor:supervisorId,p_name:name,p_admin_brief:adminBrief})}

  async function fileBlob(path){
    await context();
    const response=await fetch(`${base()}/storage/v1/object/authenticated/request-files/${encodePath(path)}`,{headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers())}});
    if(!response.ok)throw new Error(`This file could not be opened (${response.status}).`);
    return response.blob();
  }
  async function openFile(path,name,type){
    const blob=await fileBlob(path),url=URL.createObjectURL(blob);
    if(/^(?:image\/|application\/pdf)/i.test(type||blob.type||'')){
      const popup=global.open(url,'_blank','noopener');
      if(!popup){const link=document.createElement('a');link.href=url;link.download=name||'request-file';link.click()}
    }else{
      const link=document.createElement('a');link.href=url;link.download=name||'request-file';link.click();
    }
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }

  global.ACRequestsAPI={ACCESS_ROLES,MAX_FILE,context,list,get,recordContact,setStatus,createProject,fileBlob,openFile};
})(window);
