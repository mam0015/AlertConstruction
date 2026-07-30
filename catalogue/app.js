(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const money=value=>Number(value||0).toLocaleString('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const tradeLabel=value=>String(value||'general').replace(/_/g,' ').replace(/\b\w/g,char=>char.toUpperCase());
  const samePrice=(a,b)=>(a==null&&b==null)||(a!=null&&b!=null&&Math.abs(Number(a)-Number(b))<.005);
  const state={workspace:null,items:[],draft:new Map(),dirty:new Set(),selected:new Set(),importRows:[],importSkipped:[],busy:false};

  function toast(message,type='good'){
    const box=$('toast');box.textContent=message;box.className=`toast ${type==='error'?'error':''}`;box.hidden=false;
    clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.hidden=true,3200);
  }
  function showError(error){const message=error?.message||String(error||'Something went wrong.');toast(message,'error')}
  function setBusy(value){
    state.busy=value;
    ['saveBtn','newListBtn','activateListBtn','deactivateListBtn','importBtn','createListBtn','confirmImportBtn'].forEach(id=>{const button=$(id);if(button)button.disabled=value});
    document.body.classList.toggle('is-busy',value);
  }
  function dateTime(value){
    if(!value)return'Not updated yet';
    const parsed=new Date(value);return Number.isNaN(parsed.getTime())?String(value):parsed.toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
  }
  function selectedList(){return state.workspace?.lists?.find(list=>list.id===state.workspace.selected_price_list_id)||null}
  function isEditor(){return state.workspace?.can_edit===true}
  function draftPrice(item){return state.draft.has(item.item_code)?state.draft.get(item.item_code).custom_price:item.custom_price}
  function effectivePrice(item){const custom=draftPrice(item);return custom==null?Number(item.default_price):Number(custom)}
  function difference(item){
    const base=Number(item.default_price),value=effectivePrice(item);
    return base>0?((value-base)/base)*100:0;
  }
  function refreshDirty(item){
    if(samePrice(draftPrice(item),item.custom_price))state.dirty.delete(item.item_code);
    else state.dirty.add(item.item_code);
  }
  function setDraft(item,customPrice){
    state.draft.set(item.item_code,{custom_price:customPrice==null?null:Math.round(Number(customPrice)*100)/100,notes:item.notes||null});
    refreshDirty(item);renderGroups();renderSaveBar();
  }

  function fillTradeFilter(){
    const current=$('trade').value,trades=[...new Set(state.items.map(item=>item.trade))].sort();
    $('trade').innerHTML='<option value="">All trades</option>'+trades.map(trade=>`<option value="${esc(trade)}">${esc(tradeLabel(trade))}</option>`).join('');
    $('trade').value=trades.includes(current)?current:'';
  }
  function filteredItems(){
    const query=$('search').value.toLowerCase().trim(),trade=$('trade').value;
    return state.items.filter(item=>(!trade||item.trade===trade)&&(!query||`${item.item_code} ${item.description} ${item.unit}`.toLowerCase().includes(query)));
  }
  function diffHtml(item){
    const value=difference(item),rounded=Math.abs(value)<.005?0:value,className=rounded>0?'up':rounded<0?'down':'same';
    return `<span class="difference ${className}">${rounded>0?'+':''}${rounded.toFixed(1)}%</span>`;
  }
  function rowHtml(item){
    const custom=draftPrice(item),hasCustom=custom!=null,dirty=state.dirty.has(item.item_code),checked=state.selected.has(item.item_code);
    return `<div class="price-row ${hasCustom?'custom':''} ${dirty?'dirty':''}" data-code="${esc(item.item_code)}">
      <input class="row-check editor-only" type="checkbox" aria-label="Select ${esc(item.item_code)}" ${checked?'checked':''}>
      <code class="item-code">${esc(item.item_code)}</code>
      <div class="item-copy"><strong>${esc(item.description)}</strong><small>${hasCustom?'Company override is active':'Using the default catalogue price'}</small></div>
      <span class="unit">${esc(item.unit||'each')}</span>
      <span class="price-value">${money(item.default_price)}</span>
      <label class="custom-field"><input class="custom-price" type="number" inputmode="decimal" min="0.01" step="0.01" value="${custom==null?'':Number(custom).toFixed(2)}" placeholder="${Number(item.default_price).toFixed(2)}" aria-label="Custom price for ${esc(item.description)}" ${isEditor()?'':'readonly'}><b>AUD</b></label>
      ${diffHtml(item)}
      <span class="source-badge ${hasCustom?'custom':''}">${hasCustom?'Your rate':'Default'}</span>
      <button class="reset-row editor-only" type="button" ${hasCustom||dirty?'':'disabled'}>Reset</button>
    </div>`;
  }
  function renderGroups(){
    const visible=filteredItems(),groups=new Map();
    visible.forEach(item=>{if(!groups.has(item.trade))groups.set(item.trade,[]);groups.get(item.trade).push(item)});
    $('groups').innerHTML=groups.size?[...groups.entries()].map(([trade,items])=>{
      const customCount=items.filter(item=>draftPrice(item)!=null).length;
      return `<section class="trade-group" data-trade="${esc(trade)}">
        <header class="trade-head"><div class="trade-title"><span>${items.length}</span><h2>${esc(tradeLabel(trade))}</h2></div><div class="trade-meta"><span>${customCount} custom • ${items.length-customCount} default</span><button class="editor-only reset-trade" type="button">Reset trade to defaults</button></div></header>
        <div class="price-table"><div class="price-head"><span></span><span>Item code</span><span>Description</span><span>Unit</span><span>Default price</span><span>Custom price</span><span>Difference</span><span>Source</span><span></span></div>${items.map(rowHtml).join('')}</div>
      </section>`;
    }).join(''):'<div class="empty">No catalogue items match this search.</div>';
    bindRows();
    renderSelection();
  }
  function bindRows(){
    document.querySelectorAll('.price-row').forEach(row=>{
      const item=state.items.find(value=>value.item_code===row.dataset.code);
      row.querySelector('.row-check')?.addEventListener('change',event=>{if(event.target.checked)state.selected.add(item.item_code);else state.selected.delete(item.item_code);renderSelection()});
      row.querySelector('.custom-price')?.addEventListener('change',event=>{
        if(!isEditor())return;
        const raw=event.target.value.trim();
        if(raw===''){setDraft(item,null);return}
        const price=Number(raw);
        if(!Number.isFinite(price)||price<=0){event.target.value=draftPrice(item)==null?'':Number(draftPrice(item)).toFixed(2);showError(new Error('Custom prices must be greater than zero.'));return}
        setDraft(item,price);
      });
      row.querySelector('.reset-row')?.addEventListener('click',()=>setDraft(item,null));
    });
    document.querySelectorAll('.reset-trade').forEach(button=>button.addEventListener('click',()=>{
      const trade=button.closest('.trade-group').dataset.trade,items=state.items.filter(item=>item.trade===trade);
      if(!confirm(`Reset all ${tradeLabel(trade)} custom prices in this draft to the defaults?`))return;
      items.forEach(item=>{state.draft.set(item.item_code,{custom_price:null,notes:item.notes||null});refreshDirty(item)});
      renderGroups();renderSaveBar();
    }));
  }
  function renderSelection(){
    const count=state.selected.size;$('selectionCount').textContent=`${count} selected`;
    $('bulkAdjustBtn').disabled=!count||state.busy;$('resetSelectedBtn').disabled=!count||state.busy;
  }
  function renderSaveBar(){
    const count=state.dirty.size;$('saveBar').hidden=!count;$('saveCount').textContent=`${count} unsaved change${count===1?'':'s'}`;
  }
  function renderHistory(){
    const versions=state.workspace?.versions||[];
    $('historyList').innerHTML=versions.length?versions.map(version=>`<article class="history-row"><div><strong>${esc(version.change_summary)}</strong><span>${esc(version.changed_by_name||'Team member')}</span></div><time>${esc(dateTime(version.changed_at))}</time></article>`).join(''):'<div class="empty">No saved versions yet. The first price save will appear here.</div>';
  }
  function renderWorkspace(){
    const workspace=state.workspace,list=selectedList(),active=workspace.lists?.find(item=>item.id===workspace.active_price_list_id)||null;
    document.body.classList.toggle('read-only',!isEditor());$('readOnlyNote').hidden=isEditor();
    $('priceListSelect').innerHTML=(workspace.lists||[]).map(item=>`<option value="${esc(item.id)}">${esc(item.name)}${item.is_active?' • Active':''}</option>`).join('');
    $('priceListSelect').value=workspace.selected_price_list_id||'';
    $('selectedListName').textContent=list?.name||'Default catalogue';
    $('activePill').textContent=list?.is_active?'Active for new estimates':'Inactive list • preview only';$('activePill').classList.toggle('inactive',!list?.is_active);
    $('activateListBtn').hidden=!!list?.is_active;$('deactivateListBtn').hidden=!list?.is_active;
    const last=workspace.last_updated;$('lastUpdated').textContent=last?.at?`Last updated ${dateTime(last.at)} by ${last.by_name||'Team member'}`:'No company changes saved yet';
    $('activeListMetric').textContent=active?.name||'Default catalogue';
    $('customRateMetric').textContent=String(state.items.filter(item=>item.custom_price!=null&&list?.is_active).length);
    $('catalogueItemMetric').textContent=String(state.items.length);
    $('status').className='status good';$('status').textContent=isEditor()?'Owner/Admin editing enabled • fixed item-code matching • all saves are versioned.':'Estimator read-only access • these are the exact rates used in new estimates.';
    state.draft.clear();state.dirty.clear();state.selected.clear();fillTradeFilter();renderGroups();renderSaveBar();renderHistory();
  }
  async function loadWorkspace(priceListId=null){
    setBusy(true);
    try{
      const workspace=await ACPriceCatalogue.getPricingWorkspace(priceListId);
      state.workspace=workspace;state.items=(workspace.items||[]).map(item=>({...item,default_price:Number(item.default_price),custom_price:item.custom_price==null?null:Number(item.custom_price)}));
      $('workspace').hidden=false;$('lock').hidden=true;renderWorkspace();
    }finally{setBusy(false);renderSelection()}
  }

  function changesPayload(){
    return [...state.dirty].map(code=>{const item=state.items.find(value=>value.item_code===code),draft=state.draft.get(code);return{item_code:code,custom_price:draft?.custom_price??null,notes:draft?.notes??item?.notes??null}});
  }
  async function saveChanges(source='manual',payload=changesPayload()){
    if(!payload.length)return;
    setBusy(true);
    try{
      const workspace=await ACPriceCatalogue.saveCompanyPrices(state.workspace.selected_price_list_id,payload,source);
      state.workspace=workspace;state.items=(workspace.items||[]).map(item=>({...item,default_price:Number(item.default_price),custom_price:item.custom_price==null?null:Number(item.custom_price)}));
      renderWorkspace();await ACPriceCatalogue.loadCloud();
      toast(`${payload.length} price${payload.length===1?'':'s'} saved. New estimates now use the active list.`);
    }finally{setBusy(false)}
  }

  function csvCell(value){const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text}
  function downloadTemplate(){
    const rows=[['item_code','description','trade','unit','default_price','your_price'],...state.items.map(item=>[item.item_code,item.description,item.trade,item.unit,Number(item.default_price).toFixed(2),''])];
    const csv='\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),link=document.createElement('a'),name=(selectedList()?.name||'company-prices').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'');
    link.href=URL.createObjectURL(blob);link.download=`AlertTradiePro-${name||'company-prices'}-template.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),0);
    toast('Template downloaded. Fill only the your_price column.');
  }
  async function parseImport(file){
    if(!file)throw new Error('Choose a CSV or XLSX file.');
    if(file.size>5*1024*1024)throw new Error('The import file must be 5 MB or smaller.');
    const extension=(file.name.split('.').pop()||'').toLowerCase();
    if(!['csv','xlsx'].includes(extension))throw new Error('Upload a CSV or XLSX file. PDF and other document formats are not accepted.');
    const allowedTypes=extension==='csv'
      ?['text/csv','application/csv','text/plain','application/vnd.ms-excel']
      :['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/octet-stream','application/zip'];
    if(file.type&&!allowedTypes.includes(file.type.toLowerCase()))throw new Error(`The selected file type (${file.type}) does not match a ${extension.toUpperCase()} price template.`);
    if(!window.XLSX)throw new Error('The spreadsheet reader did not load. Refresh the app and try again.');
    let workbook;
    if(extension==='csv')workbook=XLSX.read(await file.text(),{type:'string',raw:true});
    else workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
    const sheet=workbook.Sheets[workbook.SheetNames[0]];
    if(!sheet)throw new Error('The spreadsheet does not contain a worksheet.');
    const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true,blankrows:false});
    if(!matrix.length)throw new Error('The spreadsheet is empty.');
    const headers=matrix[0].map(value=>String(value||'').trim().toLowerCase()),codeIndex=headers.indexOf('item_code'),priceIndex=headers.indexOf('your_price');
    if(codeIndex<0)throw new Error('Import rejected: the item_code column is missing. Download a fresh template and keep that column unchanged.');
    if(priceIndex<0)throw new Error('Import rejected: the your_price column is missing. Download a fresh template.');
    const catalogue=new Map(state.items.map(item=>[item.item_code,item])),valid=[],skipped=[],seen=new Set();
    matrix.slice(1).forEach((row,index)=>{
      const rowNumber=index+2,code=String(row[codeIndex]??'').trim(),raw=row[priceIndex];
      if(!code){skipped.push({row:rowNumber,code:'—',reason:'Missing item_code'});return}
      if(seen.has(code)){skipped.push({row:rowNumber,code,reason:'Duplicate item_code in file'});return}
      seen.add(code);
      if(!catalogue.has(code)){skipped.push({row:rowNumber,code,reason:'Unrecognised item code'});return}
      if(raw==null||String(raw).trim()===''){skipped.push({row:rowNumber,code,reason:'your_price is blank'});return}
      const price=typeof raw==='number'?raw:Number(String(raw).replace(/,/g,'').trim());
      if(!Number.isFinite(price)||price<=0){skipped.push({row:rowNumber,code,reason:'your_price must be a positive number'});return}
      valid.push({item_code:code,custom_price:Math.round(price*100)/100,notes:null,item:catalogue.get(code)});
    });
    state.importRows=valid;state.importSkipped=skipped;renderImportPreview(file.name);
  }
  function renderImportPreview(fileName){
    const valid=state.importRows,skipped=state.importSkipped;
    $('importSummary').innerHTML=`<div><strong>${valid.length}</strong><span>prices will be updated</span></div><div><strong>${skipped.length}</strong><span>rows skipped</span></div><div><strong>0</strong><span>new items added</span></div>`;
    $('importErrors').innerHTML=skipped.length?`<strong>${esc(fileName)} — skipped rows</strong>`+skipped.map(item=>`<div class="error-row"><code>Row ${item.row} • ${esc(item.code)}</code><span>${esc(item.reason)}</span></div>`).join(''):'';
    $('importPreview').innerHTML=valid.length?valid.slice(0,200).map(row=>`<div class="preview-row"><div><strong>${esc(row.item_code)} • ${esc(row.item.description)}</strong><span>${money(row.item.default_price)} default</span></div><b>→</b><strong>${money(row.custom_price)}</strong></div>`).join(''):'<div class="empty">No valid prices were found. Nothing can be imported.</div>';
    if(valid.length>200)$('importPreview').insertAdjacentHTML('beforeend',`<div class="empty">+ ${valid.length-200} additional valid rows</div>`);
    $('confirmImportBtn').disabled=!valid.length;$('importDialog').showModal();
  }

  function renderBulkPreview(){
    const percent=Number($('bulkPercent').value),valid=Number.isFinite(percent)&&percent>-100,items=[...state.selected].map(code=>state.items.find(item=>item.item_code===code)).filter(Boolean);
    $('applyBulkBtn').disabled=!valid||!items.length;
    $('bulkPreview').innerHTML=valid?items.slice(0,150).map(item=>{const before=effectivePrice(item),after=Math.round(before*(1+percent/100)*100)/100;return `<div class="preview-row"><div><strong>${esc(item.item_code)} • ${esc(item.description)}</strong><span>${money(before)} current rate</span></div><b>→</b><strong>${money(after)}</strong></div>`}).join(''):'<div class="empty">Enter a percentage greater than -100%.</div>';
  }
  function discardChanges(){
    if(state.dirty.size&&!confirm('Discard all unsaved price changes?'))return;
    state.draft.clear();state.dirty.clear();renderGroups();renderSaveBar();
  }

  $('search').addEventListener('input',renderGroups);$('trade').addEventListener('change',renderGroups);
  $('priceListSelect').addEventListener('change',event=>{if(state.dirty.size&&!confirm('Discard unsaved changes and open another price list?')){event.target.value=state.workspace.selected_price_list_id;return}loadWorkspace(event.target.value).catch(showError)});
  $('selectVisibleBtn').addEventListener('click',()=>{const visible=filteredItems(),allSelected=visible.length&&visible.every(item=>state.selected.has(item.item_code));visible.forEach(item=>allSelected?state.selected.delete(item.item_code):state.selected.add(item.item_code));renderGroups()});
  $('resetSelectedBtn').addEventListener('click',()=>{if(!state.selected.size||!confirm(`Reset ${state.selected.size} selected item${state.selected.size===1?'':'s'} to default prices in this draft?`))return;state.selected.forEach(code=>{const item=state.items.find(value=>value.item_code===code);if(item){state.draft.set(code,{custom_price:null,notes:item.notes||null});refreshDirty(item)}});renderGroups();renderSaveBar()});
  $('bulkAdjustBtn').addEventListener('click',()=>{$('bulkPercent').value='';renderBulkPreview();$('bulkDialog').showModal();$('bulkPercent').focus()});
  $('bulkPercent').addEventListener('input',renderBulkPreview);
  $('bulkForm').addEventListener('submit',event=>{event.preventDefault();if($('applyBulkBtn').disabled)return;const percent=Number($('bulkPercent').value);state.selected.forEach(code=>{const item=state.items.find(value=>value.item_code===code);if(item){state.draft.set(code,{custom_price:Math.round(effectivePrice(item)*(1+percent/100)*100)/100,notes:item.notes||null});refreshDirty(item)}});$('bulkDialog').close();renderGroups();renderSaveBar();toast('Bulk adjustment applied to the draft. Review and save the changes.')});
  $('downloadTemplateBtn').addEventListener('click',downloadTemplate);
  $('importBtn').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',async event=>{const input=event.currentTarget||event.target,file=input?.files?.[0];try{await parseImport(file)}catch(error){showError(error)}finally{if(input)input.value=''}});
  $('importForm').addEventListener('submit',async event=>{event.preventDefault();if(!state.importRows.length)return;try{$('importDialog').close();await saveChanges('import',state.importRows.map(({item_code,custom_price,notes})=>({item_code,custom_price,notes})))}catch(error){showError(error)}});
  $('historyBtn').addEventListener('click',()=>{$('historyDialog').showModal()});$('closeHistoryBtn').addEventListener('click',()=>$('historyDialog').close());
  document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog')?.close()));
  $('newListBtn').addEventListener('click',()=>{$('newListName').value='';$('activateNewList').checked=true;$('newListDialog').showModal();$('newListName').focus()});
  $('newListForm').addEventListener('submit',async event=>{event.preventDefault();const name=$('newListName').value.trim();if(!name)return;try{$('newListDialog').close();state.workspace=await ACPriceCatalogue.createPriceList(name,$('activateNewList').checked);state.items=(state.workspace.items||[]).map(item=>({...item,default_price:Number(item.default_price),custom_price:item.custom_price==null?null:Number(item.custom_price)}));renderWorkspace();await ACPriceCatalogue.loadCloud();toast('New company price list created.')}catch(error){showError(error)}});
  $('activateListBtn').addEventListener('click',async()=>{const list=selectedList();if(!list||!confirm(`Activate “${list.name}” for all new estimates? Existing saved estimates will keep their stored prices.`))return;try{state.workspace=await ACPriceCatalogue.activatePriceList(list.id);state.items=(state.workspace.items||[]).map(item=>({...item,default_price:Number(item.default_price),custom_price:item.custom_price==null?null:Number(item.custom_price)}));renderWorkspace();await ACPriceCatalogue.loadCloud();toast('Price list activated for new estimates.')}catch(error){showError(error)}});
  $('deactivateListBtn').addEventListener('click',async()=>{const list=selectedList();if(!list||!confirm('Use only default catalogue prices for new estimates? Your custom list will remain saved and can be activated again later.'))return;try{state.workspace=await ACPriceCatalogue.deactivatePriceList(list.id);state.items=(state.workspace.items||[]).map(item=>({...item,default_price:Number(item.default_price),custom_price:item.custom_price==null?null:Number(item.custom_price)}));renderWorkspace();await ACPriceCatalogue.loadCloud();toast('Custom list deactivated. New estimates now use default catalogue prices.')}catch(error){showError(error)}});
  $('saveBtn').addEventListener('click',()=>saveChanges('manual').catch(showError));$('discardBtn').addEventListener('click',discardChanges);

  async function init(){
    await ACAuth.ready;
    if(!ACAuth.isSignedIn()||!ACAuth.hasAccess()||!ACAuth.canUseTool('catalogue')){
      $('lock').hidden=false;$('workspace').hidden=true;$('status').className='status error';$('status').textContent=ACAuth.isSignedIn()?'Company Pricing is not included in this account role.':'Sign in to open secure company pricing.';return;
    }
    await ACPriceCatalogue.ready;
    const security=ACPriceCatalogue.security();
    if(!security.verified){
      $('lock').hidden=false;$('lock').querySelector('h2').textContent='Company Pricing setup required';$('lock').querySelector('p').textContent=security.error||'Run the V51 Company Pricing migration, then refresh this page.';$('status').className='status error';$('status').textContent='The secure pricing service could not be verified.';return;
    }
    try{await loadWorkspace()}catch(error){$('lock').hidden=false;$('workspace').hidden=true;$('status').className='status error';$('status').textContent='Company Pricing could not load.';$('lock').querySelector('h2').textContent='Run the V51 Company Pricing migration';$('lock').querySelector('p').textContent=error.message||'The pricing workspace RPC is unavailable.'}
  }
  init();
})();
