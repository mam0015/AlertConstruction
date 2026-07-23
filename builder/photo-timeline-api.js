(function(global){
  'use strict';
  const config=global.AC_PLATFORM_CONFIG||{},MAX_PHOTO=20*1024*1024,MAX_LOGO=5*1024*1024;
  const ACCESS_ROLES=new Set(['owner','admin','manager','site_supervisor','estimator']);
  const UPLOAD_ROLES=new Set(['owner','admin','manager','site_supervisor']);
  const BOOKLET_ROLES=new Set(['owner','admin']);

  function base(){return String(config.supabaseUrl||'').replace(/\/$/,'')}
  function encodePath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  async function context(){
    await global.ACAuth?.ready;
    const profile=global.ACAuth?.profile?.(),role=profile?.role||'';
    if(!global.ACAuth?.hasAccess?.()||!profile?.organisation_id||!ACCESS_ROLES.has(role))throw new Error('Your role does not have Project Photo Timeline access.');
    return{profile,role,headers:{apikey:config.publishableKey||'','Content-Type':'application/json',...(await global.ACAuth.headers())}};
  }
  async function parse(response){const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.message||data?.error_description||data?.error||`Photo Timeline service error (${response.status}).`);return data}
  async function rpc(name,body={}){const ctx=await context();return parse(await fetch(`${base()}/rest/v1/rpc/${name}`,{method:'POST',headers:ctx.headers,body:JSON.stringify(body)}))}
  async function snapshot(projectId=''){return rpc('get_ac_photo_hub_snapshot',{p_project_id:projectId||null})}
  async function companyProfile(){return rpc('get_ac_company_profile')}
  async function saveCompanyProfile(profile){return rpc('upsert_ac_company_profile',{p_profile:profile})}
  async function createPhoto(projectId,photo){return rpc('create_ac_project_photo',{p_project_id:projectId,p_photo:photo})}
  async function updatePhoto(id,patch){return rpc('update_ac_project_photo',{p_photo_id:id,p_patch:patch})}
  async function deletePhoto(id){return rpc('delete_ac_project_photo',{p_photo_id:id})}
  async function savePair(projectId,pair){return rpc('save_ac_photo_pair',{p_project_id:projectId,p_pair:pair})}
  async function deletePair(id){return rpc('delete_ac_photo_pair',{p_pair_id:id})}
  async function saveBooklet(projectId,booklet){return rpc('save_ac_project_booklet',{p_project_id:projectId,p_booklet:booklet})}
  async function recordReport(projectId,report){return rpc('record_ac_photo_report',{p_project_id:projectId,p_report:report})}
  async function archiveReport(id){return rpc('archive_ac_photo_report',{p_report_id:id})}

  async function upload(bucket,path,blob,contentType,upsert=false){
    const ctx=await context(),response=await fetch(`${base()}/storage/v1/object/${bucket}/${encodePath(path)}`,{method:'POST',headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers()),'Content-Type':contentType||blob.type||'application/octet-stream','x-upsert':String(!!upsert)},body:blob});
    if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.message||error.error||`Private file upload failed (${response.status}).`)}
    return path;
  }
  function cleanName(value){return String(value||'photo').replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,100)||'photo'}
  async function uploadPhoto(projectId,blob,originalName='photo.jpg'){
    const ctx=await context();if(!UPLOAD_ROLES.has(ctx.role))throw new Error('Your role cannot upload project photos.');
    const path=`${ctx.profile.organisation_id}/${projectId}/${ctx.profile.id}/${crypto.randomUUID()}-${cleanName(originalName).replace(/\.[^.]*$/,'.jpg')}`;
    await upload('project-photos',path,blob,'image/jpeg');return path;
  }
  async function uploadCompanyLogo(blob){
    const ctx=await context();if(ctx.role!=='owner')throw new Error('Only the Owner can change the company logo.');
    if(blob.size>MAX_LOGO)throw new Error('The company logo must be 5 MB or smaller.');
    const path=`${ctx.profile.organisation_id}/${ctx.profile.id}/company-logo.jpg`;
    await upload('company-assets',path,blob,'image/jpeg',true);return path;
  }
  async function uploadReport(projectId,blob,filename){
    const ctx=await context();if(!['owner','admin','manager'].includes(ctx.role))throw new Error('Your role cannot save photo reports.');
    const path=`${ctx.profile.organisation_id}/${projectId}/${Date.now()}-${cleanName(filename).replace(/\.pdf$/i,'')}.pdf`;
    await upload('photo-reports',path,blob,'application/pdf');return path;
  }
  async function signedUrl(bucket,path,expiresIn=3600){
    if(!path)return'';const ctx=await context(),response=await fetch(`${base()}/storage/v1/object/sign/${bucket}/${encodePath(path)}`,{method:'POST',headers:ctx.headers,body:JSON.stringify({expiresIn})}),data=await parse(response),value=data.signedURL||data.signedUrl||'';return value.startsWith('http')?value:base()+value;
  }
  async function download(bucket,path){
    const ctx=await context(),response=await fetch(`${base()}/storage/v1/object/authenticated/${bucket}/${encodePath(path)}`,{headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers())}});
    if(!response.ok)throw new Error(`The saved private file could not be opened (${response.status}).`);return response.blob();
  }
  function blobDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}
  async function photoDataUrl(path){return blobDataUrl(await download('project-photos',path))}
  async function logoDataUrl(path){if(path)return blobDataUrl(await download('company-assets',path));const response=await fetch('../assets/invoice-logo.png');return response.ok?blobDataUrl(await response.blob()):''}
  async function reportBlob(path){return download('photo-reports',path)}
  function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}

  function imageElement(file){return new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error(/hei[cf]/i.test(file.type||file.name)?'This browser could not decode the iPhone HEIC photo. On iPhone, choose the photo again from Photos so Safari can convert it, or export it as JPEG.':'This image could not be read.'))};image.src=url})}
  async function normaliseImage(file,maxEdge=2400){
    if(!file)throw new Error('Choose a project photo.');if(file.size>MAX_PHOTO)throw new Error('Each original photo must be 20 MB or smaller.');
    if(!/\.(?:jpe?g|png|webp|heic|heif)$/i.test(file.name||'')&&!/^image\/(?:jpeg|png|webp|heic|heif)$/i.test(file.type||''))throw new Error('Use JPG, PNG, WEBP or HEIC project photos.');
    const image=await imageElement(file),sourceWidth=image.naturalWidth||image.width,sourceHeight=image.naturalHeight||image.height;
    if(!sourceWidth||!sourceHeight)throw new Error('The selected photo has no readable dimensions.');
    const scale=Math.min(1,maxEdge/Math.max(sourceWidth,sourceHeight)),width=Math.max(1,Math.round(sourceWidth*scale)),height=Math.max(1,Math.round(sourceHeight*scale)),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));if(!blob)throw new Error('The browser could not prepare this photo for upload.');
    const bytes=await blob.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
    return{blob,width,height,hash,preview:canvas.toDataURL('image/jpeg',.76),originalName:file.name||'photo.jpg'};
  }
  function profileMissing(profile={},forBooklet=false){
    const required=[['company_name','Company Name'],['logo_path','Company Logo'],['abn','ABN'],['phone','Phone Number'],['email','Email Address'],['business_location','Business Location'],['service_areas','Service Areas']];
    if(forBooklet)required.push(['company_description','Company Description'],['services','Services Provided']);
    return required.filter(([key])=>!String(profile[key]||'').trim()).map(([,label])=>label);
  }

  global.ACPhotoAPI={ACCESS_ROLES,UPLOAD_ROLES,BOOKLET_ROLES,context,snapshot,companyProfile,saveCompanyProfile,createPhoto,updatePhoto,deletePhoto,savePair,deletePair,saveBooklet,recordReport,archiveReport,uploadPhoto,uploadCompanyLogo,uploadReport,signedUrl,photoDataUrl,logoDataUrl,reportBlob,downloadBlob,normaliseImage,profileMissing};
})(window);
