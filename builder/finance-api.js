(function(global){
  'use strict';
  const config=global.AC_PLATFORM_CONFIG||{};
  const ACCESS_ROLES=new Set(['owner','admin','manager','estimator','site_supervisor','worker']);
  const MAX_RECEIPT=10*1024*1024;

  function base(){return String(config.supabaseUrl||'').replace(/\/$/,'')}
  function encodePath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  function cleanName(value){return String(value||'receipt').replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,100)||'receipt'}
  async function context(){
    await global.ACAuth?.ready;
    const profile=global.ACAuth?.profile?.(),role=profile?.role||'';
    if(!global.ACAuth?.hasAccess?.()||!profile?.organisation_id||!ACCESS_ROLES.has(role))throw new Error('Your role does not have access to Financial Data.');
    return{profile,role,headers:{apikey:config.publishableKey||'','Content-Type':'application/json',...(await global.ACAuth.headers())}};
  }
  async function parse(response){
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.error_description||data?.error||`Finance service error (${response.status}).`);
    return data;
  }
  async function rpc(name,body={}){
    const ctx=await context();
    return parse(await fetch(`${base()}/rest/v1/rpc/${name}`,{method:'POST',headers:ctx.headers,body:JSON.stringify(body)}));
  }

  function snapshot(from,to,projectId=''){return rpc('get_ac_finance_snapshot',{p_from:from||null,p_to:to||null,p_project_id:projectId||null})}
  function createEntry(entry){return rpc('create_ac_finance_transaction',{p_entry:entry})}
  function updateEntry(id,entry){return rpc('update_ac_finance_transaction',{p_transaction_id:id,p_entry:entry})}
  function setStatus(id,status,note=''){return rpc('set_ac_finance_transaction_status',{p_transaction_id:id,p_status:status,p_note:note})}
  function recordPayment(id,payment){return rpc('record_ac_finance_payment',{p_transaction_id:id,p_payment:payment})}
  function upsertBudget(budget){return rpc('upsert_ac_finance_budget',{p_budget:budget})}
  function setPermission(userId,permission){return rpc('set_ac_finance_permission',{p_user_id:userId,p_permission:permission})}

  async function uploadReceipt(transactionId,file){
    if(!file)return null;
    if(file.size>MAX_RECEIPT)throw new Error('Receipts and finance documents must be 10 MB or smaller.');
    const allowed=/^(?:image\/(?:jpeg|png|webp)|application\/pdf)$/i.test(file.type||'')||/\.(?:jpe?g|png|webp|pdf)$/i.test(file.name||'');
    if(!allowed)throw new Error('Use a JPG, PNG, WEBP or PDF receipt.');
    const ctx=await context(),path=`${ctx.profile.organisation_id}/${transactionId}/${ctx.profile.id}/${crypto.randomUUID()}-${cleanName(file.name)}`;
    const response=await fetch(`${base()}/storage/v1/object/finance-receipts/${encodePath(path)}`,{
      method:'POST',
      headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers()),'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},
      body:file
    });
    if(!response.ok){
      const error=await response.json().catch(()=>({}));
      throw new Error(error.message||error.error||`Receipt upload failed (${response.status}).`);
    }
    return rpc('attach_ac_finance_receipt',{p_transaction_id:transactionId,p_receipt:{storage_path:path,file_name:file.name.slice(0,180),mime_type:(file.type||'application/octet-stream').slice(0,120),file_size_bytes:file.size}});
  }
  async function receiptBlob(path){
    if(!path)throw new Error('No receipt is attached to this entry.');
    await context();
    const response=await fetch(`${base()}/storage/v1/object/authenticated/finance-receipts/${encodePath(path)}`,{headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers())}});
    if(!response.ok)throw new Error(`The private receipt could not be opened (${response.status}).`);
    return response.blob();
  }
  async function openReceipt(path,name,type){
    const blob=await receiptBlob(path),url=URL.createObjectURL(blob);
    if(/^(?:image\/|application\/pdf)/i.test(type||blob.type||'')){
      const popup=global.open(url,'_blank','noopener');
      if(!popup){const link=document.createElement('a');link.href=url;link.download=name||'finance-receipt';link.click()}
    }else{
      const link=document.createElement('a');link.href=url;link.download=name||'finance-receipt';link.click();
    }
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }

  global.ACFinanceAPI={ACCESS_ROLES,MAX_RECEIPT,context,snapshot,createEntry,updateEntry,setStatus,recordPayment,upsertBudget,setPermission,uploadReceipt,receiptBlob,openReceipt};
})(window);
