(function(global){
  'use strict';
  const config=global.AC_PLATFORM_CONFIG||{},MAX_FILE=25*1024*1024;
  const base=()=>String(config.supabaseUrl||'').replace(/\/$/,'');
  const encodePath=path=>String(path||'').split('/').map(encodeURIComponent).join('/');
  const cleanName=value=>String(value||'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)||'file';

  async function context(){
    await global.ACAuth?.ready;
    const profile=global.ACAuth?.profile?.(),user=global.ACAuth?.user?.();
    if(!global.ACAuth?.hasAccess?.()||!profile?.organisation_id||!user?.id)throw new Error('Sign in with an active team role to use Work Management.');
    return{profile,user,headers:{apikey:config.publishableKey||'','Content-Type':'application/json',...(await global.ACAuth.headers())}};
  }
  async function parse(response,label='Work Management'){
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.error_description||data?.error||`${label} request failed (${response.status}).`);
    return data;
  }
  async function rpc(name,body={}){
    const ctx=await context();
    return parse(await fetch(`${base()}/rest/v1/rpc/${name}`,{method:'POST',headers:ctx.headers,body:JSON.stringify(body)}));
  }
  async function snapshot(from,to){return rpc('get_ac_operation_tools_snapshot',{p_from:from||null,p_to:to||null})}
  async function teamSnapshot(from,to){return rpc('get_ac_team_management_snapshot',{p_from:from||null,p_to:to||null})}
  async function saveFolder(folder){return rpc('save_ac_operation_folder',{p_folder:folder})}
  async function deleteFolder(id){return rpc('delete_ac_operation_folder',{p_folder_id:id})}
  async function saveEvent(event){return rpc('save_ac_schedule_event',{p_event:event})}
  async function deleteEvent(id){return rpc('delete_ac_schedule_event',{p_event_id:id})}

  async function uploadFile(folder,file){
    if(!file)throw new Error('Choose a file to upload.');
    if(file.size>MAX_FILE)throw new Error('Each Work Management file must be 25 MB or smaller.');
    const ctx=await context(),module=folder.module==='quote'?'quote':'document';
    const path=`${ctx.profile.organisation_id}/${module}/${folder.id}/${ctx.user.id}/${crypto.randomUUID()}-${cleanName(file.name)}`;
    const response=await fetch(`${base()}/storage/v1/object/operation-hub-files/${encodePath(path)}`,{method:'POST',headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers()),'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.message||data.error||`The file could not be uploaded (${response.status}).`)}
    try{
      return await rpc('create_ac_operation_file',{p_folder_id:folder.id,p_file:{storage_path:path,file_name:file.name||'File',mime_type:file.type||'application/octet-stream',file_size_bytes:file.size||1}});
    }catch(error){
      fetch(`${base()}/storage/v1/object/operation-hub-files/${encodePath(path)}`,{method:'DELETE',headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers())}}).catch(()=>{});
      throw error;
    }
  }
  async function deleteFile(id){return rpc('delete_ac_operation_file',{p_file_id:id})}
  async function downloadFile(file){
    const ctx=await context(),response=await fetch(`${base()}/storage/v1/object/authenticated/operation-hub-files/${encodePath(file.storage_path)}`,{headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers())}});
    if(!response.ok)throw new Error(`The saved file could not be opened (${response.status}).`);
    return response.blob();
  }
  async function openFile(file){
    const previewable=/^(?:image\/|application\/pdf|text\/)/i.test(file.mime_type||''),popup=previewable?window.open('about:blank','_blank'):null;
    try{
      const blob=await downloadFile(file),url=URL.createObjectURL(blob);
      if(popup){popup.opener=null;popup.location.replace(url)}
      else{const link=document.createElement('a');link.href=url;link.download=file.file_name||'download';document.body.appendChild(link);link.click();link.remove()}
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(error){popup?.close();throw error}
  }

  global.ACOperationToolsAPI={MAX_FILE,context,snapshot,teamSnapshot,saveFolder,deleteFolder,uploadFile,deleteFile,openFile,saveEvent,deleteEvent};
})(window);
