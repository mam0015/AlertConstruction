(function(){
  'use strict';
  const $=id=>document.getElementById(id),DRAFT_KEY='ac_property_estimate_draft_v2',RESTORE_KEY='ac_project_property_restore_v1',ENGINE_VERSION='vic-local-sales-2025-v2';
  const BENCHMARK_DATE='2025-12-31',SALES=window.ACVictoriaSalesData||{suburbs:{}},SUBURBS=SALES.suburbs||{};
  const TYPICAL={house:{bedrooms:3,bathrooms:2,carSpaces:1,landArea:500,floorArea:160},townhouse:{bedrooms:3,bathrooms:2,carSpaces:1,landArea:250,floorArea:130},unit:{bedrooms:2,bathrooms:1,carSpaces:1,landArea:null,floorArea:80}};
  const CONDITION={major:-.10,dated:-.05,average:0,renovated:.05,premium:.08};
  const CONDITION_LABEL={major:'Needs major work',dated:'Dated / mostly original',average:'Average maintained',renovated:'Recently renovated',premium:'Premium renovation / finish'};
  const IDS=['estimateName','suburb','postcode','region','propertyType','suburbMedian','benchmarkDate','marketTrend','bedrooms','bathrooms','carSpaces','landArea','floorArea','yearBuilt','condition','levels','titleType','landShape','slope','frontage','notes','followUpDate'];
  const CHECKS=['outdoor','landscaping','pool','solar'];
  let comparableCount=0,selectedFiles=[],lastResult=null,recordRef=null;

  const number=value=>value===''||value==null?null:(Number.isFinite(Number(value))?Number(value):null);
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const money=value=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(value||0);
  const shortDate=value=>{if(!value)return'Not supplied';const d=new Date(value+'T00:00:00');return Number.isNaN(d.getTime())?value:d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const median=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2};
  const round5=value=>Math.round(value/5000)*5000;
  const ratioAdjustment=(subject,reference,elasticity,min,max)=>subject&&reference?clamp(Math.pow(subject/reference,elasticity),min,max):1;
  const normalizeSuburb=value=>String(value||'').trim().toUpperCase().replace(/\bSAINT\b/g,'ST').replace(/\bMT\b/g,'MOUNT').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const titleCase=value=>String(value||'').toLowerCase().replace(/(^|[\s'-])\p{L}/gu,char=>char.toUpperCase());
  const SUBURB_KEYS=Object.keys(SUBURBS);

  function localRecord(value){const key=normalizeSuburb(value);return key&&SUBURBS[key]?{key,entry:SUBURBS[key]}:null}
  function localSuggestions(value){const key=normalizeSuburb(value);if(key.length<3)return[];const words=key.split(' ');return SUBURB_KEYS.filter(name=>name.startsWith(key)||key.startsWith(name)||words.every(word=>name.includes(word))).slice(0,5)}
  function seriesEvidence(series){
    if(!series)return null;const annual=number(series[0]),quarter=number(series[1]),q4Sales=number(series[2])||0,yearSales=number(series[3])||0,lowSample=!!series[4];if(!annual&&!quarter)return null;
    const quarterWeight=annual&&quarter?(lowSample||q4Sales<10?.15:q4Sales>=30?.35:.25):(quarter?1:0),value=annual&&quarter?annual*(1-quarterWeight)+quarter*quarterWeight:(annual||quarter);
    return{value,annual,quarter,q4Sales,yearSales,lowSample,quarterWeight};
  }
  function officialEvidence(state){
    const record=localRecord(state.suburb);if(!record)return null;const house=seriesEvidence(record.entry.h),unit=seriesEvidence(record.entry.u),type=state.propertyType;
    if(type==='house'&&house)return{...house,key:record.key,kind:'house',modelled:false};
    if(type==='unit'&&unit)return{...unit,key:record.key,kind:'unit',modelled:false};
    if(type==='townhouse'){
      if(house&&unit){const houseWeight=state.titleType==='standalone'?.68:(state.titleType==='owners'||state.titleType==='shared')?.35:.52;return{value:house.value*houseWeight+unit.value*(1-houseWeight),annual:house.annual&&unit.annual?house.annual*houseWeight+unit.annual*(1-houseWeight):null,quarter:house.quarter&&unit.quarter?house.quarter*houseWeight+unit.quarter*(1-houseWeight):null,q4Sales:house.q4Sales+unit.q4Sales,yearSales:house.yearSales+unit.yearSales,lowSample:house.lowSample&&unit.lowSample,key:record.key,kind:'townhouse',modelled:true,houseWeight}}
      const available=house||unit;if(available)return{...available,value:available.value*(house ? .90 : 1.05),key:record.key,kind:'townhouse',modelled:true};
    }
    return null;
  }

  function addComparable(value={}){
    if(comparableCount>=5)return;
    const index=++comparableCount,card=document.createElement('article');card.className='comparable';card.dataset.comparable=String(index);
    card.innerHTML=`<div class="comp-head"><strong>Comparable ${index}</strong><button type="button" data-remove>Remove</button></div><div class="comp-grid">
      <div class="comp-field comp-address"><label>Address / description</label><input class="comp-address-value" value="${esc(value.address||'')}" placeholder="Same suburb or nearby"></div>
      <div class="comp-field"><label>Sold price</label><input class="comp-price" type="number" min="0" step="5000" inputmode="decimal" value="${esc(value.price??'')}" placeholder="$"></div>
      <div class="comp-field"><label>Sale date</label><input class="comp-date" type="date" value="${esc(value.date||'')}"></div>
      <div class="comp-field"><label>Bedrooms</label><input class="comp-bedrooms" type="number" min="0" max="20" step="1" value="${esc(value.bedrooms??'')}" placeholder="Beds"></div>
      <div class="comp-field"><label>Bathrooms</label><input class="comp-bathrooms" type="number" min="0" max="15" step="0.5" value="${esc(value.bathrooms??'')}" placeholder="Baths"></div>
      <div class="comp-field"><label>Car spaces</label><input class="comp-cars" type="number" min="0" max="12" step="1" value="${esc(value.carSpaces??'')}" placeholder="Cars"></div>
      <div class="comp-field"><label>Land m²</label><input class="comp-land" type="number" min="0" step="1" value="${esc(value.landArea??'')}" placeholder="Land"></div>
      <div class="comp-field"><label>Floor m²</label><input class="comp-floor" type="number" min="0" step="1" value="${esc(value.floorArea??'')}" placeholder="Floor"></div>
      <div class="comp-field"><label>Condition</label><select class="comp-condition"><option value="">Unknown</option>${Object.entries(CONDITION_LABEL).map(([key,label])=>`<option value="${key}" ${value.condition===key?'selected':''}>${label}</option>`).join('')}</select></div>
    </div>`;
    $('comparables').appendChild(card);card.querySelector('[data-remove]').addEventListener('click',()=>{card.remove();renumberComparables()});
  }

  function renumberComparables(){const cards=[...document.querySelectorAll('[data-comparable]')];comparableCount=cards.length;cards.forEach((card,index)=>{card.dataset.comparable=String(index+1);card.querySelector('.comp-head strong').textContent=`Comparable ${index+1}`})}
  function readComparables(){return[...document.querySelectorAll('[data-comparable]')].map(card=>({address:card.querySelector('.comp-address-value').value.trim(),price:number(card.querySelector('.comp-price').value),date:card.querySelector('.comp-date').value,bedrooms:number(card.querySelector('.comp-bedrooms').value),bathrooms:number(card.querySelector('.comp-bathrooms').value),carSpaces:number(card.querySelector('.comp-cars').value),landArea:number(card.querySelector('.comp-land').value),floorArea:number(card.querySelector('.comp-floor').value),condition:card.querySelector('.comp-condition').value}));}
  function readState(){const state={};IDS.forEach(id=>{state[id]=$(id).value});CHECKS.forEach(id=>{state[id]=$(id).checked});state.comparables=readComparables();return state}
  function writeState(state={}){IDS.forEach(id=>{if(state[id]!==undefined&&state[id]!==null)$(id).value=state[id]});CHECKS.forEach(id=>{$(id).checked=!!state[id]});$('comparables').innerHTML='';comparableCount=0;(Array.isArray(state.comparables)&&state.comparables.length?state.comparables:[{},{},{}]).slice(0,5).forEach(addComparable);updateLocalStatus()}

  function updateLocalStatus(){
    const status=$('localDataStatus');if(!status)return;const suburb=$('suburb').value.trim(),state={suburb,propertyType:$('propertyType').value,titleType:$('titleType')?.value||''};status.className='local-status';
    if(!suburb){status.textContent='Start typing a Victorian suburb to check the official local sales data.';return}
    const evidence=officialEvidence(state);if(evidence){status.classList.add('found');status.textContent=`Official ${evidence.modelled?'modelled townhouse':'local '+evidence.kind} evidence found for ${titleCase(evidence.key)}: 2025 annual ${money(evidence.annual)}${evidence.quarter?` • Oct–Dec ${money(evidence.quarter)} (${evidence.q4Sales} sales)`:''}.`;return}
    const suggestions=localSuggestions(suburb);status.classList.add('missing');status.textContent=suggestions.length?`No exact official match. Did you mean ${suggestions.map(titleCase).join(', ')}?`:'No matching official local data was found. Check the spelling or provide a verified local median or comparable sales.';
  }

  function validate(state){
    if(!state.suburb.trim()){showStep(1);$('suburb').focus();throw new Error('Enter the Victorian suburb to calculate the value guide.')}
    if(state.postcode&&!/^(3\d{3}|8\d{3})$/.test(state.postcode.trim())){showStep(1);$('postcode').focus();throw new Error('Enter a valid 4-digit Victorian postcode, or leave it blank.')}
    if(number(state.suburbMedian)&&!state.benchmarkDate){showStep(1);$('benchmarkDate').focus();throw new Error('Enter the date of the independent suburb median, or remove that median and use the built-in official local data.')}
  }

  function featureAdjustment(state){
    const typical=TYPICAL[state.propertyType]||TYPICAL.house,items=[];let raw=0;
    const add=(rate,label)=>{if(!rate)return;raw+=rate;items.push({label,rate})};
    const diff=(key,rate,cap,label)=>{const value=number(state[key]);if(value===null)return;add(clamp((value-typical[key])*rate,-cap,cap),`${label}: ${value}`)};
    diff('bedrooms',.02,.06,'Bedrooms');diff('bathrooms',.015,.045,'Bathrooms');diff('carSpaces',.01,.03,'Car spaces');
    const land=number(state.landArea);if(land&&typical.landArea)add(clamp(Math.pow(land/typical.landArea,.08)-1,-.07,.07),`Land area: ${land} m²`);
    const floor=number(state.floorArea);if(floor&&typical.floorArea)add(clamp(Math.pow(floor/typical.floorArea,.10)-1,-.08,.08),`Floor area: ${floor} m²`);
    if(state.condition)add(CONDITION[state.condition]||0,CONDITION_LABEL[state.condition]);
    add({corner:.015,irregular:-.015,battleaxe:-.02}[state.landShape]||0,{corner:'Corner site',irregular:'Irregular land shape',battleaxe:'Battle-axe / rear site'}[state.landShape]);
    add({moderate:-.02,steep:-.04}[state.slope]||0,{moderate:'Moderate site slope',steep:'Steep site slope'}[state.slope]);
    add({narrow:-.015,wide:.015}[state.frontage]||0,{narrow:'Narrow frontage',wide:'Wide frontage'}[state.frontage]);
    if((state.propertyType==='townhouse'||state.propertyType==='unit')&&state.titleType==='standalone')add(.015,'Standalone title');if(state.titleType==='shared')add(-.02,'Shared land / common driveway');
    if(state.outdoor)add(.01,'Covered outdoor area');if(state.landscaping)add(.005,'Established landscaping');if(state.pool)add(.015,'Compliant pool / spa');if(state.solar)add(.005,'Solar / energy upgrades');
    const total=clamp(raw,-.18,.18);if(Math.abs(raw-total)>.001)items.push({label:'Combined adjustment safety cap',rate:total-raw});return{factor:1+total,total,items};
  }

  function timeFactor(saleDate,annualTrend){
    const trend=clamp(number(annualTrend)||0,-15,15);if(!saleDate||!trend)return 1;const date=new Date(saleDate+'T00:00:00'),now=new Date();if(Number.isNaN(date.getTime()))return 1;const years=clamp((now-date)/(365.25*86400000),0,3);return clamp(Math.pow(1+trend/100,years),.85,1.15);
  }

  function adjustComparable(comp,state){
    let raw=timeFactor(comp.date,state.marketTrend)-1;const notes=[];
    const add=(rate,label)=>{if(!rate)return;raw+=rate;notes.push(`${label} ${rate>=0?'+':''}${(rate*100).toFixed(1)}%`)};
    if(Math.abs(raw)>.001)notes.push(`Market timing ${raw>=0?'+':''}${(raw*100).toFixed(1)}%`);
    const subjectLand=number(state.landArea),subjectFloor=number(state.floorArea);
    if(subjectLand&&comp.landArea)add(clamp(Math.pow(subjectLand/comp.landArea,.12)-1,-.10,.10),'land');
    if(subjectFloor&&comp.floorArea)add(clamp(Math.pow(subjectFloor/comp.floorArea,.18)-1,-.12,.12),'floor');
    [['bedrooms',.015,.045,'beds'],['bathrooms',.01,.03,'baths'],['carSpaces',.0075,.0225,'cars']].forEach(([key,rate,cap,label])=>{const subject=number(state[key]);if(subject===null||comp[key]===null)return;add(clamp((subject-comp[key])*rate,-cap,cap),label)});
    if(state.condition&&comp.condition)add(clamp((CONDITION[state.condition]||0)-(CONDITION[comp.condition]||0),-.10,.10),'condition');
    const total=clamp(raw,-.22,.22),factor=1+total;if(Math.abs(raw-total)>.001)notes.push('combined adjustment capped for reliability');return{...comp,factor,adjusted:comp.price*factor,notes,used:true,excludedReason:''};
  }

  function removeComparableOutliers(comparables){
    if(comparables.length<3)return comparables;const centre=median(comparables.map(comp=>comp.adjusted)),candidates=comparables.filter(comp=>Math.abs(comp.adjusted/centre-1)<=.25);if(candidates.length<2)return comparables;return comparables.map(comp=>candidates.includes(comp)?comp:{...comp,used:false,excludedReason:'Outside 25% of the comparable-sale centre'});
  }

  function missingEvidence(state,validComps,official){
    const missing=[],used=validComps.filter(comp=>comp.used!==false);if(used.length<3)missing.push(`${3-used.length} more recent comparable sale${3-used.length===1?'':'s'}`);if(!official&&!number(state.suburbMedian))missing.push('Verified matching-suburb median');if(validComps.length&&validComps.some(comp=>!comp.date))missing.push('Sale dates for every comparable');if(number(state.bedrooms)===null)missing.push('Bedrooms');if(number(state.bathrooms)===null)missing.push('Bathrooms');if(number(state.landArea)===null&&state.propertyType!=='unit')missing.push('Land area');if(number(state.floorArea)===null)missing.push('Floor area');if(!state.condition)missing.push('Condition / renovation level');if(state.propertyType==='townhouse'&&!state.titleType)missing.push('Townhouse title / land arrangement');return missing;
  }

  function calculateValue(input){
    const state=input||readState();validate(state);const validComps=(state.comparables||[]).filter(comp=>number(comp.price)>0).map(comp=>({...comp,price:number(comp.price),bedrooms:number(comp.bedrooms),bathrooms:number(comp.bathrooms),carSpaces:number(comp.carSpaces),landArea:number(comp.landArea),floorArea:number(comp.floorArea)}));
    const official=officialEvidence(state),supplied=number(state.suburbMedian),features=featureAdjustment(state);let adjustedComps=removeComparableOutliers(validComps.map(comp=>adjustComparable(comp,state))),usedComps=adjustedComps.filter(comp=>comp.used!==false);
    if(!official&&!supplied&&!usedComps.length){const suggestions=localSuggestions(state.suburb);throw new Error(suggestions.length?`No exact local sales match was found for “${state.suburb}”. Try ${suggestions.map(titleCase).join(', ')}, or add a verified local median or recent comparable sales.`:`No reliable local evidence was found for “${state.suburb}”. Check the suburb spelling, or add a verified local median or recent comparable sales.`)}
    const officialTimed=official?official.value*timeFactor(BENCHMARK_DATE,state.marketTrend):null,suppliedTimed=supplied?supplied*timeFactor(state.benchmarkDate,state.marketTrend):null;
    let localBase=null,localSource='',discrepancy=false;if(officialTimed&&suppliedTimed){localBase=officialTimed*.30+suppliedTimed*.70;discrepancy=Math.abs(suppliedTimed/officialTimed-1)>.25;localSource=`verified independent median plus official ${titleCase(official.key)} sales evidence`}else if(officialTimed){localBase=officialTimed;localSource=`official ${titleCase(official.key)} ${official.modelled?'modelled townhouse':'local '+official.kind} sales evidence`}else if(suppliedTimed){localBase=suppliedTimed;localSource='verified independent matching-suburb median'}
    const localAdjusted=localBase?localBase*features.factor:null,compBase=usedComps.length?median(usedComps.map(comp=>comp.adjusted)):null;let midpoint,method,source,rangeRate,baseConfidence;
    if(compBase&&localAdjusted){const compWeight=usedComps.length>=3?.75:usedComps.length===2?.65:.45;midpoint=compBase*compWeight+localAdjusted*(1-compWeight);method='local-and-comparables';source=`${usedComps.length} adjusted comparable sale${usedComps.length===1?'':'s'} blended with ${localSource}`;rangeRate=usedComps.length>=3?.07:usedComps.length===2?.09:.12;baseConfidence=usedComps.length>=3?82:usedComps.length===2?73:63}
    else if(compBase){midpoint=compBase;method='comparable-sales';source=`${usedComps.length} adjusted comparable sale${usedComps.length===1?'':'s'}`;rangeRate=usedComps.length>=3?.09:usedComps.length===2?.13:.19;baseConfidence=usedComps.length>=3?75:usedComps.length===2?60:42}
    else{midpoint=localAdjusted;method=official?(supplied?'official-and-independent':'official-suburb'):'independent-suburb';source=localSource;rangeRate=official?(supplied?.13:.15):.17;baseConfidence=official?(supplied?60:55):45}
    const today=Date.now(),undated=usedComps.filter(comp=>!comp.date).length,old=usedComps.filter(comp=>comp.date&&today-new Date(comp.date+'T00:00:00').getTime()>548*86400000).length;if(undated){rangeRate+=.015;baseConfidence-=3}if(old){rangeRate+=.025;baseConfidence-=6}if(official?.modelled){rangeRate+=.025;baseConfidence-=8}if(official?.lowSample){rangeRate+=.02;baseConfidence-=6}if(discrepancy){rangeRate+=.025;baseConfidence-=8}
    const missing=missingEvidence(state,adjustedComps,official),filled=[state.bedrooms,state.bathrooms,state.carSpaces,state.landArea,state.floorArea,state.condition,state.landShape,state.slope].filter(value=>value!==''&&value!=null).length;
    let confidence=baseConfidence+Math.min(8,filled)+(usedComps.length&&usedComps.every(comp=>comp.date)?3:0);confidence=Math.round(clamp(confidence,25,88));rangeRate=clamp(rangeRate+Math.min(.04,missing.length*.004),.065,.24);midpoint=round5(midpoint);const low=round5(midpoint*(1-rangeRate)),high=round5(midpoint*(1+rangeRate));
    const label=confidence>=78?'Strong market guide':confidence>=60?'Moderate market guide':confidence>=42?'Indicative guide':'Limited-evidence guide';
    const comparableDates=usedComps.map(comp=>comp.date).filter(Boolean).sort(),evidenceDate=comparableDates.at(-1)||(supplied?state.benchmarkDate:BENCHMARK_DATE);
    return{engineVersion:ENGINE_VERSION,midpoint,low,high,rangeRate,confidence,label,method,source,benchmark:compBase||localBase,benchmarkDate:evidenceDate,adjustments:localBase?features.items:[],featureAdjustment:features.total,comparables:adjustedComps,missing,calculatedAt:new Date().toISOString(),localEvidence:{key:official?.key||normalizeSuburb(state.suburb),officialValue:officialTimed,annual:official?.annual||null,quarter:official?.quarter||null,q4Sales:official?.q4Sales||0,yearSales:official?.yearSales||0,lowSample:!!official?.lowSample,modelled:!!official?.modelled,supplied:suppliedTimed,localBase,discrepancy},officialBenchmark:official?{date:BENCHMARK_DATE,suburb:official.key,propertyType:official.kind,value:official.value,townhouseModelled:official.modelled}:null};
  }

  function renderResult(result,state){
    const rows=result.adjustments.length?result.adjustments.map(item=>`<div class="result-row"><span>${esc(item.label||'Property factor')}</span><strong>${item.rate>=0?'+':''}${(item.rate*100).toFixed(1)}%</strong></div>`).join(''):'<div class="result-row"><span>No optional property adjustments applied</span><strong>Neutral</strong></div>';
    const comps=result.comparables.length?result.comparables.map((comp,index)=>`<div class="result-row"${comp.used===false?' style="opacity:.62"':''}><span>${esc(comp.address||`Comparable ${index+1}`)} · sold ${money(comp.price)}${comp.date?' · '+shortDate(comp.date):''}${comp.used===false?' · excluded as outlier':''}</span><strong>${money(round5(comp.adjusted))}<small style="display:block;color:${comp.used===false?'#f0b85a':'#999'}">${comp.used===false?esc(comp.excludedReason):comp.notes.length?esc(comp.notes.join(', ')):'No measured adjustment'}</small></strong></div>`).join(''):'<div class="result-row"><span>No comparable sales supplied</span><strong>Local suburb evidence used</strong></div>';
    const local=result.localEvidence||{},localSummary=local.annual?`${titleCase(local.key)} annual median ${money(local.annual)}${local.quarter?` · Oct–Dec ${money(local.quarter)} (${local.q4Sales} sales)`:''}`:local.supplied?`Independent local median ${money(local.supplied)}`:'Comparable sales only';
    const warnings=[];if(local.discrepancy)warnings.push('The independent median differs from the official local evidence by more than 25%, so the range was widened. Recheck that it matches the same suburb and property type.');if(local.modelled)warnings.push('Victoria does not publish a separate townhouse series here. The townhouse starting point is modelled from the local house and unit series, so matching townhouse sales are especially important.');if(local.lowSample)warnings.push('The latest quarter has a low sales count and was given less weight than the annual median.');if(!local.officialValue)warnings.push('No official matching-suburb series was available for this property type. The result relies on the evidence you supplied.');
    $('results').innerHTML=`${warnings.length?`<div class="evidence-warning"><strong>Evidence check</strong>${warnings.map(message=>`<p>${esc(message)}</p>`).join('')}</div>`:''}<div class="result-hero"><div class="estimate-card"><span>Current market value guide · ${esc(state.suburb)}</span><div class="estimate-main">${money(result.midpoint)}</div><div class="estimate-range">Evidence-based range: ${money(result.low)} – ${money(result.high)}</div></div><div class="confidence-card"><span>Evidence confidence</span><strong>${result.confidence}% · ${result.label}</strong><div class="confidence-meter"><i style="width:${result.confidence}%"></i></div><p>The range widens automatically when local sales evidence is limited, old or inconsistent.</p></div></div>
      <div class="evidence-grid"><div class="evidence"><span>Primary evidence</span><strong>${esc(result.source)}</strong></div><div class="evidence"><span>Official local data</span><strong>${esc(localSummary)}</strong></div><div class="evidence"><span>Evidence date</span><strong>${shortDate(result.benchmarkDate)}</strong></div></div>
      <div class="result-grid"><div class="result-box"><h3>Property adjustments</h3><div class="result-list">${rows}</div></div><div class="result-box"><h3>Comparable-sale working</h3><div class="result-list">${comps}</div></div></div>
      <div class="missing"><h3>What would improve this estimate?</h3><p>More complete, verified evidence narrows the range. You can still save this guide with unanswered optional questions.</p><div class="missing-tags">${result.missing.length?result.missing.map(item=>`<span>${esc(item)}</span>`).join(''):'<span>Core evidence is complete—have a professional review it.</span>'}</div></div>
      <div class="disclaimer"><strong>Use the result with the evidence shown above.</strong> The calculator now uses matching Victorian suburb sales data and supplied comparable sales; it no longer substitutes a broad Melbourne or regional median when local evidence is missing. It remains an automated market guide, not an inspection or a formal valuation, and cannot verify hidden defects, title, easements, zoning or whether an entered sale is genuinely comparable. For a transaction, lending or legal decision, confirm the evidence with a licensed estate agent or Certified Practising Valuer.<br><br><a class="source-link" href="https://www.land.vic.gov.au/valuations/resources-and-reports/property-sales-statistics" target="_blank" rel="noopener">Valuer-General Victoria property sales statistics ↗</a> · <a class="source-link" href="https://www.consumer.vic.gov.au/housing/buying-and-selling-property/understanding-property-prices-and-underquoting-for-buyers" target="_blank" rel="noopener">Consumer Affairs Victoria pricing guidance ↗</a></div>`;
  }

  function showStep(step){document.querySelectorAll('[data-step]').forEach(panel=>panel.classList.toggle('active',Number(panel.dataset.step)===step));document.querySelectorAll('[data-progress]').forEach(item=>{const value=Number(item.dataset.progress);item.classList.toggle('active',value===step);item.classList.toggle('done',value<step)});scrollTo({top:0,behavior:'smooth'})}
  function saveDraft(){localStorage.setItem(DRAFT_KEY,JSON.stringify({state:readState(),savedAt:new Date().toISOString()}));toast('Draft saved on this device. Attachments are saved only when you save to a Project.')}
  function toast(message){const node=document.createElement('div');node.className='acp-toast';node.textContent=message;document.body.appendChild(node);setTimeout(()=>node.remove(),3200)}
  function fileList(){selectedFiles=[...$('propertyFiles').files];$('fileList').innerHTML=selectedFiles.map(file=>`<span class="file-chip">${esc(file.name)} · ${(file.size/1048576).toFixed(1)} MB</span>`).join('')}
  function clearEstimate(){if(!confirm('Start a new property estimate? This clears the current unsaved form and result.'))return;localStorage.removeItem(DRAFT_KEY);recordRef=null;lastResult=null;selectedFiles=[];document.querySelectorAll('input,textarea').forEach(input=>{if(input.type!=='checkbox'&&input.type!=='file')input.value='';if(input.type==='checkbox')input.checked=false});$('region').value='metro';$('propertyType').value='house';$('comparables').innerHTML='';comparableCount=0;[{},{},{}].forEach(addComparable);$('fileList').innerHTML='';document.body.classList.remove('result-ready');updateLocalStatus();showStep(1)}

  document.querySelectorAll('[data-next]').forEach(button=>button.addEventListener('click',()=>{try{if(Number(button.dataset.next)>1)validate(readState());showStep(Number(button.dataset.next))}catch(error){alert(error.message)}}));
  document.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.back))));
  $('addComparable').addEventListener('click',()=>addComparable());$('propertyFiles').addEventListener('change',fileList);$('saveDraft').addEventListener('click',saveDraft);$('print').addEventListener('click',()=>print());$('newEstimate').addEventListener('click',clearEstimate);
  $('calculate').addEventListener('click',()=>{try{const state=readState();lastResult=calculateValue(state);renderResult(lastResult,state);document.body.classList.add('result-ready');showStep(4);localStorage.setItem(DRAFT_KEY,JSON.stringify({state,result:lastResult,savedAt:new Date().toISOString()}))}catch(error){alert(error.message)}});

  window.ACProjectCapture=async()=>{
    if(!lastResult)throw new Error('Calculate the property value guide before saving it to a Project.');const state=readState(),name=state.estimateName.trim()||state.suburb.trim()||'Property';
    return{module:'property-estimate',title:`${name} — Property Value Guide`,summary:`${money(lastResult.low)} – ${money(lastResult.high)} · ${lastResult.label}`,attachments:selectedFiles,recordRef,data:{state,result:lastResult,audit:{method:'Victorian local-sales and comparable-sales property value guide',evidenceCount:lastResult.comparables.filter(comp=>comp.used!==false).length,confidence:lastResult.confidence,generatedAt:lastResult.calculatedAt,savedAt:new Date().toISOString(),generatedBy:window.ACAuth?.user?.()?.email||'authorised user',humanChanges:[]}}};
  };
  window.ACProjectSaved=({projectId,recordId})=>{recordRef={projectId,recordId};if(selectedFiles.length){selectedFiles=[];$('propertyFiles').value='';$('fileList').innerHTML='<span class="file-chip">Files saved with this Project record.</span>'}const state=readState();if(state.followUpDate){const project=window.ACProjects?.get(projectId),marker=`property-estimate:${recordId}`;if(project&&!project.tasks?.some(task=>task.notes===marker))window.ACProjects.addTask(projectId,{title:`Review property value estimate — ${state.suburb}`,dueDate:state.followUpDate,priority:'Normal',notes:marker})}};

  function initialise(){
    let payload=null;try{payload=JSON.parse(localStorage.getItem(RESTORE_KEY)||'null')}catch(_){}if(payload){localStorage.removeItem(RESTORE_KEY);writeState(payload.state||{});recordRef=payload.projectId&&payload.recordId?{projectId:payload.projectId,recordId:payload.recordId}:null;if(payload.result?.engineVersion===ENGINE_VERSION){lastResult=payload.result;renderResult(lastResult,readState());document.body.classList.add('result-ready');showStep(4)}else if(payload.result){try{lastResult=calculateValue(readState());renderResult(lastResult,readState());document.body.classList.add('result-ready');showStep(4);toast('This saved estimate was recalculated with the corrected local-suburb model.')}catch(error){toast('This older estimate needs current local evidence before it can be recalculated.')}}$('restoreNote').classList.add('show');return}
    try{const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(draft?.state){writeState(draft.state);if(draft.result){lastResult=draft.result;renderResult(lastResult,readState());document.body.classList.add('result-ready')}}else writeState({})}catch(_){writeState({})}
  }
  if($('victoriaSuburbs'))$('victoriaSuburbs').innerHTML=SUBURB_KEYS.map(key=>`<option value="${esc(titleCase(key))}"></option>`).join('');
  ['suburb','propertyType','titleType'].forEach(id=>$(id)?.addEventListener('change',updateLocalStatus));$('suburb')?.addEventListener('input',updateLocalStatus);
  window.ACPropertyEstimator={calculate:calculateValue,salesData:SALES,officialEvidence,benchmarkDate:BENCHMARK_DATE,engineVersion:ENGINE_VERSION};
  initialise();
})();
