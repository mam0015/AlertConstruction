(function(){
  'use strict';
  const $=id=>document.getElementById(id),config=window.AC_PLATFORM_CONFIG||{},apiBase=String(config.supabaseUrl||'').replace(/\/$/,'');
  const IDEM_KEY='ac_request_draft_idem_v1',MAX_FILE=20*1024*1024;
  let step=1,files=[];

  function message(text,type='error'){const box=$('message');box.textContent=text;box.className=`message show ${type}`;box.scrollIntoView({block:'nearest'})}
  function clearMessage(){$('message').className='message'}

  async function apiHeaders(content=true){return{apikey:config.publishableKey||'',...(content?{'Content-Type':'application/json'}:{}),...await ACCustomerAuth.headers()}}
  async function rpc(name,body={}){
    const response=await fetch(`${apiBase}/rest/v1/rpc/${name}`,{method:'POST',headers:await apiHeaders(true),body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||data.error||`${name} failed.`);
    return data;
  }

  function idempotencyKey(){
    let value=sessionStorage.getItem(IDEM_KEY);
    if(!value){value=crypto.randomUUID();sessionStorage.setItem(IDEM_KEY,value)}
    return value;
  }

  // ---- Step navigation ----
  const totalSteps=6;
  function renderSteps(){
    $('stepsBar').innerHTML=Array.from({length:totalSteps},(_,index)=>{
      const n=index+1,cls=n<step?'done':n===step?'active':'';
      return `<i class="${cls}"></i>`;
    }).join('');
  }
  function showStep(next){
    step=Math.max(1,Math.min(totalSteps,next));
    document.querySelectorAll('[data-step]').forEach(section=>{section.style.display=Number(section.dataset.step)===step?'block':'none'});
    $('backBtn').hidden=step===1;
    $('nextBtn').hidden=step===totalSteps;
    $('submitBtn').hidden=step!==totalSteps;
    if(step===totalSteps)renderReview();
    renderSteps();
    clearMessage();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function validateStep(current){
    if(current===1){
      if(!$('fullName').value.trim())return'Enter your full name.';
      if(!$('email').value.trim())return'Enter your email.';
    }
    if(current===2){
      if(!$('addressStreet').value.trim())return'Enter the project street address.';
      if(!$('addressSuburb').value.trim())return'Enter the project suburb.';
      if(!$('addressPostcode').value.trim())return'Enter the postcode.';
    }
    if(current===3){
      if(!$('mainService').value)return'Choose a main service.';
      if(!$('description').value.trim())return'Describe the work you need.';
    }
    return'';
  }

  $('nextBtn').addEventListener('click',()=>{
    const problem=validateStep(step);
    if(problem)return message(problem);
    showStep(step+1);
  });
  $('backBtn').addEventListener('click',()=>showStep(step-1));

  // ---- Dynamic Engineering fields ----
  function syncEngineeringFields(){
    const isEngineering=$('mainService').value==='Engineering';
    $('engineeringFields').classList.toggle('show',isEngineering);
    $('subServiceField').style.display=isEngineering?'none':'block';
  }
  $('mainService').addEventListener('change',syncEngineeringFields);

  // ---- Files ----
  function renderFiles(){
    $('fileList').innerHTML=files.map((file,index)=>`<div class="file-row"><span>${file.name} · ${(file.size/1024/1024).toFixed(1)}MB</span><button type="button" data-remove="${index}">Remove</button></div>`).join('');
  }
  $('uploadZone').addEventListener('click',()=>$('fileInput').click());
  $('fileInput').addEventListener('change',()=>{
    const picked=[...$('fileInput').files];
    for(const file of picked){
      if(file.size>MAX_FILE){message(`${file.name} is larger than 20MB and was not added.`);continue}
      files.push(file);
    }
    $('fileInput').value='';
    renderFiles();
  });
  $('fileList').addEventListener('click',event=>{
    const button=event.target.closest('[data-remove]');
    if(!button)return;
    files.splice(Number(button.dataset.remove),1);
    renderFiles();
  });

  // ---- Review ----
  function reviewRow(label,value){return value?`<div class="review-row"><span>${label}</span><span>${value}</span></div>`:''}
  function renderReview(){
    const engineering=$('mainService').value==='Engineering';
    $('reviewContent').innerHTML=`
      <div class="review-block"><h3>Your details</h3>
        ${reviewRow('Name',$('fullName').value)}
        ${reviewRow('Email',$('email').value)}
        ${reviewRow('Phone',$('phone').value)}
        ${reviewRow('Preferred contact',$('preferredContact').options[$('preferredContact').selectedIndex].text)}
      </div>
      <div class="review-block"><h3>Location</h3>
        ${reviewRow('Address',`${$('addressStreet').value}, ${$('addressSuburb').value} ${$('addressState').value} ${$('addressPostcode').value}`)}
        ${reviewRow('Property type',$('propertyType').value)}
      </div>
      <div class="review-block"><h3>The work</h3>
        ${reviewRow('Main service',$('mainService').value)}
        ${engineering?reviewRow('Engineering type',$('engineeringType').value):reviewRow('Sub-service',$('subService').value)}
        ${reviewRow('Description',$('description').value)}
      </div>
      <div class="review-block"><h3>Budget and timing</h3>
        ${reviewRow('Expected budget',$('expectedBudget').value?`$${Number($('expectedBudget').value).toLocaleString('en-AU')}`:'')}
        ${reviewRow('Preferred start',$('preferredStart').value)}
        ${reviewRow('Urgency',document.querySelector('input[name="urgency"]:checked').value==='urgent'?'Urgent':'Flexible')}
      </div>
      <div class="review-block"><h3>Files</h3>${files.length?reviewRow('Attached',`${files.length} file${files.length===1?'':'s'}`):'<p style="color:var(--muted);font-size:12px;margin:0">No files attached.</p>'}</div>
    `;
  }

  // ---- Submit ----
  function requestPayload(){
    const engineering=$('mainService').value==='Engineering';
    return{
      full_name:$('fullName').value.trim(),email:$('email').value.trim(),phone:$('phone').value.trim(),
      preferred_contact_method:$('preferredContact').value,
      address_street:$('addressStreet').value.trim(),address_suburb:$('addressSuburb').value.trim(),
      address_state:$('addressState').value,address_postcode:$('addressPostcode').value.trim(),
      property_type:$('propertyType').value,
      main_service:$('mainService').value,sub_service:engineering?$('engineeringType').value:$('subService').value.trim(),
      description:$('description').value.trim(),current_problem:$('currentProblem').value.trim(),desired_outcome:$('desiredOutcome').value.trim(),
      service_details:engineering?{
        engineering_type:$('engineeringType').value,
        existing_plans_available:$('existingPlans').value,
        council_or_permit_related:$('councilRelated').value,
        drawings_or_assessment_required:$('drawingsRequired').value.trim()
      }:{},
      expected_budget:$('expectedBudget').value?Number($('expectedBudget').value):null,
      preferred_start_date:$('preferredStart').value||null,
      expected_completion:$('expectedCompletion').value.trim(),
      urgency:document.querySelector('input[name="urgency"]:checked').value
    };
  }

  async function uploadRequestFile(requestId,file){
    const path=`${requestId}/${ACCustomerAuth.user().id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100)}`;
    const response=await fetch(`${apiBase}/storage/v1/object/request-files/${path.split('/').map(encodeURIComponent).join('/')}`,{
      method:'POST',
      headers:{apikey:config.publishableKey||'',...(await ACCustomerAuth.headers()),'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},
      body:file
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||data.error||`${file.name} could not be uploaded.`);
    await rpc('attach_ac_request_file',{p_request_id:requestId,p_file:{storage_path:path,file_name:file.name,mime_type:file.type||'application/octet-stream',file_size_bytes:file.size}});
  }

  $('requestForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const button=$('submitBtn');button.disabled=true;button.textContent='Submitting…';
    try{
      const result=await rpc('submit_ac_request',{p_request:requestPayload(),p_idempotency_key:idempotencyKey()});
      for(const file of files){
        try{await uploadRequestFile(result.id,file)}catch(fileError){console.warn('File attach failed',fileError)}
      }
      sessionStorage.removeItem(IDEM_KEY);
      $('formArea').style.display='none';
      $('confirmNumber').textContent=result.request_number;
      $('confirm').classList.add('show');
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(error){
      message(error.message);
    }finally{
      button.disabled=false;button.textContent='Submit Request';
    }
  });

  $('copyNumberBtn').addEventListener('click',async()=>{
    const number=$('confirmNumber').textContent.trim();
    if(!number)return;
    try{
      await navigator.clipboard.writeText(number);
      $('copyNumberBtn').textContent='Copied';
    }catch(_){
      message(`Your request number is ${number}. Copy it and keep it somewhere safe.`,'good');
    }
    setTimeout(()=>{$('copyNumberBtn').textContent='Copy'},2000);
  });

  // ---- Auth gate ----
  async function init(){
    await ACCustomerAuth.ready;
    if(!ACCustomerAuth.hasAccess()){
      location.href=`../customer/index.html?next=${encodeURIComponent('/request-a-job/index.html')}`;
      return;
    }
    $('gate').classList.remove('show');
    $('formArea').style.display='block';
    const customer=ACCustomerAuth.customer();
    if(customer?.full_name)$('fullName').value=customer.full_name;
    if(customer?.email)$('email').value=customer.email;
    if(customer?.phone)$('phone').value=customer.phone;
    syncEngineeringFields();
    showStep(1);
  }
  $('gate').classList.add('show');
  $('formArea').style.display='none';
  init();
})();
