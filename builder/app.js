(function(){
  'use strict';
  const $=id=>document.getElementById(id),config=window.AC_PLATFORM_CONFIG||{},apiBase=String(config.supabaseUrl||'').replace(/\/$/,''),params=new URLSearchParams(location.search),preview=params.get('preview')==='1',previewRole=params.get('role')||'owner',MAX_FILE=10*1024*1024;
  let state={organisation:null,members:[],sessions:[],events:[],messages:[],invitations:[],selectedMember:'',selectedChat:'',messageRows:[]};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const initials=value=>String(value||'AT').split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'AT';
  const roleLabel=value=>({owner:'Owner',admin:'Admin',estimator:'Estimator',manager:'Project Manager',site_supervisor:'Site Supervisor',worker:'Worker',pending:'Pending approval',rejected:'Declined'})[value]||String(value||'Team member').replace(/_/g,' ');
  const dateTime=value=>value?new Date(value).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short'}):'—';
  const timeAgo=value=>{if(!value)return'No activity';const minutes=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/60000));if(minutes<2)return'Active now';if(minutes<60)return`${minutes} min ago`;const hours=Math.round(minutes/60);if(hours<24)return`${hours} hr ago`;return`${Math.round(hours/24)} d ago`};
  const memberName=id=>{const member=state.members.find(item=>item.id===id);return member?.full_name||member?.email||'Team member'};
  const currentUser=()=>preview?({
    owner:{id:'owner-preview',email:'mamobiniali@gmail.com'},
    admin:{id:'owner-preview',email:'admin@alertconstruction.com.au'},
    manager:{id:'sarah-preview',email:'sarah@alertconstruction.com.au'},
    estimator:{id:'mohammad-preview',email:'mohammad@alertconstruction.com.au'},
    site_supervisor:{id:'liam-preview',email:'liam@alertconstruction.com.au'},
    worker:{id:'worker-preview',email:'worker@alertconstruction.com.au'}
  }[previewRole]||{id:'owner-preview',email:'mamobiniali@gmail.com'}):window.ACAuth.user();
  const currentProfile=()=>preview?{id:currentUser().id,organisation_id:'org-preview',role:previewRole,active:true}:window.ACAuth.profile();
  const cleanDetail=value=>String(value||'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
  const encodePath=path=>String(path||'').split('/').map(encodeURIComponent).join('/');
  async function apiHeaders(content=true){return{apikey:config.publishableKey||'',...(content?{'Content-Type':'application/json'}:{}),...await ACAuth.headers()}}
  async function request(path,options={}){const response=await fetch(apiBase+path,{...options,headers:{...await apiHeaders(options.body!==undefined&&!options.raw),...(options.headers||{})}}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||data.error||`Operations Hub request failed (${response.status}).`);return data}
  async function rpc(name,body={}){return request(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(body)})}

  function previewData(){
    const now=Date.now(),iso=offset=>new Date(now-offset).toISOString();
    const members=[
      {id:'owner-preview',email:'mamobiniali@gmail.com',full_name:'Ali Mobini',role:'owner',active:true,created_at:iso(90*86400000),updated_at:iso(120000)},
      {id:'mohammad-preview',email:'mohammad@alertconstruction.com.au',full_name:'Mohammad Rahimi',role:'estimator',active:true,created_at:iso(20*86400000),updated_at:iso(240000)},
      {id:'sarah-preview',email:'sarah@alertconstruction.com.au',full_name:'Sarah Chen',role:'manager',active:true,created_at:iso(35*86400000),updated_at:iso(780000)},
      {id:'liam-preview',email:'liam@alertconstruction.com.au',full_name:'Liam Walsh',role:'site_supervisor',active:true,created_at:iso(42*86400000),updated_at:iso(3700000)},
      {id:'pending-preview',email:'reza.builder@example.com',full_name:'Reza Karimi',role:'pending',active:false,created_at:iso(1500000),updated_at:iso(1500000)}
    ];
    const sessions=[
      {session_id:'s1',user_id:'owner-preview',started_at:iso(11800000),last_seen_at:iso(120000),ended_at:null,device_label:'Mac',current_path:'/builder/'},
      {session_id:'s2',user_id:'mohammad-preview',started_at:iso(9800000),last_seen_at:iso(240000),ended_at:null,device_label:'iPhone',current_path:'/quote-analysis/'},
      {session_id:'s3',user_id:'sarah-preview',started_at:iso(8700000),last_seen_at:iso(780000),ended_at:null,device_label:'Windows',current_path:'/projects/'},
      {session_id:'s4',user_id:'liam-preview',started_at:iso(14200000),last_seen_at:iso(3700000),ended_at:iso(3600000),device_label:'iPad',current_path:'/checklist/'}
    ];
    const events=[
      {id:'e1',actor_id:'mohammad-preview',action:'quote_analysis_saved',module:'quote-analysis',details:{title:'Electrical quote — Rowville'},created_at:iso(220000)},
      {id:'e2',actor_id:'sarah-preview',action:'project_record_updated',module:'projects',details:{title:'Updated master schedule',project:'Rowville Renovation'},created_at:iso(660000)},
      {id:'e3',actor_id:'liam-preview',action:'checklist_item_checked',module:'site-checklist',details:{label:'Waterproofing inspection complete'},created_at:iso(3600000)},
      {id:'e4',actor_id:'mohammad-preview',action:'tool_opened',module:'plan-ai',details:{title:'Opened AI Plan Estimator'},created_at:iso(5900000)},
      {id:'e5',actor_id:'sarah-preview',action:'file_shared',module:'team-chat',details:{title:'Shared Updated_program.pdf'},created_at:iso(7300000)},
      {id:'e6',actor_id:'owner-preview',action:'member_role_changed',module:'accounts',details:{member_id:'mohammad-preview',from:'pending',to:'estimator'},created_at:iso(86400000)},
      {id:'e7',actor_id:'mohammad-preview',action:'session_signed_in',module:'accounts',details:{device:'iPhone'},created_at:iso(9800000)}
    ];
    const messages=[
      {id:'m1',sender_id:'owner-preview',recipient_id:null,body:'Morning team — please update your project notes before 4 pm.',created_at:iso(7200000)},
      {id:'m2',sender_id:'sarah-preview',recipient_id:null,body:'Rowville schedule is updated. I moved the waterproofing check to Thursday.',attachment_name:'Updated_program.pdf',attachment_path:'preview/file',created_at:iso(6900000)},
      {id:'m3',sender_id:'owner-preview',recipient_id:'mohammad-preview',body:'Mohammad, please follow up the electrical quote and flag any item over our catalogue rate.',created_at:iso(3200000)},
      {id:'m4',sender_id:'mohammad-preview',recipient_id:'owner-preview',body:'Done — I saved the analysis and marked two items for review.',attachment_name:'Electrical_quote_review.pdf',attachment_path:'preview/file2',created_at:iso(1800000)}
    ];
    const invitations=[
      {id:'invite-preview',intended_email:'new.member@example.com',requested_role:'worker',status:'issued',expires_at:iso(-2*86400000),accepted_by:null,created_at:iso(3600000)},
      {id:'accepted-preview',intended_email:'reza.builder@example.com',requested_role:'site_supervisor',status:'accepted_pending',expires_at:iso(-5*86400000),accepted_by:'pending-preview',created_at:iso(1500000)}
    ];
    return{organisation:{id:'org-preview',name:'Alert Construction'},members,sessions,events,messages,invitations};
  }
  async function loadProduction(){
    await ACAuth.ready;const profile=ACAuth.profile();if(!ACAuth.hasAccess()||!ACAuth.canUseTool('builder'))throw new Error('Operations Hub is not available for this account.');
    const org=encodeURIComponent(profile.organisation_id),headers=await apiHeaders();
    if(profile?.role!=='owner'){const [members,messages]=await Promise.all([
      fetch(`${apiBase}/rest/v1/profiles?organisation_id=eq.${org}&active=eq.true&select=id,email,full_name,role,active,created_at,updated_at&order=full_name`,{headers}).then(r=>r.ok?r.json():[profile]),
      fetch(`${apiBase}/rest/v1/ac_team_messages?organisation_id=eq.${org}&deleted_at=is.null&select=id,sender_id,recipient_id,body,attachment_name,attachment_path,attachment_type,attachment_size,read_at,created_at&order=created_at.asc&limit=500`,{headers}).then(r=>r.ok?r.json():[])
    ]);return{organisation:ACAuth.workspace()||null,members,sessions:[],events:[],messages,invitations:[]}}
    const [organisations,members,sessions,events,messages,usage,invitations]=await Promise.all([
      fetch(`${apiBase}/rest/v1/organisations?id=eq.${org}&select=id,name,created_at,updated_at`,{headers}).then(r=>r.ok?r.json():[]),
      fetch(`${apiBase}/rest/v1/profiles?organisation_id=eq.${org}&select=id,email,full_name,role,active,created_at,updated_at&order=created_at`,{headers}).then(r=>r.ok?r.json():[]),
      fetch(`${apiBase}/rest/v1/ac_staff_sessions?organisation_id=eq.${org}&select=session_id,user_id,started_at,last_seen_at,ended_at,end_reason,device_label,current_path&order=last_seen_at.desc&limit=250`,{headers}).then(r=>r.ok?r.json():[]),
      fetch(`${apiBase}/rest/v1/ac_audit_log?organisation_id=eq.${org}&select=id,actor_id,action,module,details,project_id,record_id,created_at&order=created_at.desc&limit=500`,{headers}).then(r=>r.ok?r.json():[]),
      fetch(`${apiBase}/rest/v1/ac_team_messages?organisation_id=eq.${org}&deleted_at=is.null&select=id,sender_id,recipient_id,body,attachment_name,attachment_path,attachment_type,attachment_size,read_at,created_at&order=created_at.asc&limit=500`,{headers}).then(r=>r.ok?r.json():[]),
      fetch(`${apiBase}/rest/v1/ac_usage_events?organisation_id=eq.${org}&event_name=eq.tool_opened&select=id,user_id,tool,path,occurred_at&order=occurred_at.desc&limit=250`,{headers}).then(r=>r.ok?r.json():[]),
      rpc('get_ac_team_invitations').catch(()=>[])
    ]);
    return{organisation:organisations[0]||null,members,sessions,events:[...events,...usage.map(item=>({id:`usage-${item.id}`,actor_id:item.user_id,action:'tool_opened',module:item.tool,details:{title:`Opened ${cleanDetail(item.tool)}`},created_at:item.occurred_at}))],messages,invitations:Array.isArray(invitations)?invitations:[]};
  }
  async function load(){
    try{state={...state,...(preview?previewData():await loadProduction())};renderAll()}catch(error){document.querySelector('.main').innerHTML=`<section class="panel"><div class="panel-body empty"><strong>${esc(error.message)}</strong><br><br><a class="btn primary" href="../login/index.html">Open secure account</a></div></section>`}
  }
  function latestSession(userId){return state.sessions.filter(item=>item.user_id===userId).sort((a,b)=>String(b.last_seen_at).localeCompare(String(a.last_seen_at)))[0]||null}
  function online(session){return!!session&&!session.ended_at&&Date.now()-new Date(session.last_seen_at).getTime()<10*60000}
  function todayMinutes(userId){const start=new Date();start.setHours(0,0,0,0);return Math.round(state.sessions.filter(item=>item.user_id===userId&&new Date(item.last_seen_at)>=start).reduce((sum,item)=>sum+Math.max(0,new Date(item.ended_at||item.last_seen_at)-new Date(item.started_at)),0)/60000)}
  function pending(){return state.members.filter(item=>item.role==='pending'&&item.active===false)}
  function activeMembers(){return state.members.filter(item=>item.active!==false&&!['pending','rejected'].includes(item.role))}
  function latestEvents(){return[...state.events].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))}
  function eventInfo(event){
    const map={session_signed_in:['↗','Signed in','good'],session_signed_out:['↙','Signed out',''],project_record_created:['＋','Created a project record','good'],project_record_updated:['↻','Updated a project record','warn'],project_record_deleted:['−','Deleted a project record',''],project_deleted:['−','Deleted a project',''],workspace_synced:['↻','Synced project workspace','good'],checklist_item_checked:['✓','Checked a site item','good'],checklist_item_unchecked:['○','Unchecked a site item','warn'],member_join_requested:['＋','Requested team access','warn'],member_join_approved:['✓','Approved a team member','good'],member_join_rejected:['×','Declined a team request',''],member_role_changed:['⇄','Changed a team role','warn'],member_access_revoked:['×','Revoked team access',''],member_access_restored:['✓','Restored team access','good'],team_invitation_issued:['＋','Issued a secure invitation','good'],team_invitation_accepted:['⌁','Invitation accepted','warn'],team_invitation_revoked:['×','Revoked an invitation',''],message_sent:['✦','Sent a team message','good'],file_shared:['▣','Shared a file','good'],tool_opened:['↗','Opened a tool',''],quote_analysis_saved:['✓','Saved a quote analysis','good']};
    const [icon,title,tone]=map[event.action]||['•',cleanDetail(event.action)||'Activity',''];const detail=event.details?.title||event.details?.label||event.details?.project||cleanDetail(event.module)||'Workspace activity';return{icon,title,tone,detail};
  }
  function renderStats(){const today=new Date();today.setHours(0,0,0,0);$('activeCount').textContent=activeMembers().length;$('onlineCount').textContent=`${activeMembers().filter(member=>online(latestSession(member.id))).length} online now`;$('pendingCount').textContent=pending().length;$('actionCount').textContent=state.events.filter(event=>new Date(event.created_at)>=today).length;$('conversationCount').textContent=1+Math.max(0,activeMembers().length-1);['overviewBadge','teamBadge'].forEach(id=>{const badge=$(id);badge.textContent=pending().length;badge.classList.toggle('show',pending().length>0)});const unread=state.messages.filter(message=>message.recipient_id===currentUser()?.id&&!message.read_at).length;$('messageBadge').textContent=unread;$('messageBadge').classList.toggle('show',unread>0)}
  function requestCard(member){const invitation=state.invitations.find(item=>item.accepted_by===member.id&&item.status==='accepted_pending'),requested=invitation?.requested_role||'worker';return`<article class="join-card" data-member="${esc(member.id)}" data-invitation="${esc(invitation?.id||'')}"><div class="join-top"><div class="avatar yellow">${esc(initials(member.full_name||member.email))}</div><div class="join-copy"><strong>${esc(member.full_name||'New team request')}</strong><span>${esc(member.email)}</span></div><span class="pending-pill">VERIFY IDENTITY</span></div><div class="join-meta"><div><small>Joined with</small><strong>Individual invitation</strong></div><div><small>Requested role</small><strong>${esc(roleLabel(requested))}</strong></div><div><small>Current access</small><strong>Locked</strong></div></div><div class="join-actions"><select aria-label="Final role"><option value="worker" ${requested==='worker'?'selected':''}>Worker</option><option value="estimator" ${requested==='estimator'?'selected':''}>Estimator</option><option value="manager" ${requested==='manager'?'selected':''}>Project Manager</option><option value="site_supervisor" ${requested==='site_supervisor'?'selected':''}>Site Supervisor</option><option value="admin" ${requested==='admin'?'selected':''}>Admin</option></select><button class="btn primary" data-action="approve" type="button">Approve</button><button class="btn danger" data-action="decline" type="button">Reject</button></div></article>`}
  function renderOverview(){
    const role=currentProfile()?.role||'worker',requests=pending(),members=activeMembers(),events=latestEvents(),today=new Date(),todayStart=new Date();todayStart.setHours(0,0,0,0);
    const set=(id,value)=>{const node=$(id);if(node)node.textContent=value};
    const scope={
      owner:['Owner access','Full company control'],
      admin:['Admin access','Authorised workspace'],
      manager:['Project Manager','Assigned projects'],
      estimator:['Estimator access','Estimates & assigned projects'],
      site_supervisor:['Site Supervisor','Assigned site operations'],
      worker:['Worker access','My workday']
    }[role]||['Secure access','Role-protected'];
    set('ohAccessRole',scope[0]);set('ohAccessScope',scope[1]);set('ohDashboardRole',`${role==='owner'?'Executive ':''}${roleLabel(role)} Dashboard`);
    set('ohDateTime',today.toLocaleString('en-AU',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}));

    $('requestList').innerHTML=requests.length?requests.slice(0,2).map(requestCard).join(''):'<div class="empty">No access approvals are waiting.</div>';
    $('presenceList').innerHTML=members.slice(0,4).map(member=>{const session=latestSession(member.id),isOnline=online(session);return`<div class="person"><div class="avatar">${esc(initials(member.full_name||member.email))}</div><div class="person-copy"><strong>${esc(member.full_name||member.email)}</strong><span>${esc(roleLabel(member.role))} • ${esc(member.email)}</span></div><div class="presence ${isOnline?'online':''}"><i></i>${isOnline?'Online':timeAgo(session?.last_seen_at)}</div></div>`}).join('')||'<div class="empty">No active team members.</div>';
    $('latestActivity').innerHTML=events.slice(0,5).map(eventHtml).join('')||'<div class="empty">No company activity has been recorded yet.</div>';

    const onlineCount=members.filter(member=>online(latestSession(member.id))).length,todayActions=events.filter(event=>new Date(event.created_at)>=todayStart).length,score=Math.min(99,Math.max(68,78+onlineCount*3+Math.min(9,todayActions)));
    set('ohPerformanceActive',members.length);set('ohTeamScore',`${score}%`);set('ohCriticalCount',String(requests.length));set('ohMessageCount',state.messages.length);set('ohDocumentCount',events.filter(event=>event.action==='file_shared').length||'—');set('ohRegisterCount',events.length||'—');
    const ring=$('ohTeamRing');if(ring)ring.style.background=`conic-gradient(var(--oh-green) 0 ${score}%,#2b3030 ${score}%)`;

    const quoteEvents=events.filter(event=>/quote/.test(`${event.action} ${event.module}`)),companyCommercial=['owner','admin'].includes(role);
    set('ohQuoteCount',quoteEvents.length||'—');set('ohQuoteValue',preview&&companyCommercial?'$4.62M':'—');set('ohConversionRate',preview&&companyCommercial?'36%':'—');

    const priorityRows=[
      ...requests.map(item=>({icon:'♙',title:`Approve ${item.full_name||item.email}`,detail:'Team access request',due:'Review now'})),
      ...events.filter(event=>['warn',''].includes(eventInfo(event).tone)&&!/session/.test(event.action)).slice(0,4).map(event=>{const info=eventInfo(event);return{icon:info.icon,title:info.title,detail:info.detail,due:timeAgo(event.created_at)}})
    ].slice(0,5);
    set('ohPriorityCount',priorityRows.length);
    $('ohPriorityList').innerHTML=priorityRows.length?priorityRows.map(item=>`<div class="oh-priority-row"><i>${esc(item.icon)}</i><div><strong>${esc(item.title)}</strong><span>${esc(item.detail)}</span></div><b>${esc(item.due)}</b></div>`).join(''):'<div class="empty">No urgent actions. Your workspace is clear.</div>';

    const schedule=preview?[
      ['7:30 AM','Site visit','Rowville Renovation'],
      ['9:00 AM','Design review meeting','Glen Waverley Extension'],
      ['11:30 AM','Progress meeting','Mitcham Townhouses'],
      ['3:30 PM','Client walkthrough','Rowville Renovation']
    ]:[];
    $('ohScheduleList').innerHTML=schedule.length?schedule.map(item=>`<div class="oh-schedule-item"><time>${esc(item[0])}</time><div><strong>${esc(item[1])}</strong><span>${esc(item[2])}</span></div></div>`).join(''):'<div class="empty">Assigned schedule items will appear here.</div>';
    window.ACOperationToolsOverview?.render?.();
  }

  let activeProjectImageUrl='',activeProjectImageId='';
  async function loadActiveProjectImage(project){
    const image=$('ohActiveProjectImage'),fallback='../assets/luxury-property.webp';if(!image)return;
    image.alt=project?.name?`${project.name} project`:'Current construction project';
    if(!project?.id||preview||!window.ACPhotoAPI){if(activeProjectImageUrl){URL.revokeObjectURL(activeProjectImageUrl);activeProjectImageUrl=''}activeProjectImageId='';image.src=fallback;return}
    if(activeProjectImageId===project.id&&activeProjectImageUrl)return;const requested=project.id;activeProjectImageId=requested;
    try{
      const snapshot=await window.ACPhotoAPI.snapshot(requested),photos=Array.isArray(snapshot?.photos)?snapshot.photos:[],photo=photos.find(item=>item.cover_photo)||photos.find(item=>item.featured)||photos.find(item=>item.phase==='After')||photos[0];
      if(!photo?.storage_path)throw new Error('No project cover photo');
      const url=await window.ACPhotoAPI.privateObjectUrl('project-photos',photo.storage_path);if(activeProjectImageId!==requested){URL.revokeObjectURL(url);return}
      if(activeProjectImageUrl)URL.revokeObjectURL(activeProjectImageUrl);activeProjectImageUrl=url;image.src=url;
    }catch(_){if(activeProjectImageId===requested){if(activeProjectImageUrl){URL.revokeObjectURL(activeProjectImageUrl);activeProjectImageUrl=''}image.src=fallback}}
  }
  function applyFinanceOverview(snapshot){
    if(!snapshot)return;
    const set=(id,value)=>{const node=$(id);if(node)node.textContent=value};
    const money=value=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',currencyDisplay:'narrowSymbol',maximumFractionDigits:0}).format(Number(value)||0).replace(/^A\$/,'A$');
    const company=Boolean(snapshot.permissions?.can_view_dashboard);
    document.querySelectorAll('[data-overview-company-finance]').forEach(node=>node.hidden=!company);
    const projects=Array.isArray(snapshot.projects)?snapshot.projects:[],primary=projects[0]||null;
    set('ohActiveProjectCount',projects.length||'—');
    if(primary){
      const progress=Number.isFinite(primary.progress)?Math.max(0,Math.min(100,primary.progress)):0;
      set('ohActiveProjectName',primary.name||'Current active project');set('ohActiveProjectAddress',primary.address||'Project workspace');
      set('ohActiveProjectStatus',primary.status||'In progress');set('ohActiveProjectRef',primary.reference||'Operation Hub');
      set('ohActiveProjectProgress',progress?`${Math.round(progress)}%`:'—');
      const bar=$('ohActiveProjectBar');if(bar)bar.style.width=`${progress}%`;
      set('ohProjectStart',primary.start||'—');set('ohProjectFinish',primary.finish||'—');
    }
    loadActiveProjectImage(primary);
    $('ohProjectProgressRows').innerHTML=projects.length?projects.slice(0,5).map(item=>{
      const progress=Math.max(0,Math.min(130,Number(item.progress)||0)),tone=progress>100?'delayed':progress>85?'risk':'',status=progress>100?'Over budget':progress>85?'At risk':'On track';
      return`<div class="oh-project-row ${tone}"><strong>${esc(item.name||'Project')}</strong><span>${Math.round(progress)}%</span><i><b style="width:${Math.min(100,progress)}%"></b></i><em>${status}</em></div>`;
    }).join(''):'<div class="oh-empty-line">Projects will appear here when available.</div>';

    const finance=snapshot.summary||{},budget=Number(snapshot.budget)||0,actual=Number(snapshot.actual)||0,committed=Number(snapshot.committed)||0,forecast=Number(snapshot.forecast)||0,profit=Number(finance.forecastProfit)||0,revenue=Number(finance.revenue)||0,cash=Number(finance.netCash)||0,spent=budget?Math.max(0,Math.min(100,actual/budget*100)):0,margin=Number(finance.forecastRevenue)?profit/Number(finance.forecastRevenue)*100:0;
    if(company){
      set('ohFinanceRevenue',money(revenue));set('ohFinanceBudget',money(budget));set('ohFinanceProfit',money(profit));set('ohFinanceCash',money(cash));set('ohWeeklyRevenue',money(snapshot.weeklyRevenue));
      set('ohFinanceBudgetMeta',budget?`${Math.round(spent)}% actual spend`:'Approved project budgets');set('ohFinanceProfitMeta',`${margin.toFixed(1)}% forecast margin`);set('ohFinanceCashMeta',cash>=0?'Healthy cash position':'Cash out exceeds cash in');
      set('ohFinanceBudget2',money(budget));set('ohFinanceCommitted',money(committed));set('ohFinanceActual',money(actual));set('ohFinanceForecast',money(forecast));set('ohFinanceSpent',budget?`${Math.round(spent)}%`:'—');
      const budgetBar=$('ohFinanceBudgetBar');if(budgetBar)budgetBar.style.width=`${spent}%`;
      const donut=$('ohFinanceDonut');if(donut)donut.style.background=`conic-gradient(var(--yellow) 0 ${spent}%,#2a3030 ${spent}%)`;
      const categories=Array.isArray(snapshot.categories)?snapshot.categories.slice(0,4):[];
      $('ohFinanceLegend').innerHTML=categories.length?categories.map((item,index)=>`<li><i style="background:${['#f5b400','#c8d66c','#e49435','#89918e'][index]}"></i><span>${esc(item.name)}</span><b>${esc(money(item.value))}</b></li>`).join(''):'<li><i></i><span>Finance data</span><b>Open report</b></li>';
    }
    const approvalTotal=pending().length+Number(snapshot.approvalCount||0),critical=approvalTotal+Number(snapshot.overdueCount||0);
    set('pendingCount',approvalTotal);set('ohCriticalCount',critical);
  }
  window.ACOperationsOverview={setFinance:applyFinanceOverview,setProjectImage:loadActiveProjectImage};
  function eventHtml(event){const info=eventInfo(event);return`<article class="event"><div class="event-icon ${info.tone}">${esc(info.icon)}</div><div class="event-copy"><strong>${esc(info.title)}</strong><span>${esc(memberName(event.actor_id))} • ${esc(info.detail)}</span></div><time>${esc(timeAgo(event.created_at))}</time></article>`}
  function renderTeam(){
    const query=$('teamSearch').value.toLowerCase().trim(),roleFilter=$('teamRoleFilter').value,status=$('teamStatusFilter').value;
    const rows=state.members.filter(member=>{const text=`${member.full_name} ${member.email}`.toLowerCase(),status=member.role==='pending'?'pending':member.active===false?'inactive':'active';return(!query||text.includes(query))&&(!roleFilter||member.role===roleFilter)&&(!$('teamStatusFilter').value||status===$('teamStatusFilter').value)});
    $('staffRows').innerHTML=rows.map(member=>{const session=latestSession(member.id),isOnline=online(session),isOwner=member.role==='owner',isPending=member.role==='pending';return`<tr data-member="${esc(member.id)}"><td><div class="staff-name"><div class="avatar ${isOwner?'yellow':''}">${esc(initials(member.full_name||member.email))}</div><div><strong>${esc(member.full_name||'Team member')}</strong><span>${esc(member.email)}</span></div></div></td><td>${isPending?'<span class="status-pill off">Awaiting role</span>':isOwner?'<strong>Owner</strong>':`<select class="role-select" data-action="role"><option value="worker" ${member.role==='worker'?'selected':''}>Worker</option><option value="estimator" ${member.role==='estimator'?'selected':''}>Estimator</option><option value="manager" ${member.role==='manager'?'selected':''}>Project Manager</option><option value="site_supervisor" ${member.role==='site_supervisor'?'selected':''}>Site Supervisor</option><option value="admin" ${member.role==='admin'?'selected':''}>Admin</option></select>`}</td><td><span class="status-pill ${member.active===false?'off':''}">${isPending?'Pending':member.active===false?'Revoked':'Active'}</span></td><td>${esc(dateTime(session?.started_at))}</td><td><span class="presence ${isOnline?'online':''}"><i></i>${esc(isOnline?'Online now':timeAgo(session?.last_seen_at))}</span></td><td>${todayMinutes(member.id)} min</td><td><div class="row-actions">${isPending?'<button data-action="review">Review</button>':isOwner?'—':`<button data-action="message">Message</button><button data-action="access">${member.active===false?'Restore':'Revoke'}</button>`}</div></td></tr>`}).join('')||'<tr><td colspan="7" class="empty">No team members match this filter.</td></tr>';
  }
  function activityType(event){if(/^session_|signed_/.test(event.action))return'session';if(/checklist/.test(event.action))return'checklist';if(/member_|team_invitation/.test(event.action))return'team';if(/message|file_shared/.test(event.action))return'chat';return'project'}
  function filteredEvents(){const q=$('activitySearch').value.toLowerCase().trim(),type=$('activityType').value,days=Number($('activityRange').value||30),cutoff=Date.now()-days*86400000;return latestEvents().filter(event=>{const info=eventInfo(event),text=`${info.title} ${info.detail} ${memberName(event.actor_id)} ${event.module}`.toLowerCase();return new Date(event.created_at).getTime()>=cutoff&&(!state.selectedMember||event.actor_id===state.selectedMember)&&(!type||activityType(event)===type)&&(!q||text.includes(q))})}
  function renderActivity(){const counts=new Map(state.members.map(member=>[member.id,state.events.filter(event=>event.actor_id===member.id).length]));$('auditPeople').innerHTML=`<button class="audit-person ${!state.selectedMember?'active':''}" data-person=""><div class="avatar yellow">AT</div><div><span>All staff activity</span><small>Complete company timeline</small></div><b class="audit-count">${state.events.length}</b></button>`+state.members.filter(member=>member.active!==false||member.role==='owner').map(member=>`<button class="audit-person ${state.selectedMember===member.id?'active':''}" data-person="${esc(member.id)}"><div class="avatar">${esc(initials(member.full_name||member.email))}</div><div><span>${esc(member.full_name||member.email)}</span><small>${esc(roleLabel(member.role))}</small></div><b class="audit-count">${counts.get(member.id)||0}</b></button>`).join('');const events=filteredEvents();$('auditTitle').textContent=state.selectedMember?`${memberName(state.selectedMember)} activity`:'All staff activity';$('auditTotal').textContent=`${events.length} event${events.length===1?'':'s'}`;let day='';$('auditStream').innerHTML=events.map(event=>{const next=new Date(event.created_at).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'}),head=next!==day?(day=next,`<div class="audit-day">${esc(next)}</div>`):'';return head+eventHtml(event)}).join('')||'<div class="empty">No activity matches these filters.</div>'}
  function relevantMessages(){const me=currentUser()?.id;if(!state.selectedChat)return state.messages.filter(message=>message.recipient_id===null);return state.messages.filter(message=>(message.sender_id===me&&message.recipient_id===state.selectedChat)||(message.sender_id===state.selectedChat&&message.recipient_id===me))}
  function renderChat(){const me=currentUser()?.id,people=activeMembers().filter(member=>member.id!==me);$('conversationList').innerHTML=`<button class="conversation ${!state.selectedChat?'active':''}" data-chat=""><div class="avatar yellow">AT</div><div><strong>Entire team</strong><span>Company channel</span></div><time>${state.messages.filter(m=>m.recipient_id===null).length}</time></button>`+people.map(member=>`<button class="conversation ${state.selectedChat===member.id?'active':''}" data-chat="${esc(member.id)}"><div class="avatar">${esc(initials(member.full_name||member.email))}</div><div><strong>${esc(member.full_name||member.email)}</strong><span>${esc(roleLabel(member.role))}</span></div><time>${esc(timeAgo(latestSession(member.id)?.last_seen_at))}</time></button>`).join('');const selected=state.members.find(member=>member.id===state.selectedChat);$('chatAvatar').textContent=selected?initials(selected.full_name||selected.email):'AT';$('chatName').textContent=selected?(selected.full_name||selected.email):'Entire team';$('chatMeta').textContent=selected?`${roleLabel(selected.role)} • ${selected.email}`:'Company channel';$('messageText').placeholder=selected?`Message ${selected.full_name||selected.email}…`:'Message the entire team…';const rows=relevantMessages();$('messages').innerHTML=rows.length?rows.map(message=>`<article class="message ${message.sender_id===me?'mine':''}"><strong>${esc(memberName(message.sender_id))}</strong>${message.body?`<span>${esc(message.body)}</span>`:''}${message.attachment_path?`<button class="attachment" data-file="${esc(message.attachment_path)}" data-name="${esc(message.attachment_name||'attachment')}" data-type="${esc(message.attachment_type||'application/octet-stream')}" type="button">📎 ${esc(message.attachment_name||'Attachment')}</button>`:''}<time>${esc(dateTime(message.created_at))}</time></article>`).join(''):'<div class="empty">No messages yet. Start the conversation.</div>';$('messages').scrollTop=$('messages').scrollHeight}
  function renderInvitations(){
    const owner=currentProfile()?.role==='owner',consoleNode=$('ownerInvitationConsole'),list=$('invitationList');if(!consoleNode||!list)return;consoleNode.hidden=!owner;if(!owner)return;
    list.innerHTML=(state.invitations||[]).map(item=>{const open=['issued','accepted_pending'].includes(item.status),status=String(item.status||'issued').replace(/_/g,' '),expiry=item.expires_at?new Date(item.expires_at).toLocaleString('en-AU'):'—';return`<div class="invite-row" data-invitation="${esc(item.id)}"><div><strong>${esc(item.intended_email||'Email verified when accepted')}</strong><span>Created ${esc(timeAgo(item.created_at))}</span></div><div><strong>${esc(roleLabel(item.requested_role))}</strong><span>Expires ${esc(expiry)}</span></div><span class="invite-status">${esc(status)}</span>${open?'<button type="button" data-invitation-action="revoke">Revoke</button>':'<span>Closed</span>'}</div>`}).join('')||'<div class="empty">No individual invitations have been issued.</div>';
  }
  function renderAll(){$('ownerEmail').textContent=currentUser()?.email||'Owner account';renderStats();renderOverview();renderTeam();renderInvitations();renderActivity();renderChat()}
  function allowedView(view){
    const role=currentProfile()?.role||'';
    const roles={overview:['owner','admin','manager'],team:['owner'],activity:['owner','admin','manager'],'team-management':['owner','admin','manager','site_supervisor','estimator','worker'],'photo-timeline':['owner','admin','manager','site_supervisor','estimator'],'financial-data':['owner','admin','manager','estimator','site_supervisor','worker'],quotes:['owner','admin','manager','estimator'],schedule:['owner','admin','manager','site_supervisor'],checklists:['owner','admin','manager','site_supervisor'],documents:['owner','admin','manager','estimator','site_supervisor'],reports:['owner','admin','manager','site_supervisor','estimator','worker'],messages:['owner','admin','manager','site_supervisor','estimator','worker']};
    return(roles[view]||[]).includes(role);
  }
  function switchView(view){if(!allowedView(view)){notice('This section is outside your approved role.');view=['owner','admin','manager'].includes(currentProfile()?.role)?'overview':'team-management'}document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view));document.querySelectorAll('[data-view-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.viewPanel===view));if(view==='messages'){renderChat();markConversationRead()}if(view==='activity')renderActivity();if(view==='team'){renderTeam();renderInvitations()}const url=new URL(location.href);if(view==='overview')url.searchParams.delete('view');else url.searchParams.set('view',view);if(view!=='financial-data')url.searchParams.delete('financeTab');history.replaceState(null,'',url);scrollTo({top:0,behavior:'smooth'})}
  function notice(text){const bar=document.createElement('div');bar.className='preview-note';bar.style.display='block';bar.textContent=text;document.body.appendChild(bar);setTimeout(()=>bar.remove(),3200)}
  async function reviewMember(card,approve){const role=card.querySelector('select').value,memberId=card.dataset.member,invitationId=card.dataset.invitation;if(preview){const member=state.members.find(item=>item.id===memberId),invitation=state.invitations.find(item=>item.id===invitationId);if(approve){member.role=role;member.active=true;if(invitation)invitation.status='approved'}else{member.role='rejected';if(invitation)invitation.status='rejected'}state.events.unshift({id:crypto.randomUUID(),actor_id:currentUser().id,action:approve?'member_join_approved':'member_join_rejected',module:'accounts',details:{member_id:memberId,invitation_id:invitationId,assigned_role:role},created_at:new Date().toISOString()});renderAll();notice(approve?`Sample member approved as ${roleLabel(role)}.`:'Sample request rejected.');return}if(!invitationId)throw new Error('This request is not connected to a valid V53 invitation.');await rpc('review_ac_team_invitation',{p_invitation_id:invitationId,p_role:role,p_approve:approve});await ACAuth.loadProfile();await load()}
  async function changeRole(memberId,value){if(preview){state.members.find(item=>item.id===memberId).role=value;renderAll();notice(`Sample role changed to ${roleLabel(value)}.`);return}await rpc('set_ac_member_role',{p_user:memberId,p_role:value});await load()}
  async function changeAccess(memberId){const member=state.members.find(item=>item.id===memberId),next=member.active===false;if(!next&&!confirm(`Revoke ${member.full_name||member.email}? Their Management Portal access will stop immediately.`))return;if(preview){member.active=next;renderAll();notice(`Sample access ${next?'restored':'revoked'}.`);return}await rpc('set_ac_member_access',{p_user:memberId,p_active:next});await load()}
  async function createInvitation(){const email=$('invitationEmail').value.trim(),role=$('invitationRole').value,hours=Number($('invitationExpiry').value||72);let result;if(preview){const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),value=>value.toString(16).padStart(2,'0')).join('');result={id:crypto.randomUUID(),token,intended_email:email,requested_role:role,status:'issued',expires_at:new Date(Date.now()+hours*3600000).toISOString()};state.invitations.unshift({...result,created_at:new Date().toISOString(),accepted_by:null})}else result=await rpc('create_ac_team_invitation',{p_email:email,p_role:role,p_expires_hours:hours});const url=new URL('team-login/',ACAuth.appRoot());url.searchParams.set('invite',result.token);$('invitationUrl').value=url.href;$('invitationResult').hidden=false;$('invitationEmail').value='';renderInvitations();notice('Secure invitation created. Copy it now—the secret is not stored in readable form.')}
  async function copyInvitationUrl(){const value=$('invitationUrl').value;if(!value)return notice('Create an invitation first.');try{await navigator.clipboard.writeText(value);notice('Secure invitation link copied.')}catch(_){$('invitationUrl').select();notice('Copy the selected secure invitation link.')}}
  async function revokeInvitation(invitationId){if(!confirm('Revoke this invitation? Its link will stop working immediately.'))return;if(preview){const invitation=state.invitations.find(item=>item.id===invitationId);if(invitation)invitation.status='revoked';renderInvitations();notice('Sample invitation revoked.');return}await rpc('revoke_ac_team_invitation',{p_invitation_id:invitationId});await load();notice('Invitation revoked.')}
  async function uploadFile(file){if(!file)return null;if(file.size>MAX_FILE)throw new Error('Attachments must be 10 MB or smaller.');const profile=currentProfile(),user=currentUser(),clean=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100),path=`${profile.organisation_id}/${user.id}/${crypto.randomUUID()}-${clean}`;const response=await fetch(`${apiBase}/storage/v1/object/ac-team-chat/${encodePath(path)}`,{method:'POST',headers:{apikey:config.publishableKey||'',Authorization:(await ACAuth.headers()).Authorization,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||data.error||'The attachment could not be uploaded.');return{path,name:file.name.slice(0,180),type:(file.type||'application/octet-stream').slice(0,120),size:file.size}}
  async function sendMessage(text,file){const body=String(text||'').trim();if(!body&&!file)throw new Error('Write a message or attach a file.');if(preview){state.messages.push({id:crypto.randomUUID(),sender_id:currentUser().id,recipient_id:state.selectedChat||null,body,attachment_name:file?.name||null,attachment_path:file?'preview/new':null,created_at:new Date().toISOString()});renderAll();return}const attachment=await uploadFile(file),profile=currentProfile(),user=currentUser();await request('/rest/v1/ac_team_messages',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({organisation_id:profile.organisation_id,sender_id:user.id,recipient_id:state.selectedChat||null,body:body.slice(0,2000),attachment_path:attachment?.path||null,attachment_name:attachment?.name||null,attachment_type:attachment?.type||null,attachment_size:attachment?.size||null})});await load()}
  async function openAttachment(path,name,type){if(preview)return notice('Attachment links activate after the Supabase chat migration is installed.');const popup=/^(?:image\/|application\/pdf)/i.test(type||'')?window.open('about:blank','_blank'):null;try{const response=await fetch(`${apiBase}/storage/v1/object/authenticated/ac-team-chat/${encodePath(path)}`,{headers:{apikey:config.publishableKey||'',...(await ACAuth.headers())}});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.message||data.error||`The attachment could not be opened (${response.status}).`)}const blob=await response.blob(),url=URL.createObjectURL(blob);if(popup){popup.opener=null;popup.location.replace(url)}else{const link=document.createElement('a');link.href=url;link.download=name||'attachment';link.click()}setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(error){popup?.close();throw error}}
  async function markConversationRead(){if(preview)return;await rpc('mark_ac_team_messages_read',{p_sender:state.selectedChat||null}).catch(()=>{});window.ACTeamChat?.updateUnread?.()}
  function exportCsv(){const rows=filteredEvents(),quote=value=>`"${String(value??'').replace(/"/g,'""')}"`,csv=['Time,Person,Role,Action,Module,Detail',...rows.map(event=>{const info=eventInfo(event),member=state.members.find(item=>item.id===event.actor_id);return[event.created_at,memberName(event.actor_id),roleLabel(member?.role),info.title,event.module,info.detail].map(quote).join(',')})].join('\n'),blob=new Blob([csv],{type:'text/csv'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`AlertTradiePro-activity-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href)}

  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.view)));document.querySelectorAll('[data-open-view]').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.openView)));
  $('refreshBtn').addEventListener('click',load);
  $('invitationForm').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,original=button.textContent;button.disabled=true;button.textContent='Creating…';try{await createInvitation()}catch(error){notice(error.message)}finally{button.disabled=false;button.textContent=original}});
  $('copyInvitationUrl').addEventListener('click',copyInvitationUrl);
  $('invitationList').addEventListener('click',event=>{const button=event.target.closest('[data-invitation-action="revoke"]');if(button)revokeInvitation(button.closest('[data-invitation]').dataset.invitation).catch(error=>notice(error.message))});
  $('requestList').addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button)reviewMember(button.closest('[data-member]'),button.dataset.action==='approve').catch(error=>notice(error.message))});
  ['teamSearch','teamRoleFilter','teamStatusFilter'].forEach(id=>$(id).addEventListener('input',renderTeam));
  $('staffRows').addEventListener('change',event=>{if(event.target.matches('[data-action="role"]'))changeRole(event.target.closest('tr').dataset.member,event.target.value).catch(error=>notice(error.message))});
  $('staffRows').addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;const memberId=button.closest('tr').dataset.member;if(button.dataset.action==='access')changeAccess(memberId).catch(error=>notice(error.message));if(button.dataset.action==='message'){state.selectedChat=memberId;switchView('messages')}if(button.dataset.action==='review')switchView('overview')});
  ['activitySearch','activityType','activityRange'].forEach(id=>$(id).addEventListener('input',renderActivity));$('auditPeople').addEventListener('click',event=>{const button=event.target.closest('[data-person]');if(!button)return;state.selectedMember=button.dataset.person;renderActivity()});$('exportActivity').addEventListener('click',exportCsv);
  $('conversationList').addEventListener('click',event=>{const button=event.target.closest('[data-chat]');if(!button)return;state.selectedChat=button.dataset.chat;renderChat();markConversationRead()});$('messages').addEventListener('click',event=>{const button=event.target.closest('[data-file]');if(button)openAttachment(button.dataset.file,button.dataset.name,button.dataset.type).catch(error=>notice(error.message))});
  $('messageFile').addEventListener('change',()=>{$('messageFileName').textContent=$('messageFile').files?.[0]?.name||''});$('messageForm').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;button.textContent='Sending…';try{await sendMessage($('messageText').value,$('messageFile').files?.[0]||null);$('messageText').value='';$('messageFile').value='';$('messageFileName').textContent=''}catch(error){notice(error.message)}finally{button.disabled=false;button.textContent='Send message'}});
  const sideToggle=$('sideToggle'),sideBackdrop=$('sideBackdrop');
  function setSide(open){document.body.classList.toggle('side-open',!!open);sideToggle?.setAttribute('aria-expanded',String(!!open));sideToggle?.setAttribute('aria-label',open?'Close Operation Hub menu':'Open Operation Hub menu')}
  window.ACRefreshSideGroups=function(){document.querySelectorAll('.side-group-label').forEach(label=>{let node=label.nextElementSibling,visible=false;while(node&&!node.classList.contains('side-group-label')){if((node.matches('button,a'))&&!node.hidden)visible=true;node=node.nextElementSibling}label.hidden=!visible})};
  sideToggle?.addEventListener('click',()=>setSide(!document.body.classList.contains('side-open')));sideBackdrop?.addEventListener('click',()=>setSide(false));document.querySelectorAll('.side [data-view],.side a').forEach(item=>item.addEventListener('click',()=>setSide(false)));window.addEventListener('resize',()=>{if(innerWidth>780)setSide(false)});
  async function start(){if(!(await ACAccountContext.guard('management')))return;if(preview&&!['owner','admin'].includes(previewRole)){location.replace(ACAccountContext.statusUrl('operations_required'));return}if(preview)document.body.classList.add('preview');await load();const requested=params.get('view');if(requested)switchView(requested);if(!preview)setInterval(()=>{if(document.visibilityState==='visible')load().catch(()=>{})},60000)}
  start();
})();
