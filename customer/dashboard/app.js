(function(){
  'use strict';
  const $=id=>document.getElementById(id),config=window.AC_PLATFORM_CONFIG||{},apiBase=String(config.supabaseUrl||'').replace(/\/$/,'');

  const STATUS_COPY={
    request_submitted:['Request Submitted','Your request has been received and is waiting for our team to review it.'],
    under_review:['Under Admin Review','Our administration team is currently reviewing your request.'],
    customer_contacted:['Customer Contacted','A member of our team has been in touch about your request.'],
    more_info_required:['Additional Information Required','We need a little more detail from you — we’ll be in touch.'],
    site_visit_scheduled:['Site Visit Scheduled','A site visit has been arranged so we can assess the work required.'],
    site_inspection_completed:['Site Inspection Completed','Our site visit is complete and we’re preparing next steps.'],
    estimate_in_preparation:['Estimate in Preparation','We’re preparing a detailed estimate for your project.'],
    quote_sent:['Quote Sent','A quote has been sent for your review.'],
    quote_accepted:['Quote Accepted','Thanks for accepting your quote — we’re preparing your project schedule.'],
    project_scheduled:['Project Scheduled','Your project has been scheduled and a team has been assigned.'],
    work_in_progress:['Work in Progress','Work on your project is currently underway.'],
    project_completed:['Project Completed','Your project has been completed. Thank you for choosing Alert Construction.'],
    not_suitable:['Request Closed','This request isn’t able to proceed. Please contact us if you’d like to discuss further.'],
    closed:['Request Closed','This request has been closed.']
  };
  const COMPLETE_STATUSES=new Set(['quote_accepted','project_scheduled','work_in_progress','project_completed']);
  const PROGRESS_ORDER=['request_submitted','under_review','site_visit_scheduled','site_inspection_completed','estimate_in_preparation','quote_sent','quote_accepted','project_scheduled','work_in_progress','project_completed'];
  const PROGRESS_ALIAS={customer_contacted:'under_review',more_info_required:'under_review',not_suitable:'project_completed',closed:'project_completed'};
  function progressPercent(status){
    const key=PROGRESS_ALIAS[status]||status,index=PROGRESS_ORDER.indexOf(key);
    if(index<0)return 0;
    return Math.round((index/(PROGRESS_ORDER.length-1))*100);
  }

  async function apiHeaders(content=true){return{apikey:config.publishableKey||'',...(content?{'Content-Type':'application/json'}:{}),...await ACCustomerAuth.headers()}}
  async function rpc(name,body={}){
    const response=await fetch(`${apiBase}/rest/v1/rpc/${name}`,{method:'POST',headers:await apiHeaders(true),body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||data.error||`${name} failed.`);
    return data;
  }
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateLabel=value=>value?new Date(value).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'';

  let requests=[];

  function renderList(){
    const term=$('trackCodeInput').value.trim().toUpperCase();
    const filtered=term?requests.filter(request=>String(request.request_number||'').toUpperCase().includes(term)):requests;
    if(!requests.length){
      $('requestList').innerHTML='<div class="empty-panel">No requests yet. <a href="../../request-a-job/index.html" style="color:var(--yellow)">Submit a job request</a>.</div>';
      return;
    }
    if(!filtered.length){
      $('requestList').innerHTML=`<div class="empty-panel">No request matches "${esc(term)}". Check the code and try again.</div>`;
      return;
    }
    $('requestList').innerHTML=filtered.map(request=>{
      const [label]=STATUS_COPY[request.status]||['Request Submitted',''];
      const complete=COMPLETE_STATUSES.has(request.status);
      return `<button class="request-row" type="button" data-request="${esc(request.id)}">
        <div><strong>${esc(request.request_number)} — ${esc(request.main_service||'Job request')}</strong><span>${esc(request.address_suburb||'')} • Updated ${esc(dateLabel(request.updated_at))}</span></div>
        <span class="status-pill ${complete?'complete':''}">${esc(label)}</span>
      </button>`;
    }).join('');
  }
  $('trackCodeInput').addEventListener('input',renderList);

  async function openRequest(id){
    try{
      const detail=await rpc('get_my_ac_request',{p_request_id:id});
      const [label,copy]=STATUS_COPY[detail.status]||['Request Submitted',''];
      const complete=COMPLETE_STATUSES.has(detail.status);
      $('detailStatusPill').textContent=label;
      $('detailStatusPill').className=`status-pill ${complete?'complete':''}`;
      $('detailTitle').textContent=`${detail.request_number} — ${detail.main_service||'Job request'}`;
      $('detailStatusCopy').textContent=copy;
      const percent=progressPercent(detail.status);
      $('detailProgressBar').style.width=`${percent}%`;
      $('detailProgressText').textContent=`${percent}% through the project path`;
      const history=Array.isArray(detail.history)&&detail.history.length?detail.history:[{status:detail.status,note:'',created_at:detail.created_at}];
      $('detailTimeline').innerHTML=history.map((item,index)=>{
        const [itemLabel]=STATUS_COPY[item.status]||[item.status,''];
        const state=index<history.length-1?'is-complete':'is-current';
        return `<li class="${state}"><span class="timeline-marker">${index+1}</span><span class="timeline-copy"><strong>${esc(itemLabel)}</strong><span>${esc(item.note||'No further detail provided.')} — ${esc(dateLabel(item.created_at))}</span></span></li>`;
      }).join('');
      $('listView').hidden=true;$('detailView').classList.add('show');
    }catch(error){alert(error.message)}
  }

  $('requestList').addEventListener('click',event=>{
    const button=event.target.closest('[data-request]');
    if(button)openRequest(button.dataset.request);
  });
  $('detailBack').addEventListener('click',()=>{$('detailView').classList.remove('show');$('listView').hidden=false});
  $('signOutBtn').addEventListener('click',async()=>{await ACCustomerAuth.signOut();location.href='../index.html'});

  (async function(){
    await ACCustomerAuth.ready;
    if(!ACCustomerAuth.hasAccess()){location.href='../index.html?next=/customer/dashboard/index.html';return}
    const customer=ACCustomerAuth.customer();
    $('customerName').textContent=(customer&&customer.full_name)||ACCustomerAuth.user()?.email||'there';
    $('guard').hidden=true;$('content').hidden=false;
    try{requests=await rpc('list_my_ac_requests');renderList()}catch(error){$('requestList').innerHTML=`<div class="empty-panel">${esc(error.message)}</div>`}
  })();
})();
