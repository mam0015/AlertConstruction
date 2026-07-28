(function(global){
  'use strict';
  const DATA_KEY='ac_project_workspace_v1',ACTIVE_KEY='ac_active_project_v1',DB_NAME='ac_project_files_v1',DB_VERSION=1,STORE='attachments',MAX_CLOUD_FILE=20*1024*1024;
  const config=global.AC_PLATFORM_CONFIG||{},apiBase=String(config.supabaseUrl||'').replace(/\/$/,'');
  const now=()=>new Date().toISOString();
  const uid=prefix=>prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
  const clean=value=>JSON.parse(JSON.stringify(value==null?null:value));
  const today=()=>{const d=new Date(),offset=d.getTimezoneOffset();return new Date(d.getTime()-offset*60000).toISOString().slice(0,10)};
  const isActiveStatus=value=>!['completed','complete','closed','cancelled','canceled','archived'].includes(String(value||'Active').toLowerCase());
  // V33 is role-only: approved team members are not commercially capped by
  // project count. Keep this hook as a validation boundary for future project
  // lifecycle rules without reintroducing a plan gate.
  function assertProjectCapacity(){return true}

  function read(){
    try{const parsed=JSON.parse(localStorage.getItem(DATA_KEY)||'{}');return{version:1,projects:Array.isArray(parsed.projects)?parsed.projects:[]}}
    catch(_){return{version:1,projects:[]}}
  }
  function write(data){localStorage.setItem(DATA_KEY,JSON.stringify(data));global.dispatchEvent(new CustomEvent('ac-projects-changed'))}
  function list(){return read().projects.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))}
  function get(id){return list().find(project=>project.id===id)||null}
  function create(fields){
    const data=read();if(isActiveStatus(fields?.status))assertProjectCapacity();const project={id:uid('project'),name:String(fields?.name||'New Project').trim()||'New Project',category:String(fields?.category||'Other').trim()||'Other',address:String(fields?.address||'').trim(),client:String(fields?.client||'').trim(),status:String(fields?.status||'Active'),notes:String(fields?.notes||''),createdAt:now(),updatedAt:now(),records:[],tasks:[]};
    data.projects.unshift(project);write(data);setActive(project.id);return clean(project);
  }
  function update(id,patch){
    const data=read(),project=data.projects.find(item=>item.id===id);if(!project)return null;
    if(patch?.status!==undefined&&isActiveStatus(patch.status)&&!isActiveStatus(project.status))assertProjectCapacity();
    ['name','category','address','client','status','notes'].forEach(key=>{if(patch&&patch[key]!==undefined)project[key]=String(patch[key])});project.updatedAt=now();write(data);return clean(project);
  }
  async function remove(id){
    const data=read(),before=data.projects.length;data.projects=data.projects.filter(item=>item.id!==id);if(data.projects.length===before)return false;write(data);if(active()===id)localStorage.removeItem(ACTIVE_KEY);
    const files=await listAttachments(id);await Promise.all(files.map(file=>deleteAttachment(file.id)));return true;
  }
  function addRecord(projectId,record){
    const data=read(),project=data.projects.find(item=>item.id===projectId);if(!project)throw new Error('Project not found.');
    const attachmentIds=Array.isArray(record.attachmentIds)?record.attachmentIds.filter(Boolean):record.attachmentId?[record.attachmentId]:[],attachmentNames=Array.isArray(record.attachmentNames)?record.attachmentNames.filter(Boolean):record.attachmentName?[record.attachmentName]:[];
    const entry={id:uid('record'),module:String(record.module||'general'),title:String(record.title||'Saved record'),summary:String(record.summary||''),createdAt:now(),updatedAt:now(),attachmentId:attachmentIds[0]||null,attachmentName:attachmentNames[0]||'',attachmentIds,attachmentNames,data:clean(record.data||{})};
    project.records.unshift(entry);project.updatedAt=now();write(data);return clean(entry);
  }
  function updateRecord(projectId,recordId,patch){
    const data=read(),project=data.projects.find(item=>item.id===projectId),record=project?.records?.find(item=>item.id===recordId);if(!record)return null;
    ['title','summary'].forEach(key=>{if(patch&&patch[key]!==undefined)record[key]=String(patch[key])});if(patch&&patch.data!==undefined)record.data=clean(patch.data);if(Array.isArray(patch?.attachmentIds)&&patch.attachmentIds.length){record.attachmentIds=patch.attachmentIds.filter(Boolean);record.attachmentNames=(patch.attachmentNames||[]).filter(Boolean);record.attachmentId=record.attachmentIds[0]||null;record.attachmentName=record.attachmentNames[0]||''}record.updatedAt=now();project.updatedAt=now();write(data);return clean(record);
  }
  async function deleteRecord(projectId,recordId){
    const data=read(),project=data.projects.find(item=>item.id===projectId);if(!project)return false;const record=project.records.find(item=>item.id===recordId);project.records=project.records.filter(item=>item.id!==recordId);project.updatedAt=now();write(data);const ids=Array.isArray(record?.attachmentIds)&&record.attachmentIds.length?record.attachmentIds:record?.attachmentId?[record.attachmentId]:[];await Promise.all(ids.map(deleteAttachment));return true;
  }
  function addTask(projectId,task){
    const data=read(),project=data.projects.find(item=>item.id===projectId);if(!project)throw new Error('Project not found.');
    const entry={id:uid('task'),title:String(task.title||'New task').trim()||'New task',dueDate:String(task.dueDate||today()),dueTime:String(task.dueTime||''),priority:String(task.priority||'Normal'),notes:String(task.notes||''),done:false,createdAt:now(),completedAt:null};
    project.tasks.push(entry);project.updatedAt=now();write(data);return clean(entry);
  }
  function updateTask(projectId,taskId,patch){
    const data=read(),project=data.projects.find(item=>item.id===projectId),task=project?.tasks?.find(item=>item.id===taskId);if(!task)return null;
    ['title','dueDate','dueTime','priority','notes'].forEach(key=>{if(patch&&patch[key]!==undefined)task[key]=String(patch[key])});if(patch&&patch.done!==undefined){task.done=!!patch.done;task.completedAt=task.done?now():null}project.updatedAt=now();write(data);return clean(task);
  }
  function deleteTask(projectId,taskId){const data=read(),project=data.projects.find(item=>item.id===projectId);if(!project)return false;project.tasks=project.tasks.filter(item=>item.id!==taskId);project.updatedAt=now();write(data);return true}
  function dueTasks(date=today()){return list().flatMap(project=>(project.tasks||[]).filter(task=>!task.done&&task.dueDate<=date).map(task=>({...clean(task),projectId:project.id,projectName:project.name,overdue:task.dueDate<date}))).sort((a,b)=>(a.dueDate+a.dueTime).localeCompare(b.dueDate+b.dueTime))}
  function active(){return localStorage.getItem(ACTIVE_KEY)||''}
  function setActive(id){if(id)localStorage.setItem(ACTIVE_KEY,id);else localStorage.removeItem(ACTIVE_KEY);global.dispatchEvent(new CustomEvent('ac-active-project-changed',{detail:{id}}))}
  function snapshot(){return clean(read())}
  function replaceSnapshot(value){const next={version:1,projects:Array.isArray(value?.projects)?clean(value.projects):[]};write(next);return snapshot()}

  function db(){
    return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,DB_VERSION);request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains(STORE)){const store=database.createObjectStore(STORE,{keyPath:'id'});store.createIndex('projectId','projectId',{unique:false})}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})
  }
  function readBytes(file){if(file&&typeof file.arrayBuffer==='function')return file.arrayBuffer();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsArrayBuffer(file)})}
  const encodePath=path=>String(path||'').split('/').map(encodeURIComponent).join('/');
  const cleanName=value=>String(value||'attachment').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)||'attachment';
  const cloudId=value=>String(value||'').startsWith('cloud:')?String(value).slice(6):'';
  async function cloudContext(writeAccess=false){
    if(!apiBase||!global.ACAuth)return null;await global.ACAuth.ready;
    const profile=global.ACAuth.profile?.(),active=global.ACAuth.hasAccess?.();
    if(!active||!profile?.organisation_id)return null;
    if(writeAccess&&!['owner','admin','manager','estimator'].includes(profile.role))throw new Error('Your role cannot add files to this project.');
    return{profile,user:global.ACAuth.user?.(),headers:{apikey:config.publishableKey||'','Content-Type':'application/json',...(await global.ACAuth.headers())}};
  }
  async function cloudRpc(name,body={}){
    const ctx=await cloudContext(),response=await fetch(`${apiBase}/rest/v1/rpc/${name}`,{method:'POST',headers:ctx?.headers||{},body:JSON.stringify(body)}),data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.error||`Project file service error (${response.status}).`);return data;
  }
  async function saveLocalAttachment(projectId,file){
    const bytes=await readBytes(file),entry={id:uid('file'),projectId,name:file.name||'attachment',type:file.type||'application/octet-stream',size:file.size||bytes.byteLength||0,createdAt:now(),bytes},database=await db();
    await new Promise((resolve,reject)=>{const request=database.transaction(STORE,'readwrite').objectStore(STORE).put(entry);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)});database.close();return{id:entry.id,name:entry.name,type:entry.type,size:entry.size}
  }
  async function saveAttachment(projectId,file){
    if(!file)return null;if(file.size>MAX_CLOUD_FILE)throw new Error('Project files must be 20 MB or smaller.');
    const ctx=await cloudContext(true);if(!ctx)return saveLocalAttachment(projectId,file);
    const path=`${ctx.profile.organisation_id}/${projectId}/${ctx.user.id}/${crypto.randomUUID()}-${cleanName(file.name)}`;
    const upload=await fetch(`${apiBase}/storage/v1/object/project-files/${encodePath(path)}`,{method:'POST',headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers()),'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
    if(!upload.ok){const data=await upload.json().catch(()=>({}));throw new Error(data.message||data.error||`The project file could not be uploaded (${upload.status}).`)}
    try{const saved=await cloudRpc('create_ac_project_file',{p_project_id:projectId,p_file:{storage_path:path,file_name:file.name||'Project file',mime_type:file.type||'application/octet-stream',file_size_bytes:file.size||1}});return{id:`cloud:${saved.id}`,name:saved.file_name,type:saved.mime_type,size:saved.file_size_bytes,cloud:true}}
    catch(error){fetch(`${apiBase}/storage/v1/object/project-files/${encodePath(path)}`,{method:'DELETE',headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers())}}).catch(()=>{});throw error}
  }
  async function getLocalAttachment(id){
    const database=await db(),value=await new Promise((resolve,reject)=>{const request=database.transaction(STORE).objectStore(STORE).get(id);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error)});database.close();if(value){if(value.bytes)value.blob=new Blob([value.bytes],{type:value.type});else if(value.blob&&!value.size)value.size=value.blob.size}return value
  }
  async function getAttachment(id){
    if(!id)return null;const remoteId=cloudId(id);if(!remoteId)return getLocalAttachment(id);
    const metadata=await cloudRpc('get_ac_project_file',{p_file_id:remoteId}),response=await fetch(`${apiBase}/storage/v1/object/authenticated/project-files/${encodePath(metadata.storage_path)}`,{headers:{apikey:config.publishableKey||'',...(await global.ACAuth.headers())}});
    if(!response.ok)throw new Error(`The saved project file could not be opened (${response.status}).`);
    return{id,name:metadata.file_name,type:metadata.mime_type,size:metadata.file_size_bytes,projectId:metadata.project_id,createdAt:metadata.created_at,blob:await response.blob(),cloud:true}
  }
  async function listLocalAttachments(projectId){const database=await db(),values=await new Promise((resolve,reject)=>{const request=database.transaction(STORE).objectStore(STORE).index('projectId').getAll(projectId);request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>reject(request.error)});database.close();return values}
  async function listAttachments(projectId){
    const local=await listLocalAttachments(projectId),ctx=await cloudContext();if(!ctx)return local;
    try{const remote=await cloudRpc('list_ac_project_files',{p_project_id:projectId});return[...local,...(Array.isArray(remote)?remote:[]).map(file=>({id:`cloud:${file.id}`,projectId:file.project_id,name:file.file_name,type:file.mime_type,size:file.file_size_bytes,createdAt:file.created_at,cloud:true}))]}catch(_){return local}
  }
  async function deleteLocalAttachment(id){const database=await db();await new Promise((resolve,reject)=>{const request=database.transaction(STORE,'readwrite').objectStore(STORE).delete(id);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)});database.close()}
  async function deleteAttachment(id){if(!id)return;const remoteId=cloudId(id);if(remoteId)return cloudRpc('delete_ac_project_file',{p_file_id:remoteId});return deleteLocalAttachment(id)}
  async function attachmentToDataUrl(file){const buffer=file.bytes||(file.blob?await readBytes(file.blob):new ArrayBuffer(0)),bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));return'data:'+(file.type||'application/octet-stream')+';base64,'+btoa(binary)}
  function dataUrlToBytes(value){const data=String(value).split(',')[1]||'',bytes=atob(data),array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);return array.buffer}
  async function exportAll(){
    const data=read(),attachments=[];for(const project of data.projects){for(const listed of await listAttachments(project.id)){const file=listed.cloud?await getAttachment(listed.id):listed;attachments.push({id:file.id,projectId:file.projectId,name:file.name,type:file.type,size:file.size,createdAt:file.createdAt,data:await attachmentToDataUrl(file)})}}
    return JSON.stringify({format:'ac-project-backup',version:1,exportedAt:now(),data,attachments},null,2);
  }
  async function importAll(text){
    const backup=JSON.parse(text);if(backup?.format!=='ac-project-backup'||!Array.isArray(backup?.data?.projects))throw new Error('This is not a valid AC project backup.');
    const clearDb=await db();await new Promise((resolve,reject)=>{const request=clearDb.transaction(STORE,'readwrite').objectStore(STORE).clear();request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)});clearDb.close();
    write({version:1,projects:backup.data.projects});for(const item of backup.attachments||[]){const database=await db(),entry={...item,bytes:dataUrlToBytes(item.data)};delete entry.data;await new Promise((resolve,reject)=>{const request=database.transaction(STORE,'readwrite').objectStore(STORE).put(entry);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)});database.close()}return backup.data.projects.length;
  }

  global.ACProjects={list,get,create,update,remove,addRecord,updateRecord,deleteRecord,addTask,updateTask,deleteTask,dueTasks,today,active,setActive,snapshot,replaceSnapshot,saveAttachment,getAttachment,listAttachments,deleteAttachment,exportAll,importAll};
})(window);
