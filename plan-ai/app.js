(function(){
  'use strict';

  const CATALOGS={
    electrical:{label:'Electrical',path:'../electrical/index.html',storage:'ac_ai_electrical_prefill_v1',profit:'percent',items:[
      ['LED Downlight - Supply, wiring & install',null],['LED Downlight - Install only',null],['Bathroom Wall Light - Install on tiles',null],['Outdoor Entrance Light',null],['Shaving Cabinet Light',null],['Power Point - New wiring & install',null],['Power Point - Replacement / fit off',null],['Double Power Point with extra switch',null],['Weatherproof Power Point',null],['1 Gang Light Switch - Replacement',null],['1 Gang Light Switch - New wiring',null],['2 Gang Light Switch - Replacement',null],['2 Gang Light Switch - New wiring',null],['3 Gang Light Switch - Replacement',null],['3 Gang Light Switch - New wiring',null],['4 Gang Light Switch - Replacement',null],['Rotary LED Dimmer',null],['Electric Towel Heater',null],['Non-Electric Towel Rack',null],['3-in-1 Fan / Heat / Light Combo',null],['Rangehood Duct',null],['TV Antenna Point',null],['Data Point',null]
    ]},
    plumbing:{label:'Plumbing',path:'../plumbing/index.html',storage:'ac_ai_plumbing_prefill_v1',profit:'percent',items:[
      ['Bathroom Rough-In Package',null],['Ensuite Rough-In Package',null],['Ground Floor Bathroom Rough-In',null],['Laundry Rough-In',null],['Kitchen Rough-In',null],['Retreat Sink Rough-In',null],['New Water Point Rough-In',null],['Waste Point Rough-In',null],['Wall Mixer Rough-In',null],['Smart Toilet Setup',null],['Rain Shower Nogging',null],['Toilet Fit-Off',null],['Vanity Basin Fit-Off',null],['Shower Fit-Off',null],['Bath Fit-Off',null],['Kitchen Sink Fit-Off',null],['Laundry Trough Fit-Off',null],['Water to Fridge Fit-Off',null],['Dishwasher Connection',null],['Gas Line Alteration',null],['Gas Hot Plate Fit-Off',null],['Concrete Saw Cut / Jackhammer Allowance',null],['Sanitary Drain Alteration',null],['Coloured Bath Waste + Flexible Connection',null],['Call-Out / Minor Plumbing Item',null]
    ]},
    cladding:{label:'Cladding',path:'../cladding/index.html',storage:'ac_ai_cladding_prefill_v1',profit:'percent',decimal:true,items:[
      ['Thermory Pine Trax Natural C32 Cladding - 140 x 20 LM',null],['Thermory C32 Cladding - 5.4m Length',null],['Thermory C32 Cladding - estimated material coverage m²',null],['Thermory C32 Cladding - 28 Lengths / 151.40 LM',null],['42 x 42 THERMOLIT SPR Corner Mould CP3 @ 4200mm',null],['42 x 42 THERMOLIT SPR Corner Mould CP3 LM',null],['Corner Moulding Pack - 6 Pieces',null],['Delivery Charge / Express Delivery UTE',null],['Original Invoice Package - 28 Lengths + 4 Corners + Delivery',null],['Revised Invoice Package - 28 Lengths + 6 Corners + Delivery',null],['Order Confirmation Package - 28 Lengths + Delivery, no corners',null]
    ]},
    // Future trade scaffold. Kept in code but intentionally hidden from the UI until
    // a verified Carpentry catalogue and detection rules are supplied.
    carpentry:{enabled:false,label:'Carpentry',path:'../carpentry/index.html',storage:'ac_ai_carpentry_prefill_v1',profit:'percent',items:[]}
  };
  const GST=.10,PROFIT=.20;
  const config=window.AC_PLAN_AI_CONFIG||{};
  const state={trade:'electrical',method:'fast',priceMode:'builder',plans:{existing:{file:null,data:null},proposed:{file:null,data:null}},responseId:null,analysis:null,symbols:[],items:[],busy:false};
  const cardData=new WeakMap();
  const $=id=>document.getElementById(id);
  let errorTimer,timerId,startTime;

  function esc(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function money(value){return Number(value||0).toLocaleString('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2})}
  function showError(message){const box=$('errorBox');box.textContent=message;box.hidden=false;clearTimeout(errorTimer);errorTimer=setTimeout(()=>box.hidden=true,5500)}
  function scrollMessages(){const messages=$('messages');messages.scrollTop=messages.scrollHeight}
  function current(){return CATALOGS[state.trade]}

  document.querySelectorAll('.trade').forEach(button=>button.addEventListener('click',()=>{
    if(state.busy)return;
    state.trade=button.dataset.trade;state.responseId=null;state.analysis=null;state.symbols=[];state.items=[];
    document.querySelectorAll('.trade').forEach(x=>x.classList.toggle('active',x===button));
    $('chatInput').placeholder=`e.g. Compare the existing and proposed ${current().label.toLowerCase()} plans`;
    addMessage(`Switched to ${current().label}. I will compare the two ${current().label} drawings and use that price catalogue only for supported added work.`,'assistant');
  }));

  const METHOD_COPY={
    fast:'Fast Vision compares both drawings in one efficient pass. It reads each legend and counts visible symbols, but every change still needs checking.',
    smart:'Smart Review performs a deeper comparison of both files, their legends, rooms, symbols, notes and possible double-counting. It is slower and lower risk.'
  };
  document.querySelectorAll('.method').forEach(button=>button.addEventListener('click',()=>{
    if(state.busy)return;
    state.method=button.dataset.method;state.responseId=null;state.analysis=null;state.symbols=[];state.items=[];
    document.querySelectorAll('.method').forEach(x=>{const active=x===button;x.classList.toggle('active',active);x.setAttribute('aria-checked',String(active))});
    $('methodNote').textContent=METHOD_COPY[state.method];
    addMessage(state.method==='fast'?'Fast Vision selected. One AI pass will compare the two legends and visible trade symbols.':'Smart Review selected. The secure AI service will perform a deeper page-by-page comparison.','assistant');
  }));

  document.querySelectorAll('.price-mode').forEach(button=>button.addEventListener('click',()=>{
    if(state.busy)return;state.priceMode=button.dataset.priceMode==='customer'?'customer':'builder';
    document.querySelectorAll('.price-mode').forEach(x=>{const active=x===button;x.classList.toggle('active',active);x.setAttribute('aria-checked',String(active))});
    document.querySelectorAll('.result-card').forEach(card=>{const data=cardData.get(card);if(data){data.priceMode=state.priceMode;updateCard(card)}});
    addMessage(state.priceMode==='builder'?'Builder Quote selected: 20% building margin is added before 10% GST.':'Customer Direct selected: no 20% building margin; only 10% GST is added.','assistant');
  }));

  bindPlanUpload('existing');bindPlanUpload('proposed');
  function bindPlanUpload(kind){
    const title=kind[0].toUpperCase()+kind.slice(1),dropzone=$(`${kind}Dropzone`),input=$(`${kind}PlanFile`);
    input.addEventListener('change',event=>selectFile(kind,event.target.files[0]));
    ['dragenter','dragover'].forEach(name=>dropzone.addEventListener(name,event=>{event.preventDefault();dropzone.classList.add('drag')}));
    ['dragleave','drop'].forEach(name=>dropzone.addEventListener(name,event=>{event.preventDefault();dropzone.classList.remove('drag')}));
    dropzone.addEventListener('drop',event=>selectFile(kind,event.dataTransfer.files[0]));
    $(`remove${title}FileBtn`).addEventListener('click',()=>clearFile(kind));
  }
  async function selectFile(kind,file){
    if(!file)return;
    if(/\.(heic|heif)$/i.test(file.name)||/image\/(heic|heif)/i.test(file.type||'')){try{file=await normaliseIPhonePhoto(file)}catch(error){$(`${kind}PlanFile`).value='';return showError(error.message)}}
    const type=inferFileType(file);
    if(!type)return showError('Please upload a PDF, PNG, JPG or WEBP plan. Convert Word drawings to PDF so their symbols remain visible.');
    const maxMb=Number(config.maxPlanFileMb)||7,max=maxMb*1024*1024;if(file.size>max)return showError(`For reliable iPhone upload, each plan must be smaller than ${maxMb} MB. Export a reduced-size PDF and try again.`);
    const title=kind[0].toUpperCase()+kind.slice(1),plan=state.plans[kind];plan.file=file;plan.data=null;state.responseId=null;state.analysis=null;state.symbols=[];state.items=[];
    $(`${kind}Dropzone`).classList.add('has-file');$(`${kind}FileTitle`).textContent=file.name;$(`${kind}FileMeta`).textContent=`${(file.size/1024/1024).toFixed(2)} MB • Ready as ${title}`;$(`remove${title}FileBtn`).hidden=false;
    addMessage(`${file.name} is attached as the ${title} plan. ${bothPlansReady()?'Both drawings are ready to compare.':'Attach the other drawing to continue.'}`,'assistant');
  }
  function inferFileType(file){
    const known=['application/pdf','image/png','image/jpeg','image/webp'];
    if(known.includes(String(file.type||'').toLowerCase()))return String(file.type).toLowerCase();
    const ext=(String(file.name||'').match(/\.([^.]+)$/)||[])[1]?.toLowerCase();
    return{pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'}[ext]||'';
  }
  function normaliseIPhonePhoto(file){
    const heic=/\.(heic|heif)$/i.test(file.name)||/image\/(heic|heif)/i.test(file.type||'');if(!heic)return Promise.resolve(file);
    return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{try{const limit=3200,scale=Math.min(1,limit/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{URL.revokeObjectURL(url);if(!blob)return reject(new Error('This iPhone photo could not be converted. In Camera Settings choose Formats → Most Compatible, or upload a PDF/JPG.'));resolve(new File([blob],file.name.replace(/\.(heic|heif)$/i,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified}))},'image/jpeg',.9)}catch(_){URL.revokeObjectURL(url);reject(new Error('This iPhone photo could not be converted. Upload it as PDF or JPG.'))}};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('HEIC/HEIF could not be read. On iPhone choose Share → Save to Files as PDF, or use Camera Formats → Most Compatible.'))};image.src=url})
  }
  function bothPlansReady(){return Boolean(state.plans.existing.file&&state.plans.proposed.file)}
  function clearFile(kind){const title=kind[0].toUpperCase()+kind.slice(1);state.plans[kind]={file:null,data:null};state.responseId=null;state.analysis=null;state.symbols=[];state.items=[];$(`${kind}PlanFile`).value='';$(`${kind}Dropzone`).classList.remove('has-file');$(`${kind}FileTitle`).textContent=`Upload ${kind} plan`;$(`${kind}FileMeta`).textContent='PDF, PNG, JPG or WEBP';$(`remove${title}FileBtn`).hidden=true}
  function readFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{if(typeof reader.result!=='string')return reject(new Error('The selected plan returned no readable data.'));const type=inferFileType(file);resolve(type?reader.result.replace(/^data:[^;]*;base64,/,`data:${type};base64,`):reader.result)};reader.onerror=()=>reject(new Error('The selected plan could not be read. Try saving it to Files and uploading again.'));reader.onabort=()=>reject(new Error('The plan upload was cancelled.'));reader.readAsDataURL(file)})}

  function aiError(data,status){const code=String(data?.code||'');const messages={AI_QUOTA:'AI capacity is unavailable because the service quota or billing limit was reached. No chargeable result was created. Please contact Support.',AI_BUSY:'The AI service is busy. Your files are still selected—wait a moment and try again.',AI_CONFIG:'The secure AI service is not configured correctly. Please contact Support.',CATALOGUE_UNAVAILABLE:'The approved company catalogue is unavailable or incomplete. No AI estimate was priced and no fallback rate was used. Open Catalogue or contact the Owner.',AI_RESPONSE_INVALID:'The AI returned an incomplete result. Keep the files selected and try again.',SESSION_EXPIRED:'Your secure session expired. Sign in again, then return to this page.',FILE_TOO_LARGE:'The uploaded file is too large for secure analysis.'};return new Error(messages[code]||data?.error||`AI service error (${status}).`)}

  async function callFunction(body){
    if(!config.functionUrl)throw new Error('The AI connection has not been activated yet.');
    const platform=window.AC_PLATFORM_CONFIG||{};
    if(window.ACPriceCatalogue){await window.ACPriceCatalogue.ready;window.ACPriceCatalogue.requireVerified(state.trade);window.ACPriceCatalogue.applyToCatalogues(CATALOGS)}
    if(platform.requireLoginForAI&&window.ACAuth){await window.ACAuth.ready;if(!window.ACAuth.isSignedIn())throw new Error('Sign in from the Account button before using AI plan analysis.')}
    const authHeaders=window.ACAuth?await window.ACAuth.headers():{};
    let response;try{response=await fetch(config.functionUrl,{method:'POST',headers:{'Content-Type':'application/json','apikey':config.publishableKey||'',...authHeaders},body:JSON.stringify(body)})}catch(_){throw new Error('The secure AI service could not be reached. Check the connection and try again; both plans remain selected.')}
    const data=await response.json().catch(()=>({}));if(!response.ok)throw aiError(data,response.status);return data;
  }

  $('chatForm').addEventListener('submit',async event=>{
    event.preventDefault();if(state.busy)return;
    const input=$('chatInput'),question=input.value.trim();if(!question)return;
    if(!state.plans.existing.file)return showError('Upload the Existing / Before plan before comparing.');
    if(!state.plans.proposed.file)return showError('Upload the Proposed / Future plan before comparing.');
    addMessage(question,'user');input.value='';setBusy(true);
    const thinking=addThinking();
    try{
      const shouldAnalyse=!state.responseId||/calculate|estimate|extract|count|analyse|analyze|scan|محاسبه|قیمت|شمار/i.test(question);
      let data;
      if(shouldAnalyse){
        if(!state.plans.existing.data)state.plans.existing.data=await readFile(state.plans.existing.file);
        if(!state.plans.proposed.data)state.plans.proposed.data=await readFile(state.plans.proposed.file);
        data=await callFunction({mode:'compare',scanMode:state.method,priceMode:state.priceMode,trade:state.trade,existingFileData:state.plans.existing.data,existingFileName:state.plans.existing.file.name,existingFileType:inferFileType(state.plans.existing.file),proposedFileData:state.plans.proposed.data,proposedFileName:state.plans.proposed.file.name,proposedFileType:inferFileType(state.plans.proposed.file),question});
        state.responseId=data.responseId||null;state.analysis=data.analysis;
        if(state.analysis){state.analysis.method=state.method;state.analysis.confidence=state.method==='fast'?'Medium — check every count':'Higher — still requires trade review'}
        removeThinking(thinking);renderAnalysis(data.analysis);
        if(data.analysis?.status==='success')window.ACAnalytics?.track?.('estimate_completed','ai-plan-estimator');
      }else{
        data=await callFunction({mode:'question',trade:state.trade,previousResponseId:state.responseId,question});
        state.responseId=data.responseId||state.responseId;removeThinking(thinking);addMessage(data.answer||'No answer was returned.','assistant');
      }
    }catch(error){removeThinking(thinking);addMessage(`I could not complete the request: ${error.message}`,'failure')}
    finally{setBusy(false);input.focus()}
  });

  function setBusy(value){state.busy=value;$('sendBtn').disabled=value;document.querySelectorAll('.trade,.method,.price-mode,#existingPlanFile,#proposedPlanFile,.remove-file').forEach(x=>x.disabled=value)}
  function addMessage(text,type){
    const row=document.createElement('div');row.className=`message-row ${type}`;row.innerHTML=`<div class="avatar">${type==='user'?'YOU':type==='failure'?'!':'AI'}</div><div class="bubble"></div>`;row.querySelector('.bubble').textContent=text;$('messages').appendChild(row);scrollMessages();return row;
  }
  function addThinking(){
    const label=state.method==='fast'?'Comparing both legends and visible symbols':'Reviewing both plans page by page, symbol by symbol';
    const row=document.createElement('div');row.className='message-row assistant';row.innerHTML=`<div class="avatar">${state.method==='fast'?'FS':'AI'}</div><div class="bubble"><div class="thinking"><i></i><i></i><i></i><span>${label}</span></div><small class="elapsed">0 seconds</small></div>`;$('messages').appendChild(row);startTime=Date.now();timerId=setInterval(()=>{const el=row.querySelector('.elapsed');if(el)el.textContent=`${Math.floor((Date.now()-startTime)/1000)} seconds`},1000);scrollMessages();return row;
  }
  function updateThinking(row,label,progress){if(!row)return;const text=row.querySelector('.thinking span');if(text)text.textContent=`${label||'Scanning plan'}${Number.isFinite(progress)?` • ${progress}%`:''}`}
  function removeThinking(row){clearInterval(timerId);if(row)row.remove()}

  function renderAnalysis(analysis){
    if(!analysis)return addMessage('The AI response was incomplete. Please try again.','failure');
    if(analysis.status!=='success')return renderMissing();
    const catalog=current(),merged=new Map();
    state.symbols=(Array.isArray(analysis.symbols)?analysis.symbols:[]).map(symbol=>({
      symbol_label:String(symbol.symbol_label||symbol.description||'Plan symbol'),description:String(symbol.description||''),added_catalog_index:Number(symbol.added_catalog_index),removed_catalog_index:Number(symbol.removed_catalog_index),moved_catalog_index:Number(symbol.moved_catalog_index),
      existing_quantity:Math.max(0,Number(symbol.existing_quantity)||0),proposed_quantity:Math.max(0,Number(symbol.proposed_quantity)||0),unchanged_quantity:Math.max(0,Number(symbol.unchanged_quantity)||0),
      added_quantity:Math.max(0,Number(symbol.added_quantity)||0),removed_quantity:Math.max(0,Number(symbol.removed_quantity)||0),moved_quantity:Math.max(0,Number(symbol.moved_quantity)||0),
      confidence:['high','medium','low'].includes(symbol.confidence)?symbol.confidence:'low',existing_evidence:String(symbol.existing_evidence||''),proposed_evidence:String(symbol.proposed_evidence||'')
    })).filter(symbol=>symbol.existing_quantity||symbol.proposed_quantity||symbol.added_quantity||symbol.removed_quantity||symbol.moved_quantity);
    (analysis.items||[]).forEach(item=>{
      const index=Number(item.catalog_index);if(!Number.isInteger(index)||index<0||index>=catalog.items.length)return;
      const action=['added','removed','moved'].includes(item.action)?item.action:'added',key=`${action}:${index}`;
      const raw=Math.max(0,Number(item.quantity)||0);const quantity=catalog.decimal?Math.round(raw*100)/100:Math.round(raw);if(!quantity)return;
      const fields={existing_quantity:Math.max(0,Number(item.existing_quantity)||0),proposed_quantity:Math.max(0,Number(item.proposed_quantity)||0),added_quantity:Math.max(0,Number(item.added_quantity)||(action==='added'?quantity:0)),removed_quantity:Math.max(0,Number(item.removed_quantity)||(action==='removed'?quantity:0)),moved_quantity:Math.max(0,Number(item.moved_quantity)||(action==='moved'?quantity:0))};
      if(merged.has(key)){const old=merged.get(key);old.quantity+=quantity;Object.keys(fields).forEach(field=>old[field]+=fields[field]);old.evidence=[old.evidence,item.evidence].filter(Boolean).join(' / ');if(item.confidence==='low')old.confidence='low';else if(item.confidence==='medium'&&old.confidence==='high')old.confidence='medium'}
      else merged.set(key,{action,catalog_index:index,quantity,...fields,evidence:item.evidence||`${action} scope identified from the plan comparison.`,confidence:['high','medium','low'].includes(item.confidence)?item.confidence:'low'});
    });
    const actionOrder={added:0,removed:1,moved:2};state.items=Array.from(merged.values()).sort((a,b)=>(actionOrder[a.action]-actionOrder[b.action])||(a.catalog_index-b.catalog_index));
    if(!state.items.length&&!state.symbols.length)return renderMissing();
    addMessage(analysis.summary||`I compared both ${catalog.label.toLowerCase()} plans and prepared a change schedule.`,'assistant');
    createResultCard(analysis);scrollMessages();
  }

  function renderMissing(){
    const trade=current().label;
    const descriptions={electrical:'an Electrical layout, symbols or legend',plumbing:'a Plumbing/Hydraulic layout showing the required plumbing scope',cladding:'elevations or a material schedule showing measurable cladding areas and dimensions'};
    addMessage(`I couldn’t compare the ${trade} work because one or both uploaded files do not contain ${descriptions[state.trade]}. Upload matching Existing and Proposed ${trade} sheets, including their legends. No price has been produced.`,'failure');
    const card=document.createElement('div');card.className='missing-card';card.innerHTML=`<strong>Matching ${esc(trade)} plans not found</strong>Both files must show enough ${esc(trade.toLowerCase())} information to compare reliably. Request the relevant Existing and Proposed trade drawings from the Builder before estimating.`;$('messages').appendChild(card);scrollMessages();
  }

  function createResultCard(analysis){
    const catalog=current(),card=document.createElement('section');card.className='result-card';card.dataset.resultTrade=state.trade;
    const initial=state.items.map(item=>({...item}));cardData.set(card,{trade:state.trade,priceMode:state.priceMode,symbols:state.symbols.map(item=>({...item})),items:initial.map(item=>({...item})),originalItems:initial,analysis:JSON.parse(JSON.stringify(analysis||{})),responseId:state.responseId,generatedAt:new Date().toISOString()});
    const comparisonRows=state.symbols.map(symbol=>`<div class="comparison-row"><div class="symbol-name"><strong>${esc(symbol.symbol_label)}</strong><small>${esc(symbol.description||[symbol.existing_evidence,symbol.proposed_evidence].filter(Boolean).join(' / '))}</small><span class="line-confidence ${esc(symbol.confidence)}">${esc(symbol.confidence)} confidence</span></div><span>${symbol.existing_quantity}</span><span>${symbol.proposed_quantity}</span><span class="change-add">+${symbol.added_quantity}</span><span class="change-remove">−${symbol.removed_quantity}</span><span class="change-move">${symbol.moved_quantity}</span></div>`).join('');
    const rows=state.items.map((item,index)=>{const product=catalog.items[item.catalog_index],step=catalog.decimal?'0.01':'1',action=item.action||'added';return `<div class="detected-row" data-item="${index}"><div class="detected-name"><strong><span class="action-badge ${esc(action)}">${esc(action)}</span>${esc(product[0])}</strong><small><span class="line-confidence ${esc(item.confidence)}">${esc(item.confidence)} confidence</span>${esc(item.evidence)}</small></div><div class="quantity"><button type="button" data-step="-${step}">−</button><input type="number" min="0" step="${step}" value="${item.quantity}" aria-label="Quantity"><button type="button" data-step="${step}">+</button></div><div class="line-price">${money(product[1]*item.quantity)}</div></div>`}).join('');
    const assumptions=(analysis.assumptions||[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>No additional assumptions listed.</li>';
    const warnings=[...(analysis.warnings||[]),...(analysis.unpriced_items||[]).map(x=>`Unpriced: ${x}`)].map(x=>`<li>${esc(x)}</li>`).join('')||'<li>Confirm all quantities with the Builder and relevant trade.</li>';
    const method=analysis.method==='fast'?'Fast Vision':'Smart Review';const confidence=analysis.confidence||(analysis.method==='fast'?'Medium — check every count':'Higher — still requires trade review');
    const legendGroups={existing:[],proposed:[]};(analysis.legend_findings||[]).forEach(item=>{if(legendGroups[item.plan])legendGroups[item.plan].push(item)});
    const legendHtml=['existing','proposed'].map(kind=>{const findings=legendGroups[kind],label=kind==='existing'?'Existing legend read':'Proposed legend read',lines=findings.slice(0,10).map(item=>`<span><b>${esc(item.symbol_label)}</b> = ${esc(item.meaning)} <em>${esc(item.confidence||'low')}</em></span>`).join('');return `<div><strong>${label}</strong>${lines||'<span>No separate legend entry was returned.</span>'}${findings.length>10?`<small>+ ${findings.length-10} more legend entries</small>`:''}</div>`}).join('');
    const comparison=comparisonRows?`<div class="comparison-table"><div class="comparison-caption"><strong>Symbol change schedule</strong><small>Counts are read from each drawing’s own legend and matched by symbol and location.</small></div><div class="comparison-head"><span>Plan symbol</span><span>Existing</span><span>Proposed</span><span>Added</span><span>Removed</span><span>Moved</span></div>${comparisonRows}</div>`:'<div class="empty-pricing">No reliable symbol comparison was returned.</div>';
    const pricing=rows?`<div class="pricing-heading"><strong>Priced work from the comparison</strong><small>Added, removed and moved work is priced only where an exact verified catalogue action rate exists. Every quantity remains editable.</small></div><div class="detected-list">${rows}</div>`:'<div class="empty-pricing"><strong>No verified action rate matched</strong><span>The change schedule is still shown above. Add the missing removal or relocation rate to the catalogue before relying on a final price.</span></div>';
    card.innerHTML=`<div class="result-top"><h3>${esc(catalog.label)} Existing vs Proposed</h3><p>Each recognised icon is matched to a real Alert Construction catalogue item. An action is priced only when the catalogue contains a suitable added, removal/replacement or alteration rate.</p><span class="result-method">${esc(method)}</span><span class="confidence">${esc(confidence)}</span></div><div class="legend-read">${legendHtml}</div>${comparison}<div class="totals pricing-totals"><div class="total-box"><span>Trade subtotal ex GST</span><strong data-subtotal>$0.00</strong><small>All verified priced actions</small></div><div class="total-box"><span data-margin-title>Builder margin (20%)</span><strong data-profit>$0.00</strong><small data-margin-note>Applied before GST</small></div><div class="total-box"><span data-final-title>Builder quote inc GST</span><strong data-final-total>$0.00</strong><small data-final-note>Includes margin and 10% GST</small></div></div>${pricing}<div class="result-notes"><div><strong>Assumptions</strong><ul>${assumptions}</ul></div><div><strong>Builder Check</strong><ul>${warnings}</ul></div></div><div class="result-actions"><button class="open-calculator" type="button" ${state.items.length?'':'disabled'}>Open ${esc(catalog.label)} Calculator →</button></div>`;
    $('messages').appendChild(card);bindResultCard(card);updateCard(card);
  }

  function bindResultCard(card){
    const data=cardData.get(card),catalog=CATALOGS[data.trade];
    card.querySelectorAll('.detected-row').forEach(row=>{const input=row.querySelector('input'),index=Number(row.dataset.item);input.addEventListener('input',()=>{const n=Math.max(0,Number(input.value)||0);data.items[index].quantity=catalog.decimal?Math.round(n*100)/100:Math.round(n);input.value=data.items[index].quantity;row.querySelector('.line-price').textContent=money(catalog.items[data.items[index].catalog_index][1]*data.items[index].quantity);updateCard(card)});row.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{input.value=Math.max(0,Number(input.value||0)+Number(button.dataset.step));input.dispatchEvent(new Event('input'))}))});
    const calculator=card.querySelector('.open-calculator');if(calculator&&!calculator.disabled)calculator.addEventListener('click',()=>transferToCalculator(card));
  }
  function totalsFor(card){const data=cardData.get(card),catalog=CATALOGS[data.trade],base=data.items.reduce((sum,item)=>sum+catalog.items[item.catalog_index][1]*item.quantity,0),customer=base*(1+GST),builderProfit=base*PROFIT,builder=(base+builderProfit)*(1+GST),profit=data.priceMode==='builder'?builderProfit:0,quoteExGst=base+profit,gst=quoteExGst*GST;return{base,profit,gst,customer,builder,total:data.priceMode==='builder'?builder:customer}}
  function updateCard(card){const data=cardData.get(card),value=totalsFor(card),builder=data.priceMode==='builder';card.querySelector('[data-subtotal]').textContent=money(value.base);card.querySelector('[data-profit]').textContent=money(value.profit);card.querySelector('[data-final-total]').textContent=money(value.total);card.querySelector('[data-margin-title]').textContent=builder?'Builder margin (20%)':'Builder margin (not applied)';card.querySelector('[data-margin-note]').textContent=builder?'Applied before GST':'Customer Direct mode';card.querySelector('[data-final-title]').textContent=builder?'Builder quote inc GST':'Customer direct total inc GST';card.querySelector('[data-final-note]').textContent=builder?'Includes 20% margin and 10% GST':'Includes 10% GST only'}
  function transferToCalculator(card){const data=cardData.get(card),catalog=CATALOGS[data.trade],quantities=Array(catalog.items.length).fill(0);data.items.forEach(item=>quantities[item.catalog_index]+=item.quantity);const name=state.plans.proposed.file?state.plans.proposed.file.name.replace(/\.[^.]+$/,''):`AI ${catalog.label} Comparison`;localStorage.setItem(catalog.storage,JSON.stringify({quantities,project:name,mode:data.priceMode,createdAt:new Date().toISOString()}));window.location.href=catalog.path}
  window.ACProjectCapture=async function(){
    const cards=document.querySelectorAll('.result-card'),card=cards[cards.length-1];if(!card)throw new Error('Complete a plan estimate before saving it.');
    const saved=cardData.get(card),totals=totalsFor(card),analysis=saved.analysis||{},name=state.plans.proposed.file?state.plans.proposed.file.name.replace(/\.[^.]+$/,''):'Plan comparison',savedAt=new Date().toISOString(),actor=window.ACAuth?.user()?.email||'Local user',changes=saved.items.map((item,index)=>({catalog_index:item.catalog_index,from:saved.originalItems[index]?.quantity,to:item.quantity,correctedAt:savedAt,correctedBy:actor})).filter(item=>item.from!==item.to);
    return{module:'plan-estimate',title:name+' — '+CATALOGS[saved.trade].label+' Plan Comparison',summary:saved.symbols.length+' compared symbols • '+saved.items.length+' priced actions • '+money(totals.total)+' '+saved.priceMode+' total',attachments:[state.plans.existing.file,state.plans.proposed.file].filter(Boolean),data:{trade:saved.trade,method:analysis.method||state.method,priceMode:saved.priceMode,planFiles:{existing:state.plans.existing.file?.name||'',proposed:state.plans.proposed.file?.name||''},symbols:saved.symbols,items:saved.items,analysis:analysis,subtotalExGst:totals.base,profitAmount:totals.profit,gstAmount:totals.gst,finalTotalIncGst:totals.total,builderTotalIncGst:totals.builder,customerTotalIncGst:totals.customer,catalogueAudit:window.ACPriceCatalogue?.security?.()||null,audit:{generatedAt:saved.generatedAt,responseId:saved.responseId,generatedBy:actor,originalItems:saved.originalItems,humanChanges:changes,savedAt,savedBy:actor}}};
  };
})();
