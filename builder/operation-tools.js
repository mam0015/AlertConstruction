(function(){
  'use strict';
  const $=id=>document.getElementById(id),api=window.ACOperationToolsAPI,params=new URLSearchParams(location.search),preview=params.get('preview')==='1',previewRole=params.get('role')||'owner';
  const today=()=>{const date=new Date(),offset=date.getTimezoneOffset();return new Date(date.getTime()-offset*60000).toISOString().slice(0,10)};
  const shift=(date,days)=>{const value=new Date(`${date}T12:00:00`);value.setDate(value.getDate()+days);return localKey(value)};
  const localKey=date=>{const offset=date.getTimezoneOffset();return new Date(date.getTime()-offset*60000).toISOString().slice(0,10)};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const roleLabel=value=>({owner:'Owner',admin:'Admin',manager:'Manager',estimator:'Estimator',site_supervisor:'Site Supervisor',worker:'Worker'})[value]||String(value||'Team member').replace(/_/g,' ');
  const initials=value=>String(value||'AT').split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'AT';
  const dateLabel=value=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'—';
  const timeLabel=value=>value?new Date(`2000-01-01T${String(value).slice(0,8)}`).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'}):'All day';
  const dateTime=value=>value?new Date(value).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short'}):'—';
  const sizeLabel=value=>{const bytes=Number(value)||0;if(bytes<1024)return`${bytes} B`;if(bytes<1048576)return`${(bytes/1024).toFixed(bytes<10240?1:0)} KB`;return`${(bytes/1048576).toFixed(1)} MB`};
  const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  let state={viewer:null,permissions:{},folders:[],files:[],events:[],projects:[],members:[],reports:[],selectedQuote:'',selectedDocument:'',selectedDate:today(),month:new Date(new Date().getFullYear(),new Date().getMonth(),1),editingEvent:null,editingFolder:null,loaded:false};

  function previewData(){
    const now=new Date(),iso=days=>new Date(now.getTime()-days*86400000).toISOString(),viewerId={owner:'owner-preview',admin:'admin-preview',manager:'manager-preview',estimator:'estimator-preview',site_supervisor:'supervisor-preview',worker:'worker-preview'}[previewRole]||'owner-preview';
    const members=[
      {id:'owner-preview',full_name:'Ali Mobini',email:'ali@alertconstruction.com.au',role:'owner'},
      {id:'manager-preview',full_name:'Sarah Chen',email:'sarah@alertconstruction.com.au',role:'manager'},
      {id:'estimator-preview',full_name:'Mohammad Rahimi',email:'mohammad@alertconstruction.com.au',role:'estimator'},
      {id:'supervisor-preview',full_name:'Liam Walsh',email:'liam@alertconstruction.com.au',role:'site_supervisor'},
      {id:'worker-preview',full_name:'Reza Karimi',email:'reza@alertconstruction.com.au',role:'worker'}
    ];
    const office=['owner','admin','manager','estimator'].includes(previewRole),management=['owner','admin','manager'].includes(previewRole);
    const permissions={can_open_quotes:office,can_manage_quotes:office,can_open_documents:office,can_manage_documents:office,can_open_schedule:true,can_manage_schedule:management,can_create_personal_event:true,can_open_reports:true,can_view_all_reports:management};
    const folders=[
      {id:'q-grace',module:'quote',customer_name:'Grace Williams',work_type:'Home Extension',folder_name:'',notes:'Customer quotation and revisions.',created_by:'owner-preview',created_at:iso(50),updated_at:iso(2)},
      {id:'q-daniel',module:'quote',customer_name:'Daniel Foster',work_type:'Full Home Renovation',folder_name:'',notes:'',created_by:'estimator-preview',created_at:iso(35),updated_at:iso(8)},
      {id:'d-reports',module:'document',folder_name:'Company Reports',customer_name:'',work_type:'',notes:'Monthly and project reports.',created_by:'owner-preview',created_at:iso(70),updated_at:iso(1)},
      {id:'d-drawings',module:'document',folder_name:'Drawings & Plans',customer_name:'',work_type:'',notes:'Approved drawings and working plans.',created_by:'manager-preview',created_at:iso(65),updated_at:iso(6)},
      {id:'d-photos',module:'document',folder_name:'General Site Photos',customer_name:'',work_type:'',notes:'Photos not assigned to the formal timeline.',created_by:'supervisor-preview',created_at:iso(30),updated_at:iso(4)}
    ];
    const files=[
      {id:'f1',folder_id:'q-grace',file_name:'Grace_Extension_Quote_v2.pdf',mime_type:'application/pdf',file_size_bytes:724000,storage_path:'preview/f1',uploaded_by:'owner-preview',created_at:iso(2)},
      {id:'f2',folder_id:'q-daniel',file_name:'Full_Renovation_Quote.pdf',mime_type:'application/pdf',file_size_bytes:1184000,storage_path:'preview/f2',uploaded_by:'estimator-preview',created_at:iso(8)},
      {id:'f3',folder_id:'d-reports',file_name:'July_Progress_Report.pdf',mime_type:'application/pdf',file_size_bytes:952000,storage_path:'preview/f3',uploaded_by:'manager-preview',created_at:iso(1)},
      {id:'f4',folder_id:'d-drawings',file_name:'Ground_Floor_Plan.pdf',mime_type:'application/pdf',file_size_bytes:2640000,storage_path:'preview/f4',uploaded_by:'owner-preview',created_at:iso(6)}
    ];
    const projects=[{id:'project-rowville',name:'Rowville Renovation'},{id:'project-glen',name:'Glen Waverley Extension'}];
    const events=[
      {id:'event-1',title:'Call Grace about project progress',event_date:today(),event_time:'15:30:00',description:'Confirm whether the extension quote and scope are okay.',project_id:'project-glen',assigned_to:viewerId,created_by:viewerId,created_at:iso(2)},
      {id:'event-2',title:'Rowville site visit',event_date:shift(today(),1),event_time:'07:30:00',description:'Review waterproofing preparation before membrane starts.',project_id:'project-rowville',assigned_to:'manager-preview',created_by:'owner-preview',created_at:iso(4)},
      {id:'event-3',title:'Client progress meeting',event_date:shift(today(),4),event_time:'11:00:00',description:'Bring updated schedule and variation notes.',project_id:'project-rowville',assigned_to:'manager-preview',created_by:'owner-preview',created_at:iso(9)}
    ];
    const reports=[
      {id:'report-1',project_id:'project-rowville',user_id:'supervisor-preview',role_snapshot:'site_supervisor',report_date:shift(today(),-1),completed_work:'Checked waterproofing preparation and updated the site checklist.',unfinished_work:'Bedroom wet-area photos still need filing.',issues_delays:'No material delay.',tomorrow_notes:'Confirm membrane delivery before 8 am.',submitted_at:iso(1)},
      {id:'report-2',project_id:'project-rowville',user_id:'worker-preview',role_snapshot:'worker',report_date:today(),completed_work:'Installed bedroom cabling and completed the rough-in photos.',unfinished_work:'Fit-off remains for the next stage.',issues_delays:'No delay.',tomorrow_notes:'Check switch locations with the supervisor.',submitted_at:new Date(now.getTime()-35*60000).toISOString()},
      {id:'report-3',project_id:'project-glen',user_id:'manager-preview',role_snapshot:'manager',report_date:today(),completed_work:'Reviewed the project program and coordinated tomorrow’s trades.',unfinished_work:'Supplier confirmation pending.',issues_delays:'Timber delivery moved to the afternoon.',tomorrow_notes:'Confirm delivery before 9 am.',submitted_at:new Date(now.getTime()-55*60000).toISOString()}
    ];
    const visibleReports=permissions.can_view_all_reports?reports:reports.filter(item=>item.user_id===viewerId);
    return{viewer:{...members.find(item=>item.id===viewerId),id:viewerId,role:previewRole},permissions,folders:office?folders:[],files:office?files:[],events:management?events:events.filter(item=>item.assigned_to===viewerId||item.created_by===viewerId),projects,members:management?members:[members.find(item=>item.id===viewerId)],reports:visibleReports};
  }

  async function load(){
    try{
      if(preview){state={...state,...previewData()}}
      else{
        await window.ACAuth?.ready;
        const from=shift(today(),-370),to=shift(today(),370),[operations,team]=await Promise.all([api.snapshot(from,to),api.teamSnapshot(shift(today(),-120),shift(today(),30)).catch(()=>({reports:[],projects:[],members:[]}))]);
        state={...state,...operations,reports:Array.isArray(team.reports)?team.reports:[],projects:Array.isArray(team.projects)&&team.projects.length?team.projects:(operations.projects||[]),members:Array.isArray(team.members)&&team.members.length?team.members:(operations.members||[])};
      }
      state.folders=Array.isArray(state.folders)?state.folders:[];state.files=Array.isArray(state.files)?state.files:[];state.events=Array.isArray(state.events)?state.events:[];state.reports=Array.isArray(state.reports)?state.reports:[];state.loaded=true;
      applyRoleUI();renderAll();applyRoute();
    }catch(error){
      state.loaded=true;applyRoleUI();['opsQuoteFolders','opsDocumentFolders','opsDayEvents','opsReportList'].forEach(id=>{const node=$(id);if(node)node.innerHTML=`<div class="ops-empty"><strong>${esc(error.message)}</strong><br>Install the private V47 migration, then refresh.</div>`});notify(error.message,'error');
    }
  }

  function notify(message,tone=''){
    const note=document.createElement('div');note.className=`ops-toast ${tone}`;note.textContent=message;document.body.appendChild(note);requestAnimationFrame(()=>note.classList.add('show'));setTimeout(()=>{note.classList.remove('show');setTimeout(()=>note.remove(),220)},3300);
  }
  function permission(name){return state.permissions?.[name]===true}
  function applyRoleUI(){
    const map={quotes:'can_open_quotes',schedule:'can_open_schedule',checklists:null,documents:'can_open_documents',reports:'can_open_reports'};
    Object.entries(map).forEach(([view,key])=>{const allowed=key===null||permission(key);document.querySelectorAll(`[data-operation-tool="${view}"],[data-open-view="${view}"]`).forEach(node=>node.hidden=!allowed)});
    const quoteCard=document.querySelector('.oh-estimates'),documentCard=document.querySelector('.oh-documents');if(quoteCard)quoteCard.hidden=!permission('can_open_quotes');if(documentCard)documentCard.hidden=!permission('can_open_documents');
    $('opsNewQuoteFolder').hidden=!permission('can_manage_quotes');$('opsNewDocumentFolder').hidden=!permission('can_manage_documents');$('opsNewEvent').hidden=!(permission('can_manage_schedule')||permission('can_create_personal_event'));$('opsAddSelectedEvent').hidden=$('opsNewEvent').hidden;
    const visible=[...document.querySelectorAll('[data-operation-tool]')].filter(node=>!node.hidden).length,toggle=$('workspaceToolsToggle');toggle.querySelector('em').textContent=visible;toggle.hidden=visible===0;
    window.ACRefreshSideGroups?.();
  }
  function applyRoute(){
    const requested=params.get('view')||'';
    const allowed={quotes:permission('can_open_quotes'),schedule:permission('can_open_schedule'),checklists:true,documents:permission('can_open_documents'),reports:permission('can_open_reports')}[requested];
    if(allowed)document.querySelector(`[data-view="${requested}"]`)?.click();
    else if(['quotes','schedule','checklists','documents','reports'].includes(requested)){document.querySelector('[data-view="team-management"]')?.click();notify('This Work Management page is not available for your role.','error')}
  }

  const folderName=folder=>folder.module==='quote'?folder.customer_name||'Customer quote':folder.folder_name||'Document folder';
  const folderSub=folder=>folder.module==='quote'?folder.work_type||'Work type not recorded':folder.notes||'Company documents';
  const filesFor=id=>state.files.filter(item=>item.folder_id===id).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  const canManageFolder=folder=>folder.module==='quote'?permission('can_manage_quotes'):permission('can_manage_documents');
  function folderCard(folder,selected){
    const files=filesFor(folder.id);return`<button class="ops-folder-card ${selected===folder.id?'active':''}" type="button" data-ops-folder="${esc(folder.id)}"><span class="ops-folder-card-icon">${folder.module==='quote'?'▤':'▱'}</span><span><strong>${esc(folderName(folder))}</strong><span>${esc(folderSub(folder))}</span><small>Updated ${esc(dateLabel(folder.updated_at||folder.created_at))}</small></span><b>${files.length}</b></button>`;
  }
  function renderFolders(module){
    const quote=module==='quote',query=$(quote?'opsQuoteSearch':'opsDocumentSearch').value.toLowerCase().trim(),selected=quote?state.selectedQuote:state.selectedDocument,container=$(quote?'opsQuoteFolders':'opsDocumentFolders');
    const folders=state.folders.filter(item=>item.module===module&&(!query||`${folderName(item)} ${folderSub(item)} ${item.notes||''}`.toLowerCase().includes(query)));
    container.innerHTML=folders.map(item=>folderCard(item,selected)).join('')||`<div class="ops-empty">${query?'No folders match this search.':quote?'No customer quote folders yet. Create the first one.':'No document folders yet. Create the first one.'}</div>`;
    renderFolderDetail(module);
  }
  function fileKind(file){const name=String(file.file_name||''),type=String(file.mime_type||'');if(/pdf/i.test(type)||/\.pdf$/i.test(name))return'PDF';if(/^image\//i.test(type))return'IMG';if(/spreadsheet|excel|csv/i.test(type)||/\.(xlsx?|csv)$/i.test(name))return'XLS';if(/word|document/i.test(type)||/\.docx?$/i.test(name))return'DOC';return'FILE'}
  function renderFolderDetail(module){
    const quote=module==='quote',id=quote?state.selectedQuote:state.selectedDocument,detail=$(quote?'opsQuoteDetail':'opsDocumentDetail'),folder=state.folders.find(item=>item.id===id&&item.module===module);
    if(!folder){detail.innerHTML=`<div class="ops-detail-empty"><span>${quote?'▤':'▱'}</span><strong>Select a ${quote?'quote':'document'} folder</strong><p>Choose a folder to view or upload files.</p></div>`;return}
    const manage=canManageFolder(folder),rows=filesFor(folder.id);
    detail.innerHTML=`<div class="ops-detail-head"><div><small>${quote?'Customer quote':'Document folder'}</small><strong>${esc(folderName(folder))}</strong><span>${esc(folderSub(folder))}${folder.notes?` · ${esc(folder.notes)}`:''}</span></div>${manage?`<div class="ops-detail-actions"><button type="button" data-ops-folder-edit>Edit</button><button class="danger" type="button" data-ops-folder-delete>Delete</button></div>`:''}</div>${manage?`<div class="ops-upload-box" data-ops-drop><strong>Drop files here or choose from your device</strong><span>Any file type · up to 25 MB each</span><label>Choose Files<input type="file" multiple data-ops-upload></label></div>`:''}<div class="ops-file-list">${rows.map(file=>`<article class="ops-file-row" data-ops-file="${esc(file.id)}"><span class="ops-file-icon">${fileKind(file)}</span><div><strong>${esc(file.file_name)}</strong><span>${esc(sizeLabel(file.file_size_bytes))} · ${esc(dateTime(file.created_at))}</span></div><div class="ops-file-actions"><button type="button" data-ops-file-open>Open</button>${manage?'<button type="button" data-ops-file-delete>Delete</button>':''}</div></article>`).join('')||'<div class="ops-empty">No files in this folder yet.</div>'}</div>`;
    bindDrop(detail,folder);
  }
  function bindDrop(detail,folder){
    const input=detail.querySelector('[data-ops-upload]'),drop=detail.querySelector('[data-ops-drop]');if(!input||!drop)return;
    input.addEventListener('change',()=>uploadFiles(folder,input.files));
    ['dragenter','dragover'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('drag')}));
    ['dragleave','drop'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove('drag')}));
    drop.addEventListener('drop',event=>uploadFiles(folder,event.dataTransfer.files));
  }
  async function uploadFiles(folder,fileList){
    const files=[...fileList];if(!files.length)return;notify(`Uploading ${files.length} file${files.length===1?'':'s'}…`);
    try{
      for(const file of files){
        const saved=preview?{id:uid('file'),folder_id:folder.id,file_name:file.name,mime_type:file.type||'application/octet-stream',file_size_bytes:file.size,storage_path:'preview/new',uploaded_by:state.viewer.id,created_at:new Date().toISOString()}:await api.uploadFile(folder,file);
        state.files.unshift(saved);
      }
      folder.updated_at=new Date().toISOString();renderFolders(folder.module);renderKpis();renderOverviewData();notify(`${files.length} file${files.length===1?'':'s'} uploaded.`);
    }catch(error){notify(error.message,'error')}
  }
  function openFolderModal(module,folder=null){
    state.editingFolder=folder;$('opsFolderForm').reset();$('opsFolderId').value=folder?.id||'';$('opsFolderModule').value=module;$('opsFolderModalTitle').textContent=folder?'Edit Folder':module==='quote'?'New Quote Folder':'New Document Folder';$('opsFolderModalEyebrow').textContent=module==='quote'?'Customer quote archive':'Company document library';
    document.querySelectorAll('[data-ops-quote-field]').forEach(node=>node.hidden=module!=='quote');document.querySelectorAll('[data-ops-document-field]').forEach(node=>node.hidden=module!=='document');
    $('opsFolderCustomer').required=module==='quote';$('opsFolderWorkType').required=module==='quote';$('opsFolderName').required=module==='document';$('opsFolderCustomer').value=folder?.customer_name||'';$('opsFolderWorkType').value=folder?.work_type||'';$('opsFolderName').value=folder?.folder_name||'';$('opsFolderNotes').value=folder?.notes||'';$('opsFolderModal').classList.add('show');$('opsFolderModal').setAttribute('aria-hidden','false');
  }
  function closeFolderModal(){$('opsFolderModal').classList.remove('show');$('opsFolderModal').setAttribute('aria-hidden','true');state.editingFolder=null}
  async function saveFolder(event){
    event.preventDefault();const module=$('opsFolderModule').value,value={id:$('opsFolderId').value||null,module,customer_name:$('opsFolderCustomer').value.trim(),work_type:$('opsFolderWorkType').value.trim(),folder_name:$('opsFolderName').value.trim(),notes:$('opsFolderNotes').value.trim()};
    if(module==='quote'&&(!value.customer_name||!value.work_type))return notify('Enter the customer name and type of work.','error');if(module==='document'&&!value.folder_name)return notify('Enter a folder name.','error');
    try{
      let saved;if(preview){const existing=state.folders.find(item=>item.id===value.id);if(existing){Object.assign(existing,value,{updated_at:new Date().toISOString()});saved=existing}else{saved={...value,id:uid('folder'),created_by:state.viewer.id,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};state.folders.unshift(saved)}}else saved=await api.saveFolder(value);
      if(module==='quote')state.selectedQuote=saved.id;else state.selectedDocument=saved.id;closeFolderModal();renderFolders(module);renderKpis();renderOverviewData();notify('Folder saved.');
    }catch(error){notify(error.message,'error')}
  }
  async function deleteFolder(folder){
    const count=filesFor(folder.id).length;if(!confirm(`Delete “${folderName(folder)}”${count?` and its ${count} file${count===1?'':'s'}`:''}? This cannot be undone.`))return;
    try{if(!preview)await api.deleteFolder(folder.id);state.folders=state.folders.filter(item=>item.id!==folder.id);state.files=state.files.filter(item=>item.folder_id!==folder.id);if(folder.module==='quote')state.selectedQuote='';else state.selectedDocument='';renderFolders(folder.module);renderKpis();renderOverviewData();notify('Folder deleted.')}catch(error){notify(error.message,'error')}
  }
  async function deleteFile(file,folder){
    if(!confirm(`Delete “${file.file_name}”? This cannot be undone.`))return;
    try{if(!preview)await api.deleteFile(file.id);state.files=state.files.filter(item=>item.id!==file.id);folder.updated_at=new Date().toISOString();renderFolders(folder.module);renderKpis();renderOverviewData();notify('File deleted.')}catch(error){notify(error.message,'error')}
  }

  function monthTitle(){return state.month.toLocaleDateString('en-AU',{month:'long',year:'numeric'})}
  function eventsFor(date){return state.events.filter(item=>String(item.event_date).slice(0,10)===date).sort((a,b)=>String(a.event_time||'99:99').localeCompare(String(b.event_time||'99:99')))}
  function renderCalendar(){
    $('opsCalendarTitle').textContent=monthTitle();const first=new Date(state.month),offset=(first.getDay()+6)%7,start=new Date(first);start.setDate(first.getDate()-offset);const cells=[];
    for(let index=0;index<42;index++){const date=new Date(start);date.setDate(start.getDate()+index);const key=localKey(date),events=eventsFor(key),outside=date.getMonth()!==state.month.getMonth();cells.push(`<button class="ops-calendar-day ${outside?'outside':''} ${key===today()?'today':''} ${key===state.selectedDate?'selected':''}" type="button" data-ops-date="${key}"><span class="ops-day-number">${date.getDate()}</span><span class="ops-calendar-dots">${events.slice(0,2).map(item=>`<span class="ops-calendar-event-chip">${esc(item.event_time?timeLabel(item.event_time):'All day')} ${esc(item.title)}</span>`).join('')}${events.length>2?`<span class="ops-calendar-more">+${events.length-2} more</span>`:''}</span></button>`)}
    $('opsCalendarGrid').innerHTML=cells.join('');const monthPrefix=`${state.month.getFullYear()}-${String(state.month.getMonth()+1).padStart(2,'0')}`;const total=state.events.filter(item=>String(item.event_date).startsWith(monthPrefix)).length;$('opsCalendarCount').textContent=`${total} event${total===1?'':'s'}`;renderDay();
  }
  const projectName=id=>state.projects.find(item=>item.id===id)?.name||'';
  const memberName=id=>state.members.find(item=>item.id===id)?.full_name||state.members.find(item=>item.id===id)?.email||'';
  function renderDay(){
    const date=new Date(`${state.selectedDate}T12:00:00`),rows=eventsFor(state.selectedDate);$('opsSelectedDayName').textContent=date.toLocaleDateString('en-AU',{weekday:'long'});$('opsSelectedDayDate').textContent=date.toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
    $('opsDayEvents').innerHTML=rows.map(item=>`<button class="ops-day-event" type="button" data-ops-event="${esc(item.id)}"><time>${esc(timeLabel(item.event_time))}</time><span><strong>${esc(item.title)}</strong><span>${esc(item.description||'No description')}</span><small>${esc([projectName(item.project_id),memberName(item.assigned_to)].filter(Boolean).join(' · ')||'Personal event')}</small></span></button>`).join('')||'<div class="ops-empty">Nothing scheduled for this day.</div>';
  }
  function fillEventChoices(){
    $('opsEventProject').innerHTML='<option value="">No project</option>'+state.projects.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
    $('opsEventAssignee').innerHTML='<option value="">Myself</option>'+state.members.map(item=>`<option value="${esc(item.id)}">${esc(item.full_name||item.email)} — ${esc(roleLabel(item.role))}</option>`).join('');
  }
  function openEventModal(item=null){
    if(!(permission('can_manage_schedule')||permission('can_create_personal_event')))return;state.editingEvent=item;fillEventChoices();$('opsEventForm').reset();$('opsEventId').value=item?.id||'';$('opsEventTitle').value=item?.title||'';$('opsEventDate').value=String(item?.event_date||state.selectedDate||today()).slice(0,10);$('opsEventTime').value=String(item?.event_time||'').slice(0,5);$('opsEventProject').value=item?.project_id||'';$('opsEventAssignee').value=item?.assigned_to||'';$('opsEventDescription').value=item?.description||'';$('opsEventModalTitle').textContent=item?'Edit Event':'New Event';$('opsEventAssigneeField').hidden=!permission('can_manage_schedule');$('opsDeleteEvent').hidden=!item||!(permission('can_manage_schedule')||item.created_by===state.viewer?.id);$('opsEventModal').classList.add('show');$('opsEventModal').setAttribute('aria-hidden','false');
  }
  function closeEventModal(){$('opsEventModal').classList.remove('show');$('opsEventModal').setAttribute('aria-hidden','true');state.editingEvent=null}
  async function saveEvent(event){
    event.preventDefault();const value={id:$('opsEventId').value||null,title:$('opsEventTitle').value.trim(),event_date:$('opsEventDate').value,event_time:$('opsEventTime').value||null,project_id:$('opsEventProject').value||null,assigned_to:permission('can_manage_schedule')?$('opsEventAssignee').value||null:null,description:$('opsEventDescription').value.trim()};if(!value.title||!value.event_date)return notify('Enter an event title and date.','error');
    try{let saved;if(preview){const existing=state.events.find(item=>item.id===value.id);if(existing){Object.assign(existing,value,{updated_at:new Date().toISOString()});saved=existing}else{saved={...value,id:uid('event'),assigned_to:value.assigned_to||state.viewer.id,created_by:state.viewer.id,created_at:new Date().toISOString()};state.events.push(saved)}}else saved=await api.saveEvent(value);state.selectedDate=String(saved.event_date).slice(0,10);state.month=new Date(`${state.selectedDate.slice(0,7)}-01T12:00:00`);closeEventModal();renderCalendar();renderOverviewData();notify('Event saved.')}catch(error){notify(error.message,'error')}
  }
  async function deleteEvent(){
    const item=state.editingEvent;if(!item||!confirm(`Delete “${item.title}”?`))return;try{if(!preview)await api.deleteEvent(item.id);state.events=state.events.filter(event=>event.id!==item.id);closeEventModal();renderCalendar();renderOverviewData();notify('Event deleted.')}catch(error){notify(error.message,'error')}
  }

  function filteredReports(){
    const project=$('opsReportProject').value,person=$('opsReportPerson').value,date=$('opsReportDate').value;return [...state.reports].filter(item=>(!project||item.project_id===project)&&(!person||item.user_id===person)&&(!date||String(item.report_date).slice(0,10)===date)).sort((a,b)=>String(b.submitted_at||b.report_date).localeCompare(String(a.submitted_at||a.report_date)));
  }
  function reportHasIssue(item){const value=String(item.issues_delays||'').trim().toLowerCase();return value&&!/^(none|no delay|no delays|n\/a|nil|no material delay)\.?$/.test(value)}
  function renderReports(){
    const projects=[...new Map(state.projects.map(item=>[item.id,item])).values()],members=[...new Map(state.members.map(item=>[item.id,item])).values()],projectValue=$('opsReportProject').value,personValue=$('opsReportPerson').value;$('opsReportProject').innerHTML='<option value="">All projects</option>'+projects.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');$('opsReportPerson').innerHTML='<option value="">All people</option>'+members.map(item=>`<option value="${esc(item.id)}">${esc(item.full_name||item.email)}</option>`).join('');if(projects.some(item=>item.id===projectValue))$('opsReportProject').value=projectValue;if(members.some(item=>item.id===personValue))$('opsReportPerson').value=personValue;
    const rows=filteredReports();$('opsReportList').innerHTML=rows.map(item=>`<article class="ops-report-card"><header><span class="ops-report-avatar">${esc(initials(memberName(item.user_id)))}</span><span><strong>${esc(memberName(item.user_id)||'Team member')}</strong><span>${esc(roleLabel(item.role_snapshot))} · ${esc(projectName(item.project_id)||'Project')}</span></span><time>${esc(dateLabel(item.report_date))}</time></header><div class="ops-report-grid"><div><small>Completed today</small><p>${esc(item.completed_work||'No completed work entered.')}</p></div><div><small>Unfinished work</small><p>${esc(item.unfinished_work||'None reported.')}</p></div><div class="${reportHasIssue(item)?'issue':''}"><small>Problems or delays</small><p>${esc(item.issues_delays||'None reported.')}</p></div><div><small>Notes for tomorrow</small><p>${esc(item.tomorrow_notes||'No note entered.')}</p></div></div></article>`).join('')||'<div class="ops-empty">No daily reports match these filters.</div>';
    const weekStart=new Date();weekStart.setHours(0,0,0,0);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));$('opsReportsToday').textContent=state.reports.filter(item=>String(item.report_date).slice(0,10)===today()).length;$('opsReportsWeek').textContent=state.reports.filter(item=>new Date(`${String(item.report_date).slice(0,10)}T12:00:00`)>=weekStart).length;$('opsReportsIssues').textContent=state.reports.filter(reportHasIssue).length;
  }
  function renderKpis(){
    const quoteFolders=state.folders.filter(item=>item.module==='quote'),documentFolders=state.folders.filter(item=>item.module==='document'),quoteIds=new Set(quoteFolders.map(item=>item.id)),documentIds=new Set(documentFolders.map(item=>item.id)),quoteFiles=state.files.filter(item=>quoteIds.has(item.folder_id)),documentFiles=state.files.filter(item=>documentIds.has(item.folder_id)),cutoff=Date.now()-30*86400000;
    $('opsQuoteFolderCount').textContent=quoteFolders.length;$('opsQuoteFileCount').textContent=quoteFiles.length;$('opsQuoteRecentCount').textContent=quoteFolders.filter(item=>new Date(item.updated_at||item.created_at).getTime()>=cutoff).length;$('opsDocumentFolderCount').textContent=documentFolders.length;$('opsDocumentFileCount').textContent=documentFiles.length;$('opsDocumentStorage').textContent=sizeLabel(documentFiles.reduce((sum,item)=>sum+Number(item.file_size_bytes||0),0));
  }
  function renderOverviewData(){
    if(!state.loaded)return;const quoteFolders=state.folders.filter(item=>item.module==='quote'),documentFolders=state.folders.filter(item=>item.module==='document'),quoteIds=new Set(quoteFolders.map(item=>item.id)),documentIds=new Set(documentFolders.map(item=>item.id)),quoteFiles=state.files.filter(item=>quoteIds.has(item.folder_id)),documentFiles=state.files.filter(item=>documentIds.has(item.folder_id)),last=[...quoteFolders,...quoteFiles].sort((a,b)=>String(b.updated_at||b.created_at).localeCompare(String(a.updated_at||a.created_at)))[0];
    const set=(id,value)=>{const node=$(id);if(node)node.textContent=value};set('ohQuoteCount',quoteFolders.length||'—');set('ohQuoteFileCount',quoteFiles.length||'—');set('ohQuoteUpdated',last?dateLabel(last.updated_at||last.created_at):'—');set('ohDocumentCount',documentFiles.length||'—');set('ohDocumentFolderCount',documentFolders.length||'—');set('ohRegisterCount',state.reports.length||'—');
    const upcoming=state.events.filter(item=>String(item.event_date).slice(0,10)>=today()).sort((a,b)=>`${a.event_date}${a.event_time||'99:99'}`.localeCompare(`${b.event_date}${b.event_time||'99:99'}`)).slice(0,4),list=$('ohScheduleList');if(list)list.innerHTML=upcoming.length?upcoming.map(item=>`<div class="oh-schedule-item"><time>${esc(String(item.event_date).slice(0,10)===today()?timeLabel(item.event_time):dateLabel(item.event_date).replace(/\\s\\d{4}$/,''))}</time><div><strong>${esc(item.title)}</strong><span>${esc(projectName(item.project_id)||item.description||'Scheduled event')}</span></div></div>`).join(''):'<div class="empty">No upcoming events. Open Schedule to add one.</div>';
  }
  window.ACOperationToolsOverview={render:renderOverviewData};
  function renderAll(){renderKpis();renderFolders('quote');renderFolders('document');renderCalendar();renderReports();renderOverviewData()}

  function selectFolder(module,id){if(module==='quote')state.selectedQuote=id;else state.selectedDocument=id;renderFolders(module)}
  ['opsQuoteSearch','opsDocumentSearch'].forEach(id=>$(id).addEventListener('input',()=>renderFolders(id==='opsQuoteSearch'?'quote':'document')));
  $('opsQuoteFolders').addEventListener('click',event=>{const card=event.target.closest('[data-ops-folder]');if(card)selectFolder('quote',card.dataset.opsFolder)});
  $('opsDocumentFolders').addEventListener('click',event=>{const card=event.target.closest('[data-ops-folder]');if(card)selectFolder('document',card.dataset.opsFolder)});
  ['opsQuoteDetail','opsDocumentDetail'].forEach(id=>$(id).addEventListener('click',event=>{const module=id==='opsQuoteDetail'?'quote':'document',folder=state.folders.find(item=>item.id===(module==='quote'?state.selectedQuote:state.selectedDocument));if(!folder)return;if(event.target.closest('[data-ops-folder-edit]'))openFolderModal(module,folder);if(event.target.closest('[data-ops-folder-delete]'))deleteFolder(folder);const row=event.target.closest('[data-ops-file]'),file=row&&state.files.find(item=>item.id===row.dataset.opsFile);if(file&&event.target.closest('[data-ops-file-open]'))(preview?Promise.resolve(notify('File preview opens after the V47 migration is installed.')):api.openFile(file)).catch(error=>notify(error.message,'error'));if(file&&event.target.closest('[data-ops-file-delete]'))deleteFile(file,folder)}));
  $('opsNewQuoteFolder').addEventListener('click',()=>openFolderModal('quote'));$('opsNewDocumentFolder').addEventListener('click',()=>openFolderModal('document'));$('opsFolderForm').addEventListener('submit',saveFolder);document.querySelectorAll('[data-ops-folder-close]').forEach(button=>button.addEventListener('click',closeFolderModal));$('opsFolderModal').addEventListener('click',event=>{if(event.target===$('opsFolderModal'))closeFolderModal()});
  $('workspaceToolsToggle').addEventListener('click',()=>{const next=$('workspaceToolsToggle').getAttribute('aria-expanded')!=='true';$('workspaceToolsToggle').setAttribute('aria-expanded',String(next));$('workspaceToolsMenu').hidden=!next});

  $('opsCalendarGrid').addEventListener('click',event=>{const day=event.target.closest('[data-ops-date]');if(!day)return;state.selectedDate=day.dataset.opsDate;const date=new Date(`${state.selectedDate}T12:00:00`);if(date.getMonth()!==state.month.getMonth()){state.month=new Date(date.getFullYear(),date.getMonth(),1)}renderCalendar()});
  $('opsCalendarPrev').addEventListener('click',()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);renderCalendar()});$('opsCalendarNext').addEventListener('click',()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);renderCalendar()});$('opsCalendarToday').addEventListener('click',()=>{state.selectedDate=today();const value=new Date();state.month=new Date(value.getFullYear(),value.getMonth(),1);renderCalendar()});
  $('opsNewEvent').addEventListener('click',()=>openEventModal());$('opsAddSelectedEvent').addEventListener('click',()=>openEventModal());$('opsDayEvents').addEventListener('click',event=>{const button=event.target.closest('[data-ops-event]');if(button)openEventModal(state.events.find(item=>item.id===button.dataset.opsEvent))});$('opsEventForm').addEventListener('submit',saveEvent);$('opsDeleteEvent').addEventListener('click',deleteEvent);document.querySelectorAll('[data-ops-event-close]').forEach(button=>button.addEventListener('click',closeEventModal));$('opsEventModal').addEventListener('click',event=>{if(event.target===$('opsEventModal'))closeEventModal()});
  ['opsReportProject','opsReportPerson','opsReportDate'].forEach(id=>$(id).addEventListener('input',renderReports));$('opsOpenReportForm').addEventListener('click',()=>{document.querySelector('[data-view="team-management"]')?.click();setTimeout(()=>document.querySelector('[data-tm-tab="reports"]')?.click(),0)});

  load();
})();
