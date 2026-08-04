(function(){
  'use strict';
  const $=id=>document.getElementById(id),config=window.AC_PLATFORM_CONFIG||{},apiBase=String(config.supabaseUrl||'').replace(/\/$/,'');
  let requests=[],selectedId='',supervisors=[],loaded=false;

  const STATUS_LABEL={
    request_submitted:'Request Submitted',under_review:'Under Review',customer_contacted:'Customer Contacted',
    more_info_required:'More Info Required',site_visit_scheduled:'Site Visit Scheduled',site_inspection_completed:'Inspection Completed',
    estimate_in_preparation:'Estimate in Preparation',quote_sent:'Quote Sent',quote_accepted:'Quote Accepted',
    project_scheduled:'Project Scheduled',work_in_progress:'Work in Progress',project_completed:'Project Completed',
    not_suitable:'Not Suitable',closed:'Closed'
  };
  const DONE_STATUSES=new Set(['quote_accepted','project_scheduled','work_in_progress','project_completed']);
  const CLOSED_STATUSES=new Set(['not_suitable','closed']);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateLabel=value=>value?new Date(value).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'—';
  const money=value=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(Number(value)||0);
  const statusPillClass=status=>DONE_STATUSES.has(status)?'done':CLOSED_STATUSES.has(status)?'closed':'';

  function toast(text,tone=''){
    const note=document.createElement('div');note.className='preview-note';note.style.display='block';note.textContent=text;
    if(tone==='error')note.style.color='#ff9d9d';
    document.body.appendChild(note);setTimeout(()=>note.remove(),3400);
  }

  async function loadSupervisors(){
    try{
      const profile=window.ACAuth.profile(),headers={apikey:config.publishableKey||'',...(await window.ACAuth.headers())};
      const response=await fetch(`${apiBase}/rest/v1/profiles?organisation_id=eq.${encodeURIComponent(profile.organisation_id)}&role=eq.site_supervisor&active=eq.true&select=id,full_name,email&order=full_name`,{headers});
      supervisors=response.ok?await response.json():[];
    }catch(_){supervisors=[]}
  }

  function renderKpis(){
    const today=new Date().toISOString().slice(0,10);
    $('reqKpiNew').textContent=requests.filter(item=>item.status==='request_submitted').length;
    $('reqKpiFollowUp').textContent=requests.filter(item=>item.next_follow_up_date&&item.next_follow_up_date<=today&&!DONE_STATUSES.has(item.status)&&!CLOSED_STATUSES.has(item.status)).length;
    $('reqKpiSiteVisit').textContent=requests.filter(item=>item.status==='site_visit_scheduled').length;
    $('reqKpiReady').textContent=requests.filter(item=>item.status==='quote_accepted').length;
  }

  function renderList(){
    const filter=$('reqStatusFilter').value;
    const rows=filter?requests.filter(item=>item.status===filter):requests;
    $('reqList').innerHTML=rows.length?rows.map(item=>`
      <button class="req-card ${item.id===selectedId?'active':''}" type="button" data-request="${esc(item.id)}">
        <div class="req-card-top"><div><strong>${esc(item.request_number)}</strong><span>${esc(item.full_name||'Customer')} · ${esc(item.main_service||'')}</span></div><span class="req-pill ${statusPillClass(item.status)}">${esc(STATUS_LABEL[item.status]||item.status)}</span></div>
        <div class="req-card-meta"><span>${esc(item.address_suburb||'')}</span><span>Updated ${esc(dateLabel(item.updated_at))}</span>${item.next_follow_up_date?`<span>Follow up ${esc(dateLabel(item.next_follow_up_date))}</span>`:''}</div>
      </button>`).join(''):'<div class="req-detail-empty">No requests match this filter.</div>';
  }

  function detailEmpty(){$('reqDetail').innerHTML='<div class="req-detail-empty">Select a request to view details.</div>'}

  async function openRequest(id){
    selectedId=id;renderList();
    $('reqDetail').innerHTML='<div class="req-detail-empty">Loading…</div>';
    try{
      const detail=await window.ACRequestsAPI.get(id);
      renderDetail(detail);
    }catch(error){$('reqDetail').innerHTML=`<div class="req-detail-empty">${esc(error.message)}</div>`}
  }

  function renderDetail(detail){
    const role=window.ACAuth.profile()?.role,canManage=['owner','admin','manager'].includes(role);
    const hasBudget=Object.prototype.hasOwnProperty.call(detail,'expected_budget');
    const files=Array.isArray(detail.files)?detail.files:[];
    const history=Array.isArray(detail.history)?detail.history:[];

    $('reqDetail').innerHTML=`
      <span class="req-pill ${statusPillClass(detail.status)}" style="display:inline-flex">${esc(STATUS_LABEL[detail.status]||detail.status)}</span>
      <h2 style="margin-top:10px">${esc(detail.full_name||'Customer')}</h2>
      <div class="req-number">${esc(detail.request_number)} · ${esc(detail.main_service||'')}${detail.sub_service?' — '+esc(detail.sub_service):''}</div>

      <div class="req-section"><h3>Contact</h3>
        <div class="req-row"><span>Email</span><span>${esc(detail.email||'—')}</span></div>
        <div class="req-row"><span>Phone</span><span>${esc(detail.phone||'—')}</span></div>
        <div class="req-row"><span>Preferred contact</span><span>${esc(detail.preferred_contact_method||'—')}</span></div>
      </div>

      <div class="req-section"><h3>Location</h3>
        <div class="req-row"><span>Address</span><span>${esc(detail.address_street||'')}, ${esc(detail.address_suburb||'')} ${esc(detail.address_state||'')} ${esc(detail.address_postcode||'')}</span></div>
        <div class="req-row"><span>Property type</span><span>${esc(detail.property_type||'—')}</span></div>
      </div>

      <div class="req-section"><h3>The work</h3>
        <div class="req-row"><span>Description</span><span>${esc(detail.description||'—')}</span></div>
        ${detail.current_problem?`<div class="req-row"><span>Current problem</span><span>${esc(detail.current_problem)}</span></div>`:''}
        ${detail.desired_outcome?`<div class="req-row"><span>Desired outcome</span><span>${esc(detail.desired_outcome)}</span></div>`:''}
        ${detail.preferred_start_date?`<div class="req-row"><span>Preferred start</span><span>${esc(dateLabel(detail.preferred_start_date))}</span></div>`:''}
        <div class="req-row"><span>Urgency</span><span>${esc(detail.urgency==='urgent'?'Urgent':'Flexible')}</span></div>
        ${hasBudget?`<div class="req-row"><span>Expected budget</span><span>${detail.expected_budget!=null?money(detail.expected_budget):'Not provided'}</span></div>`:''}
      </div>

      ${files.length?`<div class="req-section"><h3>Files</h3><div class="req-files">${files.map(file=>`<button class="req-file-btn" type="button" data-file="${esc(file.storage_path)}" data-name="${esc(file.file_name)}" data-type="${esc(file.mime_type)}">📎 ${esc(file.file_name)}</button>`).join('')}</div></div>`:''}

      ${canManage?`<div class="req-section"><h3>Update project situation</h3><form class="req-form" id="reqStatusForm">
        <label>Project situation<select id="reqStatusSelect">${Object.entries(STATUS_LABEL).map(([value,label])=>`<option value="${esc(value)}" ${value===detail.status?'selected':''}>${esc(label)}</option>`).join('')}</select></label>
        <label>Note for the customer<textarea id="reqStatusNote" maxlength="2000" placeholder="What should the customer see for this update?"></textarea></label>
        <label style="display:flex;align-items:center;gap:8px;font-weight:700;color:#ccc"><input id="reqStatusVisible" type="checkbox" style="width:auto;min-height:0" checked> Visible to customer</label>
        <button class="btn primary" type="submit">Save Update</button>
      </form></div>`:''}

      ${canManage?`<div class="req-section"><h3>Record contact</h3><form class="req-form" id="reqContactForm">
        <label>Outcome<select id="reqOutcome"><option>Contacted</option><option>No Answer</option><option>Follow-up Required</option><option>More Information Required</option><option>Site Visit Required</option><option>Approved for Inspection</option><option>Not Suitable</option><option>Closed</option></select></label>
        <label>Follow-up date<input id="reqFollowUpDate" type="date"></label>
        <label>Note<textarea id="reqContactNote" maxlength="2000" placeholder="What was discussed"></textarea></label>
        <button class="btn primary" type="submit">Save Contact Record</button>
      </form></div>`:''}

      ${canManage&&!detail.project_id?`<div class="req-approve"><p>Approving creates a project immediately and assigns a Site Supervisor.</p><form class="req-form" id="reqApproveForm">
        <label>Site Supervisor<select id="reqSupervisor" required><option value="">Choose a Site Supervisor…</option>${supervisors.map(person=>`<option value="${esc(person.id)}">${esc(person.full_name||person.email)}</option>`).join('')}</select></label>
        <label>Project name (optional)<input id="reqProjectName" placeholder="Leave blank to auto-generate"></label>
        <label>Brief for Site Supervisor</label><textarea id="reqAdminBrief" maxlength="4000" placeholder="Access details, appointment info, what to inspect — no budget or pricing"></textarea>
        <button class="btn primary" type="submit">Approve &amp; Create Project</button>
      </form></div>`:''}
      ${detail.project_id?`<div class="req-section"><h3>Project</h3><a class="btn" href="../projects/index.html">Open in Projects →</a></div>`:''}

      <div class="req-section"><h3>Status timeline</h3><div class="req-timeline">${history.length?history.map(item=>`<div class="req-timeline-row"><strong>${esc(STATUS_LABEL[item.status]||item.status)}</strong><span>${esc(dateLabel(item.created_at))}${item.note?' — '+esc(item.note):''}${item.customer_visible?' · Visible to customer':''}</span></div>`).join(''):'<div class="req-timeline-row"><strong>No history recorded.</strong></div>'}</div></div>
    `;

    const statusForm=$('reqStatusForm');
    if(statusForm)statusForm.addEventListener('submit',async event=>{
      event.preventDefault();const button=event.submitter;button.disabled=true;
      try{
        await window.ACRequestsAPI.setStatus(detail.id,$('reqStatusSelect').value,$('reqStatusNote').value.trim(),$('reqStatusVisible').checked);
        toast('Project situation updated.','good');await load();await openRequest(detail.id);
      }catch(error){toast(error.message,'error')}finally{button.disabled=false}
    });

    const contactForm=$('reqContactForm');
    if(contactForm)contactForm.addEventListener('submit',async event=>{
      event.preventDefault();const button=event.submitter;button.disabled=true;
      try{
        await window.ACRequestsAPI.recordContact(detail.id,$('reqOutcome').value,$('reqFollowUpDate').value||null,$('reqContactNote').value.trim());
        toast('Contact recorded.','good');await load();await openRequest(detail.id);
      }catch(error){toast(error.message,'error')}finally{button.disabled=false}
    });

    const approveForm=$('reqApproveForm');
    if(approveForm)approveForm.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!$('reqSupervisor').value)return toast('Choose a Site Supervisor before approving.','error');
      if(!confirm('Approve this request and create a project now?'))return;
      const button=event.submitter;button.disabled=true;button.textContent='Creating…';
      try{
        await window.ACRequestsAPI.createProject(detail.id,$('reqSupervisor').value,$('reqProjectName').value.trim(),$('reqAdminBrief').value.trim());
        toast('Project created.','good');await load();await openRequest(detail.id);
      }catch(error){toast(error.message,'error')}finally{button.disabled=false;button.textContent='Approve & Create Project'}
    });

    $('reqDetail').querySelectorAll('[data-file]').forEach(button=>button.addEventListener('click',()=>{
      window.ACRequestsAPI.openFile(button.dataset.file,button.dataset.name,button.dataset.type).catch(error=>toast(error.message,'error'));
    }));
  }

  async function load(){
    try{
      requests=await window.ACRequestsAPI.list();
      renderKpis();renderList();
      if(selectedId&&!requests.some(item=>item.id===selectedId)){selectedId='';detailEmpty()}
    }catch(error){
      $('reqList').innerHTML=`<div class="req-detail-empty">${esc(error.message)}</div>`;
      $('reqKpiNew').textContent='—';$('reqKpiFollowUp').textContent='—';$('reqKpiSiteVisit').textContent='—';$('reqKpiReady').textContent='—';
    }
  }

  async function ensureLoaded(){
    if(loaded)return;
    loaded=true;
    await loadSupervisors();
    await load();
    detailEmpty();
  }

  async function applyNavVisibility(){
    await window.ACAuth?.ready;
    const role=window.ACAuth?.profile?.()?.role,visible=window.ACRequestsAPI.ACCESS_ROLES.has(role||'');
    document.querySelectorAll('[data-view="requests"]').forEach(button=>button.hidden=!visible);
    window.ACRefreshSideGroups?.();
  }
  window.addEventListener('ac-auth-ready',async()=>{
    await applyNavVisibility();
    if(new URLSearchParams(location.search).get('view')==='requests')document.querySelector('[data-view="requests"]')?.click();
  });
  window.addEventListener('ac-auth-changed',applyNavVisibility);
  applyNavVisibility();

  document.querySelectorAll('[data-view="requests"],[data-open-view="requests"]').forEach(button=>button.addEventListener('click',ensureLoaded));
  $('reqList').addEventListener('click',event=>{const button=event.target.closest('[data-request]');if(button)openRequest(button.dataset.request)});
  $('reqStatusFilter').addEventListener('change',renderList);
  $('reqRefresh').addEventListener('click',load);

  window.ACRequestsOverview={
    async render(){
      const role=window.ACAuth?.profile?.()?.role;
      if(!['owner','admin','manager'].includes(role||''))return;
      try{
        if(!requests.length)requests=await window.ACRequestsAPI.list();
        const today=new Date().toISOString().slice(0,10);
        const newCount=$('ohNewRequestCount'),followUpCount=$('ohFollowUpCount');
        if(newCount)newCount.textContent=requests.filter(item=>item.status==='request_submitted').length;
        if(followUpCount)followUpCount.textContent=requests.filter(item=>item.next_follow_up_date&&item.next_follow_up_date<=today&&!DONE_STATUSES.has(item.status)&&!CLOSED_STATUSES.has(item.status)).length;
      }catch(_){}
    }
  };
})();
