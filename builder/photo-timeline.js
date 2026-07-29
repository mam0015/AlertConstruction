(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const api=window.ACPhotoAPI;
  const pdf=window.ACBookletPDF;
  const params=()=>new URLSearchParams(location.search);
  const preview=params().get('preview')==='1';
  const previewRole=params().get('role')||'owner';
  const allowedRoles=new Set(['owner','admin','manager','site_supervisor','estimator']);
  const selectedPhotos=new Set();
  const activePhotoUrls=new Set();

  let state={
    viewer:null,
    projects:[],
    company_profile:{},
    photos:[],
    pairs:[],
    reports:[],
    booklet:{},
    pending_storage_cleanup:[],
    projectId:'',
    view:'gallery',
    loaded:false
  };
  let queue=[];
  let prepared=null;
  let previewUrl='';
  let viewerPhotoId='';

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const today=()=>{
    const date=new Date();
    return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10);
  };
  const dateLabel=value=>value
    ?new Date(`${String(value).slice(0,10)}T00:00:00`).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})
    :'—';
  const dateHeading=value=>value
    ?new Date(`${String(value).slice(0,10)}T00:00:00`).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    :'Date not recorded';
  const currentProject=()=>state.projects.find(project=>project.id===state.projectId)||null;
  const canUpload=()=>!!state.viewer?.can_upload;
  const canBuild=()=>!!state.viewer?.can_build_booklet;
  const canProfile=()=>!!state.viewer?.can_manage_profile;
  const canEditPhoto=()=>!!state.viewer?.can_edit_all;
  const asNumber=value=>Number(value||0);

  function toast(message,tone=''){
    const note=document.createElement('div');
    note.className=`tm-toast ${tone}`;
    note.textContent=message;
    document.body.appendChild(note);
    setTimeout(()=>note.classList.add('show'),20);
    setTimeout(()=>{
      note.classList.remove('show');
      setTimeout(()=>note.remove(),250);
    },3800);
  }
  function blobDataUrl(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  function setRoute(projectId='',tab=''){
    const url=new URL(location.href);
    if(projectId)url.searchParams.set('project',projectId);
    else url.searchParams.delete('project');
    if(tab)url.searchParams.set('tab',tab);
    else url.searchParams.delete('tab');
    history.replaceState(null,'',url);
  }

  function previewData(projectId=''){
    const role=previewRole;
    const viewerId=`${role}-preview`;
    const assets=[
      '../assets/luxury-property.webp',
      '../assets/luxury-renovation.webp',
      '../assets/luxury-site.webp',
      '../assets/luxury-builder-hero.webp',
      '../assets/luxury-plans.webp'
    ];
    const projects=[
      {id:'project-rowville',name:'Kelighton Renovation',address:'Rowville VIC 3178',status:'Active',category:'Full Home Renovation'},
      {id:'project-glen',name:'Glen Waverley Extension',address:'Glen Waverley VIC 3150',status:'Active',category:'Extension'},
      {id:'project-hawthorn',name:'Hawthorn Residence',address:'Hawthorn VIC 3122',status:'Completed',category:'Renovation'}
    ];
    const base={mime_type:'image/jpeg',file_size_bytes:420000,width:1600,height:1000,internal_notes:'',uploaded_by:viewerId,created_at:new Date().toISOString()};
    const allPhotos=[
      {...base,id:'photo-before-1',project_id:'project-rowville',storage_path:assets[0],file_hash:'before1',phase:'Before',project_stage:'Initial Inspection',title:'Original front exterior',description:'Existing exterior before construction began.',photo_date:'2026-03-03',area:'Exterior',trade:'General Construction',privacy_status:'Approved for Marketing',display_order:1,featured:false,cover_photo:false,signed_url:assets[0]},
      {...base,id:'photo-before-2',project_id:'project-rowville',storage_path:assets[4],file_hash:'before2',phase:'Before',project_stage:'Initial Inspection',title:'Existing project condition',description:'Initial site condition recorded for project planning.',photo_date:'2026-03-03',area:'Ground Floor',trade:'General Construction',privacy_status:'Approved for Marketing',display_order:2,featured:false,cover_photo:false,signed_url:assets[4]},
      {...base,id:'photo-during-1',project_id:'project-rowville',storage_path:assets[2],file_hash:'during1',phase:'During',project_stage:'Framing',title:'Structural progress',description:'Framing and structural works in progress.',photo_date:'2026-04-18',area:'Ground Floor',trade:'Structural',privacy_status:'Approved for Marketing',display_order:3,featured:false,cover_photo:false,signed_url:assets[2]},
      {...base,id:'photo-during-2',project_id:'project-rowville',storage_path:assets[3],file_hash:'during2',phase:'During',project_stage:'Fit-Off',title:'Interior fit-off',description:'Final trades coordinating the fit-off stage.',photo_date:'2026-06-08',area:'Interior',trade:'General Construction',privacy_status:'Client Visible',display_order:4,featured:false,cover_photo:false,signed_url:assets[3]},
      {...base,id:'photo-after-1',project_id:'project-rowville',storage_path:assets[1],file_hash:'after1',phase:'After',project_stage:'Completed',title:'Completed renovation',description:'The completed home with the approved finishes installed.',photo_date:'2026-07-12',area:'Exterior',trade:'General Construction',privacy_status:'Approved for Marketing',display_order:5,featured:true,cover_photo:true,signed_url:assets[1]},
      {...base,id:'photo-glen-1',project_id:'project-glen',storage_path:assets[2],file_hash:'glen1',phase:'During',project_stage:'Structure',title:'Extension structure',description:'Structural extension works recorded on site.',photo_date:'2026-07-22',area:'Rear Extension',trade:'Carpentry',privacy_status:'Client Visible',display_order:1,featured:true,cover_photo:true,signed_url:assets[2]},
      {...base,id:'photo-hawthorn-1',project_id:'project-hawthorn',storage_path:assets[3],file_hash:'hawthorn1',phase:'After',project_stage:'Handover',title:'Final handover',description:'Completed residence at handover.',photo_date:'2026-05-14',area:'Interior',trade:'General Construction',privacy_status:'Approved for Marketing',display_order:1,featured:true,cover_photo:true,signed_url:assets[3]}
    ];
    const authorised=role==='site_supervisor'?[projects[0]]:projects;
    const visiblePhotos=role==='estimator'?allPhotos.filter(photo=>photo.privacy_status!=='Internal Only'):allPhotos;
    const summarised=authorised.map(project=>{
      const rows=visiblePhotos.filter(photo=>photo.project_id===project.id);
      const cover=[...rows].sort((one,two)=>Number(two.cover_photo)-Number(one.cover_photo)||Number(two.featured)-Number(one.featured)||String(two.photo_date).localeCompare(String(one.photo_date)))[0];
      return{
        ...project,
        photo_count:rows.length,
        marketing_count:rows.filter(photo=>photo.privacy_status==='Approved for Marketing').length,
        before_count:rows.filter(photo=>photo.phase==='Before').length,
        during_count:rows.filter(photo=>photo.phase==='During').length,
        after_count:rows.filter(photo=>photo.phase==='After').length,
        latest_photo_date:[...rows].sort((one,two)=>String(two.photo_date).localeCompare(String(one.photo_date)))[0]?.photo_date||'',
        cover_storage_path:cover?.storage_path||'',
        cover_title:cover?.title||''
      };
    });
    const company={
      company_name:'Alert Construction',
      abn:'72 646 119 717',
      phone:'(03) 8820 6567',
      email:'info@alertconstruction.com.au',
      business_location:'Mount Waverley, VIC 3149',
      service_areas:'Melbourne and surrounding suburbs',
      logo_path:'../assets/invoice-logo.png',
      company_description:'Alert Construction provides professional construction, renovation, building inspection, structural and project management services across Victoria. Our team focuses on quality workmanship, clear communication and reliable project delivery from initial assessment through to completion.',
      services:'Full Home Renovations, Extensions and Additions, New Homes, Bathroom Renovations, Outdoor Renovations, Commercial Fit-Outs, Building Inspections, Structural Solutions, Permits and Drawings, Project Management',
      builder_registration_number:'DB-U 000000',
      website:'www.alertconstruction.com.au',
      slogan:'Your Building Clinic',
      brand_colour:'#f5b400',
      full_address:''
    };
    const access=allowedRoles.has(role);
    const upload=['owner','admin'].includes(role);
    const build=['owner','admin'].includes(role);
    const selectedRows=access&&projectId?visiblePhotos.filter(photo=>photo.project_id===projectId):[];
    return{
      viewer:{id:viewerId,role,can_upload:upload,can_edit_all:upload,can_approve_marketing:upload,can_build_booklet:build,can_manage_profile:role==='owner'},
      projects:summarised,
      company_profile:company,
      photos:selectedRows,
      pairs:build&&projectId==='project-rowville'?[{id:'pair-1',project_id:'project-rowville',before_photo_id:'photo-before-1',after_photo_id:'photo-after-1',title:'Exterior transformation',description:'The original exterior was transformed into a clean, contemporary completed home.',display_order:1}]:[],
      reports:[],
      pending_storage_cleanup:[],
      booklet:{
        title:'Project Transformation Report',
        project_type:'Full Home Renovation',
        location_mode:'Show Suburb Only',
        template:'Professional',
        start_date:'2026-03-03',
        completion_date:'2026-07-12',
        initial_requirements:'Create a modern, practical family home with improved flow and durable finishes.',
        initial_problems:'The existing property required a complete update and better use of the available space.',
        scope_of_work:'Full renovation works from initial preparation through structural work, services, finishes and final handover.',
        project_challenges:'Coordinating multiple trades while maintaining the approved program.',
        solutions_provided:'Detailed scheduling, regular site reviews and clear communication across the team.',
        final_result:'A complete, cohesive renovation delivered with a refined finish.',
        main_services_completed:'Project management, structural works, electrical, plumbing, finishes and final inspection.',
        problems_solved:'Outdated layout, worn finishes and inefficient use of space.',
        project_highlights:'Modern exterior, coordinated finishes and a complete Before and After transformation.'
      }
    };
  }

  async function enrichPhotos(rows){
    if(preview)return rows;
    activePhotoUrls.forEach(url=>URL.revokeObjectURL(url));
    activePhotoUrls.clear();
    return Promise.all(rows.map(async photo=>{
      try{
        const url=await api.privateObjectUrl('project-photos',photo.storage_path);
        activePhotoUrls.add(url);
        return{...photo,signed_url:url};
      }catch(_){
        return{...photo,signed_url:''};
      }
    }));
  }
  async function enrichProjects(rows){
    if(preview)return rows.map(project=>({...project,cover_url:project.cover_storage_path||''}));
    return Promise.all(rows.map(async project=>{
      if(!project.cover_storage_path)return{...project,cover_url:''};
      try{
        const url=await api.signedUrl('project-photos',project.cover_storage_path,3600);
        return{...project,cover_url:url};
      }catch(_){
        return{...project,cover_url:''};
      }
    }));
  }

  async function load(projectId=''){
    try{
      const requested=projectId||'';
      const data=preview?previewData(requested):await api.snapshot(requested);
      const projects=await enrichProjects(data.projects||[]);
      const authorised=projects.some(project=>project.id===requested)?requested:'';
      const photos=authorised?await enrichPhotos(data.photos||[]):[];
      state={...state,...data,projects,photos,projectId:authorised,loaded:true};
      selectedPhotos.clear();
      renderAll();
      applyRoute();
      if(!preview&&state.pending_storage_cleanup?.length&&['owner','admin'].includes(state.viewer?.role)){
        api.cleanupPending(state.pending_storage_cleanup).then(result=>{
          if(result.completed.length)toast(`${result.completed.length} earlier private file cleanup ${result.completed.length===1?'was':'were'} completed.`);
        });
      }
    }catch(error){
      $('photoTimelineView').innerHTML=`<div class="pt-no-access"><strong>${esc(error.message)}</strong><br><br>Run the V48 Project Photo Timeline migration, then sign out and sign in again.</div>`;
      $('photoTimelineNav').hidden=true;
    }
  }
  function applyRoute(){
    const route=params();
    const allowed=allowedRoles.has(state.viewer?.role||previewRole);
    if(route.get('view')==='photo-timeline'&&state.loaded&&allowed){
      $('photoTimelineNav')?.click();
      if(state.projectId&&route.get('tab'))switchTab(route.get('tab'),false);
    }
  }
  async function openProject(projectId,tab='photos'){
    if(!state.projects.some(project=>project.id===projectId))return;
    setRoute(projectId,tab==='photos'?'':tab);
    await load(projectId);
    switchTab(tab,false);
    scrollTo({top:0,behavior:'smooth'});
  }
  async function closeProject(){
    setRoute('','');
    selectedPhotos.clear();
    await load('');
    scrollTo({top:0,behavior:'smooth'});
  }
  function switchTab(name,updateRoute=true){
    if(!state.projectId&&name!=='profile')return;
    document.querySelectorAll('[data-pt-tab]').forEach(button=>button.classList.toggle('active',button.dataset.ptTab===name));
    document.querySelectorAll('[data-pt-pane]').forEach(panel=>panel.classList.toggle('active',panel.dataset.ptPane===name));
    if(name==='booklet')renderBooklet();
    if(name==='profile')fillProfile();
    if(updateRoute)setRoute(state.projectId,name==='photos'?'':name);
  }

  function applyRoleUI(){
    const role=state.viewer?.role||previewRole;
    const allowed=allowedRoles.has(role);
    $('photoTimelineNav').hidden=!allowed;
    if(!allowed){
      document.querySelectorAll('.pt-upload-action,.pt-booklet-action,.pt-report-action,.pt-profile-action').forEach(item=>item.hidden=true);
      return;
    }
    document.querySelectorAll('.pt-upload-action').forEach(item=>item.hidden=!canUpload()||!state.projectId);
    document.querySelectorAll('.pt-booklet-action').forEach(item=>item.hidden=!canBuild()||!state.projectId);
    document.querySelectorAll('.pt-report-action').forEach(item=>item.hidden=!state.projectId||!['owner','admin','manager','estimator'].includes(role));
    document.querySelectorAll('.pt-profile-action').forEach(item=>item.hidden=!canProfile()||!state.projectId);
    $('ptPairForm').hidden=!canBuild();
    $('ptBookletForm').querySelectorAll('input,select,textarea,button').forEach(control=>control.disabled=!canBuild());
    $('ptProfileForm').querySelectorAll('input,select,textarea,button').forEach(control=>control.disabled=!canProfile());
    $('ptDeleteSelected').hidden=!canEditPhoto();
    $('ptSelectVisible').hidden=!canEditPhoto();
  }
  function applyWorkspaceUI(){
    const open=!!state.projectId;
    $('ptFolderDashboard').hidden=open;
    $('ptProjectWorkspace').hidden=!open;
    $('ptPageDescription').textContent=open
      ?`Review ${currentProject()?.name||'this project'} by date, stage and work area.`
      :'Open a project folder to review its complete visual record.';
    $('ptUploadTop').hidden=!open||!canUpload();
    $('ptQuickBooklet').hidden=!open||!canBuild();
  }
  function fillProjects(){
    const selected=state.projectId;
    $('ptProject').innerHTML='<option value="">Select a project</option>'+state.projects.map(project=>`<option value="${esc(project.id)}">${esc(project.name)}</option>`).join('');
    $('ptProject').value=selected;
  }
  function renderPortfolioStats(){
    const projects=state.projects;
    const photoCount=projects.reduce((total,project)=>total+asNumber(project.photo_count),0);
    const latest=[...projects].map(project=>project.latest_photo_date).filter(Boolean).sort().reverse()[0]||'';
    $('ptFolderCount').textContent=projects.length;
    $('ptAllPhotoCount').textContent=photoCount;
    $('ptActiveProjectCount').textContent=projects.filter(project=>!['completed','archived','closed'].includes(String(project.status||'').toLowerCase())).length;
    $('ptPortfolioLatest').textContent=latest?dateLabel(latest):'—';
    $('photoTimelineBadge').textContent=photoCount||'';
    $('photoTimelineBadge').classList.toggle('show',photoCount>0);
  }
  function folderPhase(project,phase,label){
    const count=asNumber(project[`${phase.toLowerCase()}_count`]);
    return`<span class="${count?'complete':''}"><i></i>${label}<b>${count}</b></span>`;
  }
  function folderCard(project){
    const total=asNumber(project.photo_count);
    const cover=project.cover_url
      ?`<img src="${esc(project.cover_url)}" alt="${esc(project.cover_title||project.name+' project cover')}">`
      :'<div class="pt-folder-placeholder" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M7 17h20l6 7h24v28H7z"/><path d="M7 25h50"/></svg></div>';
    return`<article class="pt-folder-card" data-project-folder="${esc(project.id)}" tabindex="0">
      <div class="pt-folder-cover">${cover}<span class="pt-folder-status">${esc(project.status||'Active')}</span><span class="pt-folder-open">Open folder →</span></div>
      <div class="pt-folder-copy">
        <div class="pt-folder-heading"><div><strong>${esc(project.name||'Project')}</strong><span>${esc(project.address||project.category||'Project photo record')}</span></div><div class="pt-folder-count"><b>${total}</b><span>photos</span></div></div>
        <div class="pt-folder-phases">${folderPhase(project,'before','Before')}${folderPhase(project,'during','During')}${folderPhase(project,'after','After')}</div>
        <div class="pt-folder-foot"><span>${esc(project.category||'Construction project')}</span><time>${project.latest_photo_date?`Updated ${esc(dateLabel(project.latest_photo_date))}`:'No photos uploaded'}</time></div>
      </div>
    </article>`;
  }
  function renderFolders(){
    renderPortfolioStats();
    const query=$('ptProjectSearch').value.toLowerCase().trim();
    const projects=state.projects.filter(project=>!query||`${project.name} ${project.address} ${project.category} ${project.status}`.toLowerCase().includes(query));
    $('ptFolderGrid').innerHTML=projects.length
      ?projects.map(folderCard).join('')
      :'<div class="pt-empty">No project folders match your search.</div>';
  }
  function renderCurrentProject(){
    const project=currentProject();
    if(!project)return;
    $('ptCurrentProjectName').textContent=project.name||'Project';
    $('ptCurrentProjectMeta').textContent=[project.address,project.category].filter(Boolean).join(' • ')||'Project photo record';
    $('ptCurrentProjectStatus').textContent=project.status||'Active';
    const complete=['before','during','after'].filter(phase=>asNumber(project[`${phase}_count`])>0).length;
    $('ptCurrentProjectProgress').style.width=`${Math.round(complete/3*100)}%`;
    const cover=project.cover_url||state.photos.find(photo=>photo.cover_photo)?.signed_url||state.photos[0]?.signed_url||'';
    $('ptCurrentProjectCover').src=cover;
    $('ptCurrentProjectCover').hidden=!cover;
    $('ptCurrentProjectCoverFallback').hidden=!!cover;
  }
  function updateProfileAlert(){
    const missing=api.profileMissing(state.company_profile);
    const bookletMissing=api.profileMissing(state.company_profile,true);
    const alert=$('ptProfileAlert');
    alert.classList.toggle('show',!!state.projectId&&(missing.length>0||(canBuild()&&bookletMissing.length>0)));
    if(missing.length){
      $('ptProfileAlertTitle').textContent='Company Profile incomplete';
      $('ptProfileAlertText').textContent=`Complete before sharing the Team Code: ${missing.join(', ')}.`;
    }else if(bookletMissing.length){
      $('ptProfileAlertTitle').textContent='Booklet information needed';
      $('ptProfileAlertText').textContent=`Add ${bookletMissing.join(' and ')} before generating a Marketing Booklet.`;
    }
    $('ptCompleteProfile').hidden=!canProfile();
  }
  function renderStats(){
    const photos=state.photos||[];
    const approved=photos.filter(photo=>photo.privacy_status==='Approved for Marketing');
    const counts=['Before','During','After'].map(phase=>photos.filter(photo=>photo.phase===phase).length);
    const latest=[...photos].sort((one,two)=>String(two.photo_date||two.created_at).localeCompare(String(one.photo_date||one.created_at)))[0];
    $('ptTotalPhotos').textContent=photos.length;
    $('ptMarketingPhotos').textContent=approved.length;
    $('ptStageSummary').textContent=photos.length?counts.join(' / '):'—';
    $('ptLatestDate').textContent=latest?dateLabel(latest.photo_date):'—';
    $('ptLatestUploader').textContent=latest?(latest.uploaded_by===state.viewer?.id?'Uploaded by you':'Uploaded by authorised staff'):'No photos yet';
  }
  function uniqueOptions(id,values,label){
    const control=$(id);
    const current=control.value;
    const unique=[...new Set(values.map(value=>String(value||'').trim()).filter(Boolean))].sort();
    control.innerHTML=`<option value="">${label}</option>`+unique.map(value=>`<option>${esc(value)}</option>`).join('');
    if(unique.includes(current))control.value=current;
  }
  function filteredPhotos(){
    const query=$('ptSearch').value.toLowerCase().trim();
    const phase=$('ptPhaseFilter').value;
    const stage=$('ptStageFilter').value;
    const trade=$('ptTradeFilter').value;
    const privacy=$('ptPrivacyFilter').value;
    return [...state.photos].filter(photo=>{
      const text=`${photo.title} ${photo.description} ${photo.area} ${photo.trade} ${photo.project_stage}`.toLowerCase();
      return(!query||text.includes(query))
        &&(!phase||photo.phase===phase)
        &&(!stage||photo.project_stage===stage)
        &&(!trade||photo.trade===trade)
        &&(!privacy||photo.privacy_status===privacy);
    }).sort((one,two)=>
      String(two.photo_date||'').localeCompare(String(one.photo_date||''))
      ||String(two.photo_time||'').localeCompare(String(one.photo_time||''))
      ||asNumber(one.display_order)-asNumber(two.display_order)
      ||String(two.created_at||'').localeCompare(String(one.created_at||''))
    );
  }
  function photoCard(photo){
    const privacyClass=photo.privacy_status==='Approved for Marketing'?'marketing':photo.privacy_status==='Client Visible'?'client':'';
    const selected=selectedPhotos.has(photo.id);
    const selection=canEditPhoto()?`<button class="pt-card-select ${selected?'selected':''}" data-photo-select type="button" aria-pressed="${selected}" aria-label="${selected?'Deselect':'Select'} photo">${selected?'✓':''}</button>`:'';
    const actions=canEditPhoto()?`<div class="pt-card-actions"><button data-photo-action="edit" type="button">Edit</button><button class="danger" data-photo-action="delete" type="button">Delete</button></div>`:'';
    const media=photo.signed_url
      ?`<img src="${esc(photo.signed_url)}" alt="${esc(photo.title||photo.phase+' project photo')}">`
      :'<div class="pt-image-unavailable">Image unavailable</div>';
    return`<article class="pt-card ${selected?'selected':''}" data-photo="${esc(photo.id)}">
      <div class="pt-photo">${selection}<button class="pt-photo-open" data-photo-action="preview" type="button">${media}</button><div class="pt-photo-badges"><span class="pt-chip">${esc(photo.phase)}</span><span class="pt-chip ${privacyClass}">${esc(photo.privacy_status)}</span>${photo.cover_photo?'<span class="pt-chip marketing">COVER</span>':''}${photo.featured?'<span class="pt-chip">FEATURED</span>':''}</div></div>
      <div class="pt-card-copy"><strong>${esc(photo.title||photo.area||photo.project_stage||'Project photo')}</strong><span>${esc([photo.project_stage,photo.area,photo.trade].filter(Boolean).join(' • ')||'Project record')}</span>${photo.description?`<p>${esc(photo.description)}</p>`:''}</div>
      ${actions}
    </article>`;
  }
  function renderBulkBar(visibleIds=[]){
    [...selectedPhotos].forEach(id=>{if(!state.photos.some(photo=>photo.id===id))selectedPhotos.delete(id)});
    const count=selectedPhotos.size;
    $('ptBulkBar').classList.toggle('show',canEditPhoto()&&(count>0||visibleIds.length>0));
    $('ptSelectedCount').textContent=count?`${count} selected`:`${visibleIds.length} visible`;
    $('ptDeleteSelected').disabled=!count;
    $('ptSelectVisible').textContent=visibleIds.length&&visibleIds.every(id=>selectedPhotos.has(id))?'Clear visible':'Select visible';
  }
  function renderPhotos(){
    uniqueOptions('ptStageFilter',state.photos.map(photo=>photo.project_stage),'All stages');
    uniqueOptions('ptTradeFilter',state.photos.map(photo=>photo.trade),'All trades');
    const photos=filteredPhotos();
    const gallery=$('ptGallery');
    gallery.classList.toggle('timeline',state.view==='timeline');
    renderBulkBar(photos.map(photo=>photo.id));
    if(!state.projectId){
      gallery.innerHTML='<div class="pt-empty">Open a project folder to view its dated Photo Timeline.</div>';
      return;
    }
    if(!photos.length){
      gallery.innerHTML='<div class="pt-empty">No photos match these filters. Upload the first project photo to begin the timeline.</div>';
      return;
    }
    const groups=new Map();
    photos.forEach(photo=>{
      const date=String(photo.photo_date||'').slice(0,10)||'undated';
      if(!groups.has(date))groups.set(date,[]);
      groups.get(date).push(photo);
    });
    gallery.innerHTML=[...groups.entries()].map(([date,rows])=>{
      const phases=[...new Set(rows.map(photo=>photo.phase).filter(Boolean))];
      return`<section class="pt-date-group">
        <header class="pt-date-head"><div><span class="pt-date-marker"></span><time>${esc(dateHeading(date==='undated'?'':date))}</time></div><span>${rows.length} photo${rows.length===1?'':'s'} • ${esc(phases.join(' / '))}</span></header>
        <div class="pt-date-grid">${rows.map(photoCard).join('')}</div>
      </section>`;
    }).join('');
  }

  function fillBooklet(){
    const value=state.booklet||{};
    const map={
      ptBookletTitle:'title',ptProjectType:'project_type',ptLocationMode:'location_mode',ptTemplate:'template',
      ptStartDate:'start_date',ptCompletionDate:'completion_date',ptInitialRequirements:'initial_requirements',
      ptInitialProblems:'initial_problems',ptScope:'scope_of_work',ptChallenges:'project_challenges',
      ptSolutions:'solutions_provided',ptFinalResult:'final_result',ptServicesCompleted:'main_services_completed',
      ptProblemsSolved:'problems_solved',ptHighlights:'project_highlights',ptCallToAction:'call_to_action'
    };
    Object.entries(map).forEach(([id,key])=>{if(value[key]!=null&&value[key]!=='')$(id).value=value[key]});
    $('ptBookletTitle').value=$('ptBookletTitle').value||'Project Transformation Report';
    $('ptLocationMode').value=value.location_mode||'Hide Location';
  }
  function bookletValue(){
    return{
      title:$('ptBookletTitle').value.trim(),
      project_type:$('ptProjectType').value.trim(),
      location_mode:$('ptLocationMode').value,
      template:$('ptTemplate').value,
      start_date:$('ptStartDate').value,
      completion_date:$('ptCompletionDate').value,
      initial_requirements:$('ptInitialRequirements').value.trim(),
      initial_problems:$('ptInitialProblems').value.trim(),
      scope_of_work:$('ptScope').value.trim(),
      project_challenges:$('ptChallenges').value.trim(),
      solutions_provided:$('ptSolutions').value.trim(),
      final_result:$('ptFinalResult').value.trim(),
      main_services_completed:$('ptServicesCompleted').value.trim(),
      problems_solved:$('ptProblemsSolved').value.trim(),
      project_highlights:$('ptHighlights').value.trim(),
      call_to_action:$('ptCallToAction').value.trim()
    };
  }
  function renderReadiness(){
    const approved=state.photos.filter(photo=>photo.privacy_status==='Approved for Marketing');
    const phases=['Before','During','After'];
    const missing=api.profileMissing(state.company_profile,true);
    const rows=[
      ['Company profile',missing.length?`${missing.length} item${missing.length===1?'':'s'} missing`:'Ready',!missing.length],
      ['Approved photos',String(approved.length),approved.length>0],
      ...phases.map(phase=>[`${phase} photos`,String(approved.filter(photo=>photo.phase===phase).length),approved.some(photo=>photo.phase===phase)]),
      ['Manual comparison pairs',String(state.pairs.length),state.pairs.length>0]
    ];
    $('ptReadiness').innerHTML=rows.map(([label,value,ready])=>`<div class="pt-ready-row ${ready?'ok':'warn'}"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('');
  }
  function photoOption(photo){
    return`<option value="${esc(photo.id)}">${esc(photo.title||photo.area||dateLabel(photo.photo_date))}</option>`;
  }
  function renderPairs(){
    const approved=state.photos.filter(photo=>photo.privacy_status==='Approved for Marketing');
    const before=approved.filter(photo=>photo.phase==='Before');
    const after=approved.filter(photo=>photo.phase==='After');
    const photoMap=new Map(state.photos.map(photo=>[photo.id,photo]));
    $('ptPairBefore').innerHTML='<option value="">Select Before photo</option>'+before.map(photoOption).join('');
    $('ptPairAfter').innerHTML='<option value="">Select After photo</option>'+after.map(photoOption).join('');
    $('ptPairList').innerHTML=state.pairs.length?state.pairs.map(pair=>{
      const one=photoMap.get(pair.before_photo_id);
      const two=photoMap.get(pair.after_photo_id);
      return`<article class="pt-pair" data-pair="${esc(pair.id)}"><img src="${esc(one?.signed_url||'')}" alt="Before"><img src="${esc(two?.signed_url||'')}" alt="After"><div><strong>${esc(pair.title||'Before & After')}</strong><span>${esc(pair.description||'Manually paired transformation')}</span></div>${canBuild()?'<button type="button" data-pair-delete>Remove</button>':''}</article>`;
    }).join(''):'<div class="pt-empty">No comparison pairs yet.</div>';
  }
  function renderBooklet(){
    fillBooklet();
    renderReadiness();
    renderPairs();
  }
  function renderReports(){
    $('ptReportList').innerHTML=state.reports.length?state.reports.map(report=>`<article class="pt-report" data-report="${esc(report.id)}"><div class="pt-report-icon">PDF</div><div><strong>${esc(report.title||report.report_type)}</strong><span>${esc(report.report_type)} • Version ${esc(report.version)} • ${esc(new Date(report.created_at).toLocaleString('en-AU'))}</span></div><div class="pt-report-actions"><button type="button" data-report-download>Download</button>${['owner','admin'].includes(state.viewer?.role)?'<button type="button" data-report-archive>Archive</button>':''}</div></article>`).join(''):'<div class="pt-empty">No saved reports for this project.</div>';
  }
  function fillProfile(){
    const profile=state.company_profile||{};
    const map={
      ptCompanyName:'company_name',ptCompanyAbn:'abn',ptCompanyPhone:'phone',ptCompanyEmail:'email',
      ptBusinessLocation:'business_location',ptServiceAreas:'service_areas',ptCompanyDescription:'company_description',
      ptCompanyServices:'services',ptBuilderRegistration:'builder_registration_number',ptCompanyWebsite:'website',
      ptCompanySlogan:'slogan',ptBrandColour:'brand_colour',ptFullAddress:'full_address'
    };
    Object.entries(map).forEach(([id,key])=>$(id).value=profile[key]||($(id).type==='color'?'#f5b400':''));
    $('ptCompanyLogo').required=!profile.logo_path;
  }
  function profileValue(){
    return{
      company_name:$('ptCompanyName').value.trim(),
      abn:$('ptCompanyAbn').value.trim(),
      phone:$('ptCompanyPhone').value.trim(),
      email:$('ptCompanyEmail').value.trim(),
      business_location:$('ptBusinessLocation').value.trim(),
      service_areas:$('ptServiceAreas').value.trim(),
      logo_path:state.company_profile.logo_path||'',
      company_description:$('ptCompanyDescription').value.trim(),
      services:$('ptCompanyServices').value.trim(),
      builder_registration_number:$('ptBuilderRegistration').value.trim(),
      website:$('ptCompanyWebsite').value.trim(),
      slogan:$('ptCompanySlogan').value.trim(),
      brand_colour:$('ptBrandColour').value||'#f5b400',
      full_address:$('ptFullAddress').value.trim(),
      show_full_address:false
    };
  }
  function renderAll(){
    applyRoleUI();
    applyWorkspaceUI();
    fillProjects();
    renderFolders();
    if(state.projectId){
      renderCurrentProject();
      updateProfileAlert();
      renderStats();
      renderPhotos();
      renderBooklet();
      renderReports();
    }
    fillProfile();
  }

  function openModal(){
    if(!state.projectId)return toast('Open a project folder first.','error');
    $('ptPhotoModal').classList.add('show');
    $('ptPhotoDate').value=$('ptPhotoDate').value||today();
  }
  function closeModal(){
    $('ptPhotoModal').classList.remove('show');
    $('ptPhotoForm').reset();
    $('ptPhotoId').value='';
    $('ptPhotoDate').value=today();
    $('ptUploadPreview').hidden=true;
    prepared=null;
  }
  function syncPrivacyOptions(){
    const select=$('ptPhotoPrivacy');
    const canApprove=!!state.viewer?.can_approve_marketing;
    [...select.options].forEach(option=>option.hidden=option.value==='Approved for Marketing'&&!canApprove);
    if(!canApprove&&select.value==='Approved for Marketing')select.value='Client Visible';
  }
  async function beginFiles(files){
    if(!canUpload())return toast('Your role cannot upload project photos.','error');
    if(!state.projectId)return toast('Open a project folder before uploading photos.','error');
    queue=[...files];
    if(!queue.length)return;
    $('ptProgress').dataset.total=String(queue.length);
    await prepareNext();
  }
  async function prepareNext(){
    if(!queue.length){
      $('ptProgress').classList.remove('show');
      closeModal();
      await load(state.projectId);
      return;
    }
    const total=Number($('ptProgress').dataset.total||queue.length);
    $('ptProgress').classList.add('show');
    $('ptProgressText').textContent=`Preparing ${queue[0].name} • ${total-queue.length+1} of ${total}`;
    $('ptProgressBar').style.width=`${Math.max(8,(total-queue.length)/total*100)}%`;
    try{
      prepared=await api.normaliseImage(queue.shift());
      $('ptPhotoModalTitle').textContent='Add Photo Details';
      $('ptUploadPreview').hidden=false;
      $('ptPreviewImage').src=prepared.preview;
      $('ptPreviewName').textContent=prepared.originalName;
      $('ptPreviewMeta').textContent=`${prepared.width} × ${prepared.height} • compressed to ${(prepared.blob.size/1024/1024).toFixed(1)} MB`;
      $('ptPhotoForm').reset();
      $('ptPhotoDate').value=today();
      $('ptPhotoOrder').value=state.photos.length+1;
      syncPrivacyOptions();
      $('ptPhotoPrivacy').disabled=false;
      openModal();
    }catch(error){
      toast(error.message,'error');
      if(queue.length)prepareNext();
      else{
        $('ptProgress').classList.remove('show');
        $('ptProgress').dataset.total='';
      }
    }
  }
  function openEdit(photo){
    prepared=null;
    $('ptPhotoModalTitle').textContent='Edit Photo Details';
    $('ptPhotoForm').reset();
    $('ptPhotoId').value=photo.id;
    $('ptPhotoPhase').value=photo.phase;
    $('ptPhotoStage').value=photo.project_stage||'';
    $('ptPhotoTitle').value=photo.title||'';
    $('ptPhotoDate').value=String(photo.photo_date||today()).slice(0,10);
    $('ptPhotoArea').value=photo.area||'';
    $('ptPhotoTrade').value=photo.trade||'';
    $('ptPhotoDescription').value=photo.description||'';
    $('ptPhotoInternal').value=photo.internal_notes||'';
    $('ptPhotoPrivacy').value=photo.privacy_status;
    $('ptPhotoOrder').value=photo.display_order||0;
    $('ptPhotoFeatured').checked=!!photo.featured;
    $('ptPhotoCover').checked=!!photo.cover_photo;
    $('ptUploadPreview').hidden=false;
    $('ptPreviewImage').src=photo.signed_url||'';
    $('ptPreviewName').textContent=photo.file_name||photo.title||'Project photo';
    $('ptPreviewMeta').textContent='Existing private project photo';
    $('ptPhotoPrivacy').disabled=false;
    syncPrivacyOptions();
    $('ptPhotoModal').classList.add('show');
  }
  function photoPatch(){
    return{
      phase:$('ptPhotoPhase').value,
      project_stage:$('ptPhotoStage').value.trim(),
      title:$('ptPhotoTitle').value.trim(),
      description:$('ptPhotoDescription').value.trim(),
      photo_date:$('ptPhotoDate').value,
      area:$('ptPhotoArea').value.trim(),
      trade:$('ptPhotoTrade').value.trim(),
      internal_notes:$('ptPhotoInternal').value.trim(),
      privacy_status:$('ptPhotoPrivacy').value,
      display_order:Number($('ptPhotoOrder').value||0),
      featured:$('ptPhotoFeatured').checked,
      cover_photo:$('ptPhotoCover').checked
    };
  }
  async function savePhoto(){
    const id=$('ptPhotoId').value;
    const patch=photoPatch();
    const button=$('ptPhotoSave');
    button.disabled=true;
    try{
      if(id){
        if(preview){
          Object.assign(state.photos.find(photo=>photo.id===id),patch);
          toast('Sample photo details updated.');
        }else await api.updatePhoto(id,patch);
        closeModal();
        await load(state.projectId);
        return;
      }
      if(!prepared)throw new Error('Choose a project photo first.');
      $('ptProgressText').textContent=`Uploading ${prepared.originalName} securely…`;
      if(preview){
        state.photos.push({
          id:crypto.randomUUID(),project_id:state.projectId,storage_path:prepared.preview,signed_url:prepared.preview,
          file_hash:prepared.hash,file_name:prepared.originalName,mime_type:'image/jpeg',file_size_bytes:prepared.blob.size,
          width:prepared.width,height:prepared.height,uploaded_by:state.viewer.id,created_at:new Date().toISOString(),...patch
        });
      }else{
        const path=await api.uploadPhoto(state.projectId,prepared.blob,prepared.originalName);
        await api.createPhoto(state.projectId,{
          storage_path:path,file_hash:prepared.hash,file_name:prepared.originalName,mime_type:'image/jpeg',
          file_size_bytes:prepared.blob.size,width:prepared.width,height:prepared.height,...patch
        });
      }
      prepared=null;
      $('ptPhotoModal').classList.remove('show');
      if(queue.length)await prepareNext();
      else{
        $('ptProgressBar').style.width='100%';
        $('ptProgressText').textContent='Upload complete';
        setTimeout(()=>{
          $('ptProgress').classList.remove('show');
          $('ptProgress').dataset.total='';
        },900);
        await load(state.projectId);
      }
    }catch(error){
      toast(error.message,'error');
    }finally{
      button.disabled=false;
    }
  }

  function openViewer(photo){
    viewerPhotoId=photo.id;
    $('ptViewerImage').src=photo.signed_url||'';
    $('ptViewerTitle').textContent=photo.title||photo.area||photo.project_stage||'Project photo';
    $('ptViewerMeta').textContent=[dateLabel(photo.photo_date),photo.phase,photo.project_stage,photo.area,photo.trade].filter(Boolean).join(' • ');
    $('ptViewerDescription').textContent=photo.description||'No description has been added.';
    $('ptViewerEdit').hidden=!canEditPhoto();
    $('ptViewerDelete').hidden=!canEditPhoto();
    $('ptPhotoViewer').classList.add('show');
  }
  function closeViewer(){
    viewerPhotoId='';
    $('ptPhotoViewer').classList.remove('show');
    $('ptViewerImage').src='';
  }
  async function deletePhotos(ids){
    const photos=ids.map(id=>state.photos.find(photo=>photo.id===id)).filter(Boolean);
    if(!photos.length)return;
    const warnings=[];
    const failures=[];
    $('ptProgress').classList.add('show');
    for(let index=0;index<photos.length;index++){
      const photo=photos[index];
      $('ptProgressText').textContent=`Deleting ${index+1} of ${photos.length} • ${photo.title||photo.file_name||'Project photo'}`;
      $('ptProgressBar').style.width=`${(index+1)/photos.length*100}%`;
      try{
        if(preview){
          state.photos=state.photos.filter(item=>item.id!==photo.id);
        }else{
          const result=await api.deletePhoto(photo.id);
          if(result?.storage_warning)warnings.push(photo.title||photo.file_name||photo.id);
        }
        selectedPhotos.delete(photo.id);
      }catch(error){
        failures.push(`${photo.title||photo.file_name||'Photo'}: ${error.message}`);
      }
    }
    $('ptProgress').classList.remove('show');
    if(preview){
      const project=state.projects.find(item=>item.id===state.projectId);
      if(project){
        project.photo_count=Math.max(0,asNumber(project.photo_count)-(photos.length-failures.length));
        project.before_count=state.photos.filter(photo=>photo.phase==='Before').length;
        project.during_count=state.photos.filter(photo=>photo.phase==='During').length;
        project.after_count=state.photos.filter(photo=>photo.phase==='After').length;
      }
      renderAll();
    }else await load(state.projectId);
    if(failures.length)toast(`${failures.length} photo${failures.length===1?'':'s'} could not be deleted: ${failures[0]}`,'error');
    else if(warnings.length)toast('Photos were removed from the timeline. Private file cleanup is queued and will retry automatically.');
    else toast(`${photos.length} photo${photos.length===1?'':'s'} deleted from the project and private storage.`);
  }
  async function confirmDeletePhoto(photo){
    if(!canEditPhoto())return;
    if(!confirm(`Delete “${photo.title||photo.file_name||'this photo'}” from ${currentProject()?.name||'this project'}?\n\nThe timeline record and private file will be removed.`))return;
    closeViewer();
    await deletePhotos([photo.id]);
  }

  async function saveProfile(event){
    event.preventDefault();
    if(!canProfile())return;
    const button=event.submitter;
    button.disabled=true;
    try{
      let value=profileValue();
      const file=$('ptCompanyLogo').files?.[0];
      if(file){
        const preparedLogo=await api.normaliseImage(file,1400);
        value.logo_path=preview?preparedLogo.preview:await api.uploadCompanyLogo(preparedLogo.blob);
      }
      const missing=api.profileMissing(value);
      if(missing.length)throw new Error(`Complete: ${missing.join(', ')}.`);
      state.company_profile=preview?value:await api.saveCompanyProfile(value);
      $('ptCompanyLogo').value='';
      renderAll();
      toast('Company Profile saved.');
    }catch(error){
      toast(error.message,'error');
    }finally{
      button.disabled=false;
    }
  }
  async function saveBooklet(event){
    event?.preventDefault();
    if(!canBuild())return;
    try{
      const value=bookletValue();
      state.booklet=preview?value:await api.saveBooklet(state.projectId,value);
      renderBooklet();
      toast('Booklet draft saved.');
    }catch(error){
      toast(error.message,'error');
    }
  }
  async function pdfData(){
    if(!state.projectId)throw new Error('Open a project folder first.');
    const missing=api.profileMissing(state.company_profile,true);
    if(missing.length)throw new Error(`Complete the booklet company information first: ${missing.join(', ')}.`);
    const value=bookletValue();
    if(value.location_mode==='Show Full Address'&&!confirm('Show the full project address in this marketing booklet? This can identify the property.'))throw new Error('Full address was not approved. Choose Hide Location or Show Suburb Only.');
    const approved=state.photos.filter(photo=>photo.privacy_status==='Approved for Marketing');
    if(!approved.length)throw new Error('Approve at least one photo for Marketing first.');
    const hydrated=[];
    for(let index=0;index<approved.length;index++){
      const photo=approved[index];
      $('ptProgress').classList.add('show');
      $('ptProgressText').textContent=`Preparing booklet photo ${index+1} of ${approved.length}…`;
      $('ptProgressBar').style.width=`${(index+1)/approved.length*100}%`;
      let dataUrl='';
      if(preview){
        const response=await fetch(photo.signed_url||photo.storage_path);
        dataUrl=response.ok?await blobDataUrl(await response.blob()):'';
      }else dataUrl=await api.photoDataUrl(photo.storage_path);
      hydrated.push({...photo,data_url:dataUrl});
    }
    const logoData=preview
      ?await(async()=>{
        const response=await fetch(state.company_profile.logo_path||'../assets/invoice-logo.png');
        return response.ok?blobDataUrl(await response.blob()):'';
      })()
      :await api.logoDataUrl(state.company_profile.logo_path);
    const fontFiles=await Promise.all(['../vendor/DejaVuSans.ttf','../vendor/DejaVuSans-Bold.ttf'].map(async path=>{
      const response=await fetch(path);
      return response.ok?blobDataUrl(await response.blob()):'';
    }));
    const result=pdf.buildMarketingBooklet(currentProject(),hydrated,state.pairs,state.company_profile,value,{
      logoData,fontNormalData:fontFiles[0],fontBoldData:fontFiles[1]
    });
    $('ptProgress').classList.remove('show');
    return{...result,booklet:value};
  }
  async function previewBooklet(){
    try{
      const result=await pdfData();
      if(previewUrl)URL.revokeObjectURL(previewUrl);
      previewUrl=URL.createObjectURL(result.blob);
      $('ptPdfFrame').src=previewUrl;
      $('ptPdfModal').classList.add('show');
    }catch(error){
      $('ptProgress').classList.remove('show');
      toast(error.message,'error');
    }
  }
  async function generateBooklet(){
    const button=$('ptGenerateBooklet');
    button.disabled=true;
    button.textContent='Generating…';
    try{
      const result=await pdfData();
      if(preview){
        api.downloadBlob(result.blob,result.filename);
        toast(`Sample ${result.pageCount}-page booklet downloaded.`);
        return;
      }
      const path=await api.uploadReport(state.projectId,result.blob,result.filename);
      await api.recordReport(state.projectId,{
        report_type:'Marketing Project Booklet',
        title:result.booklet.title||'Project Transformation Report',
        pdf_path:path,
        pdf_filename:result.filename,
        pdf_size_bytes:result.blob.size,
        template:result.booklet.template||'Professional'
      });
      api.downloadBlob(result.blob,result.filename);
      await load(state.projectId);
      toast('Marketing Project Booklet generated, saved and downloaded.');
    }catch(error){
      $('ptProgress').classList.remove('show');
      toast(error.message,'error');
    }finally{
      button.disabled=false;
      button.textContent='Generate PDF';
    }
  }

  async function ensureCompanyProfile(){
    try{
      const profile=preview?state.company_profile:await api.companyProfile();
      const missing=api.profileMissing(profile);
      state.company_profile=profile;
      if(!missing.length)return true;
      $('photoTimelineNav')?.click();
      if(!state.projectId&&state.projects[0])await openProject(state.projects[0].id,'profile');
      else switchTab('profile');
      updateProfileAlert();
      toast(`Complete Company Profile before sharing the Team Code: ${missing.join(', ')}.`,'error');
      return false;
    }catch(error){
      toast(error.message,'error');
      return false;
    }
  }
  window.ACPhotoTimeline={
    ensureCompanyProfile,
    open(projectId){
      if(!allowedRoles.has(state.viewer?.role||previewRole))return;
      $('photoTimelineNav')?.click();
      if(projectId)openProject(projectId);
      else closeProject();
    }
  };

  $('ptProjectSearch').addEventListener('input',renderFolders);
  $('ptFolderGrid').addEventListener('click',event=>{
    const folder=event.target.closest('[data-project-folder]');
    if(folder)openProject(folder.dataset.projectFolder);
  });
  $('ptFolderGrid').addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const folder=event.target.closest('[data-project-folder]');
    if(folder){event.preventDefault();openProject(folder.dataset.projectFolder)}
  });
  $('ptBackToFolders').addEventListener('click',closeProject);
  $('ptProject').addEventListener('change',()=>{
    const projectId=$('ptProject').value;
    if(projectId)openProject(projectId);
    else closeProject();
  });
  $('ptRefresh').addEventListener('click',()=>load(state.projectId));
  $('ptOpenProjects').addEventListener('click',()=>location.href='../projects/index.html');
  $('ptQuickBooklet').addEventListener('click',()=>switchTab('booklet'));
  $('ptCompleteProfile').addEventListener('click',()=>switchTab('profile'));
  $('ptUploadTop').addEventListener('click',()=>$('ptFiles').click());
  $('ptFiles').addEventListener('change',event=>{
    beginFiles(event.target.files);
    event.target.value='';
  });

  const drop=$('ptDrop');
  ['dragenter','dragover'].forEach(name=>drop.addEventListener(name,event=>{
    event.preventDefault();
    drop.classList.add('drag');
  }));
  ['dragleave','drop'].forEach(name=>drop.addEventListener(name,event=>{
    event.preventDefault();
    drop.classList.remove('drag');
  }));
  drop.addEventListener('drop',event=>beginFiles(event.dataTransfer.files));

  document.querySelectorAll('[data-pt-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.ptTab)));
  document.querySelectorAll('[data-pt-view]').forEach(button=>button.addEventListener('click',()=>{
    state.view=button.dataset.ptView;
    document.querySelectorAll('[data-pt-view]').forEach(item=>item.classList.toggle('active',item===button));
    renderPhotos();
  }));
  ['ptSearch','ptPhaseFilter','ptStageFilter','ptTradeFilter','ptPrivacyFilter'].forEach(id=>$(id).addEventListener('input',renderPhotos));

  $('ptSelectVisible').addEventListener('click',()=>{
    const ids=filteredPhotos().map(photo=>photo.id);
    const allSelected=ids.length&&ids.every(id=>selectedPhotos.has(id));
    ids.forEach(id=>allSelected?selectedPhotos.delete(id):selectedPhotos.add(id));
    renderPhotos();
  });
  $('ptDeleteSelected').addEventListener('click',async()=>{
    const count=selectedPhotos.size;
    if(!count||!confirm(`Delete ${count} selected photo${count===1?'':'s'} from ${currentProject()?.name||'this project'}?\n\nTimeline records and private files will be removed.`))return;
    await deletePhotos([...selectedPhotos]);
  });
  $('ptGallery').addEventListener('click',event=>{
    const card=event.target.closest('[data-photo]');
    if(!card)return;
    const photo=state.photos.find(item=>item.id===card.dataset.photo);
    if(!photo)return;
    if(event.target.closest('[data-photo-select]')){
      selectedPhotos.has(photo.id)?selectedPhotos.delete(photo.id):selectedPhotos.add(photo.id);
      renderPhotos();
      return;
    }
    const action=event.target.closest('[data-photo-action]')?.dataset.photoAction;
    if(action==='preview')openViewer(photo);
    if(action==='edit')openEdit(photo);
    if(action==='delete')confirmDeletePhoto(photo);
  });

  document.querySelectorAll('[data-pt-close]').forEach(button=>button.addEventListener('click',()=>{
    if(queue.length&&prepared&&!confirm('Cancel the remaining photo uploads?'))return;
    queue=[];
    $('ptProgress').classList.remove('show');
    $('ptProgress').dataset.total='';
    closeModal();
  }));
  $('ptPhotoModal').addEventListener('click',event=>{if(event.target===$('ptPhotoModal'))document.querySelector('[data-pt-close]').click()});
  $('ptPhotoForm').addEventListener('submit',event=>{event.preventDefault();savePhoto()});
  document.querySelectorAll('[data-pt-viewer-close]').forEach(button=>button.addEventListener('click',closeViewer));
  $('ptPhotoViewer').addEventListener('click',event=>{if(event.target===$('ptPhotoViewer'))closeViewer()});
  $('ptViewerEdit').addEventListener('click',()=>{
    const photo=state.photos.find(item=>item.id===viewerPhotoId);
    closeViewer();
    if(photo)openEdit(photo);
  });
  $('ptViewerDelete').addEventListener('click',()=>{
    const photo=state.photos.find(item=>item.id===viewerPhotoId);
    if(photo)confirmDeletePhoto(photo);
  });

  $('ptBookletForm').addEventListener('submit',saveBooklet);
  $('ptPreviewBooklet').addEventListener('click',previewBooklet);
  $('ptGenerateBooklet').addEventListener('click',generateBooklet);
  $('ptPairForm').addEventListener('submit',async event=>{
    event.preventDefault();
    try{
      const pair={
        before_photo_id:$('ptPairBefore').value,
        after_photo_id:$('ptPairAfter').value,
        title:$('ptPairTitle').value.trim(),
        description:$('ptPairDescription').value.trim(),
        display_order:state.pairs.length+1
      };
      if(preview)state.pairs.push({id:crypto.randomUUID(),project_id:state.projectId,...pair});
      else await api.savePair(state.projectId,pair);
      event.target.reset();
      await load(state.projectId);
    }catch(error){
      toast(error.message,'error');
    }
  });
  $('ptPairList').addEventListener('click',event=>{
    const button=event.target.closest('[data-pair-delete]');
    if(!button)return;
    const id=button.closest('[data-pair]').dataset.pair;
    if(!confirm('Remove this Before & After comparison pair?'))return;
    (preview
      ?Promise.resolve(state.pairs=state.pairs.filter(item=>item.id!==id))
      :api.deletePair(id)
    ).then(()=>load(state.projectId)).catch(error=>toast(error.message,'error'));
  });
  $('ptProfileForm').addEventListener('submit',saveProfile);
  $('ptReportList').addEventListener('click',async event=>{
    const card=event.target.closest('[data-report]');
    if(!card)return;
    const report=state.reports.find(item=>item.id===card.dataset.report);
    try{
      if(event.target.closest('[data-report-download]'))api.downloadBlob(await api.reportBlob(report.pdf_path),report.pdf_filename);
      if(event.target.closest('[data-report-archive]')&&confirm('Archive this saved report version?')){
        await api.archiveReport(report.id);
        await load(state.projectId);
      }
    }catch(error){
      toast(error.message,'error');
    }
  });
  document.querySelector('[data-pt-close-preview]').addEventListener('click',()=>{
    $('ptPdfModal').classList.remove('show');
    $('ptPdfFrame').src='about:blank';
    if(previewUrl){
      URL.revokeObjectURL(previewUrl);
      previewUrl='';
    }
  });
  addEventListener('beforeunload',()=>{
    activePhotoUrls.forEach(url=>URL.revokeObjectURL(url));
    if(previewUrl)URL.revokeObjectURL(previewUrl);
  });

  async function init(){
    if(preview){
      if(!allowedRoles.has(previewRole)){
        $('photoTimelineNav').hidden=true;
        return;
      }
      await load(params().get('project')||'');
      return;
    }
    await window.ACAuth?.ready;
    const role=window.ACAuth?.profile?.()?.role||'';
    if(!allowedRoles.has(role)){
      $('photoTimelineNav').hidden=true;
      return;
    }
    await load(params().get('project')||'');
  }
  init();
})();
