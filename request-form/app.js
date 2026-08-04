(function(){
  'use strict';
  const $=id=>document.getElementById(id),config=window.AC_PLATFORM_CONFIG||{},apiBase=String(config.supabaseUrl||'').replace(/\/$/,'');
  const IDEM_KEY='ac_request_draft_idem_v1',MAX_FILE=20*1024*1024;
  let files=[];

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

  function fieldError(field,message){
    const wrapper=field.closest('.field')||field.closest('.check-row');
    if(!wrapper)return;
    wrapper.classList.toggle('is-invalid',Boolean(message));
    const error=wrapper.querySelector('.error-message');
    if(error)error.textContent=message||'';
    field.setAttribute('aria-invalid',message?'true':'false');
  }

  function validateField(field){
    const value=field.type==='checkbox'?field.checked:String(field.value||'').trim();
    let msg='';
    if(field.required&&!value)msg=field.type==='checkbox'?'Please confirm before submitting.':'This information is required.';
    else if(field.type==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))msg='Enter a valid email address.';
    fieldError(field,msg);
    return !msg;
  }

  const requiredFields=()=>[$('customerName'),$('email'),$('address'),$('suburb'),$('postcode'),$('projectType'),$('description'),$('consent')];

  requiredFields().forEach(field=>{
    field.addEventListener('blur',()=>validateField(field));
    field.addEventListener('input',()=>{if(field.getAttribute('aria-invalid')==='true')validateField(field)});
  });

  function renderFiles(){
    const list=$('projectFiles');
    if(!list)return;
  }

  function requestPayload(){
    const timeframe=$('timeframe').value,budget=$('budget').value,projectStage=$('projectStage').value,visitPreference=$('visitPreference').value.trim();
    return{
      full_name:$('customerName').value.trim(),email:$('email').value.trim(),phone:$('phone').value.trim(),
      preferred_contact_method:$('contactPreference').value,
      address_street:$('address').value.trim(),address_suburb:$('suburb').value.trim(),
      address_state:'VIC',address_postcode:$('postcode').value.trim(),
      property_type:$('propertyType').value,
      main_service:$('projectType').value,sub_service:'',
      description:$('description').value.trim(),current_problem:'',desired_outcome:'',
      service_details:{project_stage:projectStage,visit_preference:visitPreference,budget_range:budget},
      expected_budget:null,preferred_start_date:null,
      expected_completion:timeframe,
      urgency:timeframe==='Urgent repair'||projectStage==='Something needs repair'?'urgent':'flexible'
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
    clearMessage();
    const fields=requiredFields(),valid=fields.every(validateField);
    if(!valid){
      const firstInvalid=document.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      $('submitStatus').textContent='Please check the highlighted fields.';
      return;
    }
    const button=$('submitRequest');button.disabled=true;button.textContent='Creating your Alert code…';
    $('submitStatus').textContent='';
    try{
      const result=await rpc('submit_ac_request',{p_request:requestPayload(),p_idempotency_key:idempotencyKey()});
      const fileInput=$('projectFiles'),selectedFiles=fileInput?[...fileInput.files]:[];
      for(const file of selectedFiles){
        if(file.size>MAX_FILE)continue;
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
    const code=$('confirmNumber').textContent.trim();
    if(!code)return;
    try{await navigator.clipboard.writeText(code);$('copyNumberBtn').textContent='Copied';setTimeout(()=>{$('copyNumberBtn').textContent='Copy'},1800)}
    catch(_){message(`Your Alert code is ${code}. Copy it and keep it somewhere safe.`,'good')}
  });

  async function init(){
    await ACCustomerAuth.ready;
    if(!ACCustomerAuth.hasAccess()){
      location.href=`../customer/index.html?next=${encodeURIComponent('/request-form/index.html')}`;
      return;
    }
    $('gate').classList.remove('show');
    $('formArea').style.display='block';
    const customer=ACCustomerAuth.customer();
    if(customer?.full_name)$('customerName').value=customer.full_name;
    if(customer?.email)$('email').value=customer.email;
    if(customer?.phone)$('phone').value=customer.phone;
  }
  $('gate').classList.add('show');
  init();
})();
