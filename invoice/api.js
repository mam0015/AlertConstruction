(function(global){
  'use strict';
  const config=global.AC_PLATFORM_CONFIG||{};
  const ACCESS_ROLES=new Set(['owner','estimator','manager']);
  const EDIT_ROLES=new Set(['owner','estimator']);
  const DEFAULT_SETTINGS={
    company_name:'Alert Construction Pty Ltd',abn:'72 646 119 717',address:'Suite 40 / 541 Blackburn Rd\nMount Waverley VIC 3149',
    phone:'(03) 8820 6567',email:'info@alertconstruction.com.au',website:'www.alertconstruction.com.au',
    bank_account_name:'Alert Construction Pty Ltd',bank_bsb:'063-254',bank_account_number:'1089 6626',
    payment_terms:'Payment is due by the due date shown on this invoice.',default_profit_type:'percent',default_profit_value:20,
    gst_rate:10,logo_path:''
  };

  function base(){return String(config.supabaseUrl||'').replace(/\/$/,'')}
  function encodePath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  async function context(){
    await global.ACAuth?.ready;
    const profile=global.ACAuth?.profile?.(),role=profile?.role||'';
    if(!global.ACAuth?.hasAccess?.()||!profile?.organisation_id||!ACCESS_ROLES.has(role))throw new Error('Your role does not have access to invoices.');
    return{profile,role,headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(await global.ACAuth.headers())}};
  }
  async function parse(response){
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.error_description||data?.error||`Invoice service error (${response.status}).`);
    return data;
  }
  async function rest(path,options={}){const ctx=await context();return parse(await fetch(base()+path,{...options,headers:{...ctx.headers,...(options.headers||{})}}))}
  async function rpc(name,body={}){return rest(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(body)})}

  async function list(){
    return rpc('list_ac_invoices');
  }
  async function settings(){
    const value=await rpc('get_ac_invoice_settings');
    return{...DEFAULT_SETTINGS,...(value||{})};
  }
  async function saveSettings(value){return rpc('upsert_ac_invoice_settings',{p_settings:value})}
  async function create(invoice,items){return rpc('create_ac_invoice_draft',{p_invoice:invoice,p_items:items})}
  async function update(id,invoice,items){return rpc('update_ac_invoice',{p_invoice_id:id,p_invoice:invoice,p_items:items})}
  async function remove(id){return rpc('delete_ac_invoice',{p_invoice_id:id})}
  async function recordPdf(id,path,filename,size){return rpc('record_ac_invoice_pdf',{p_invoice_id:id,p_pdf_path:path,p_filename:filename,p_size_bytes:size})}

  async function upload(bucket,path,blob,contentType){
    const ctx=await context();
    if(!EDIT_ROLES.has(ctx.role))throw new Error('Your role cannot upload invoice files.');
    const response=await fetch(`${base()}/storage/v1/object/${bucket}/${encodePath(path)}`,{method:'POST',headers:{apikey:config.publishableKey,...(await global.ACAuth.headers()),'Content-Type':contentType||blob.type||'application/octet-stream','x-upsert':'true'},body:blob});
    if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.message||`File upload failed (${response.status}).`)}
    return path;
  }
  async function uploadPdf(invoice,blob,filename){
    const ctx=await context(),path=`${ctx.profile.organisation_id}/${invoice.id}/${Date.now()}-${filename}`;
    await upload('invoice-pdfs',path,blob,'application/pdf');return path;
  }
  async function uploadLogo(file){
    if(!file||!/^image\/(?:png|jpeg)$/.test(file.type))throw new Error('Choose a PNG or JPEG logo.');
    if(file.size>2*1024*1024)throw new Error('The logo must be smaller than 2 MB.');
    const ctx=await context(),extension=file.type==='image/png'?'png':'jpg',path=`${ctx.profile.organisation_id}/company-logo.${extension}`;
    await upload('invoice-assets',path,file,file.type);return path;
  }
  async function download(bucket,path){
    if(!path)throw new Error('No saved file is available.');
    const ctx=await context(),response=await fetch(`${base()}/storage/v1/object/authenticated/${bucket}/${encodePath(path)}`,{headers:{apikey:config.publishableKey,...(await global.ACAuth.headers())}});
    if(!response.ok)throw new Error(`Saved file could not be opened (${response.status}).`);return response.blob();
  }
  async function pdfBlob(path){return download('invoice-pdfs',path)}
  function blobDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}
  async function logoDataUrl(path){
    if(!path){const response=await fetch(new URL('../assets/invoice-logo.png',location.href));if(!response.ok)return'';return blobDataUrl(await response.blob())}
    return blobDataUrl(await download('invoice-assets',path));
  }
  function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}

  global.ACInvoiceAPI={ACCESS_ROLES,EDIT_ROLES,DEFAULT_SETTINGS,context,list,settings,saveSettings,create,update,remove,recordPdf,uploadPdf,uploadLogo,pdfBlob,logoDataUrl,downloadBlob};
})(window);
