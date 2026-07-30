(function(global){
  'use strict';

  const config=global.AC_PLATFORM_CONFIG||{};
  const schema=(global.AC_CATALOGUE_DEFAULTS||[]).map(item=>({...item}));
  let rows=[];
  let securityState={verified:false,authorised:false,can_edit:false,role:'',checked_at:null,error:'',pricing_ready:false,rate_version:'',verified_at:'',effective_from:'',updated_at:'',counts:{},active_price_list_id:null,active_price_list_name:'',custom_count:0};
  let readyResolve;
  const ready=new Promise(resolve=>readyResolve=resolve);

  const money=value=>Number(value).toLocaleString('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2,maximumFractionDigits:2});
  const base=()=>String(config.supabaseUrl||'').replace(/\/$/,'');
  const tradeFromPath=()=>(location.pathname.match(/\/(electrical|plumbing|cladding)\//)||[])[1]||'';
  const schemaFor=trade=>schema.filter(item=>!trade||item.trade===trade).sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
  const list=trade=>rows.filter(item=>!trade||item.trade===trade).sort((a,b)=>String(a.trade).localeCompare(String(b.trade))||Number(a.sort_order)-Number(b.sort_order)||String(a.item_code).localeCompare(String(b.item_code)));
  const byCode=value=>rows.find(item=>item.item_code===value||item.item_key===value)||null;
  const rowAt=(trade,index)=>list(trade).find(item=>Number(item.sort_order)===Number(index))||null;

  function tradeStatus(trade){
    const expected=schemaFor(trade),loaded=list(trade),keys=new Set(loaded.map(item=>item.item_key));
    const complete=Boolean(trade)&&expected.length>0&&expected.every(item=>keys.has(item.item_key));
    const approved=loaded.length>0&&loaded.every(item=>Number.isFinite(Number(item.builder_rate))&&Number(item.builder_rate)>=0&&item.item_code);
    return{trade,expected:expected.length,loaded:loaded.length,complete,approved,ready:securityState.verified&&complete&&approved};
  }
  function pricingReady(trade){return trade?tradeStatus(trade).ready:securityState.pricing_ready===true}
  function effectiveRate(trade,index){const row=rowAt(trade,index);return row&&pricingReady(trade)?Number(row.builder_rate):null}
  function getPrice(itemCode,companyId){
    const currentCompany=global.ACAuth?.profile?.()?.organisation_id||null;
    if(companyId&&currentCompany&&companyId!==currentCompany)return null;
    const row=byCode(itemCode);
    if(!row)return null;
    return{item_code:row.item_code,item_key:row.item_key,company_id:companyId||currentCompany,price:Number(row.builder_rate),default_price:Number(row.default_price),custom_price:row.custom_price==null?null:Number(row.custom_price),is_custom:row.is_custom===true,price_source:row.is_custom?'custom':'default',price_list_id:row.active_price_list_id||null,price_list_name:row.active_price_list_name||null,unit:row.unit,description:row.name,trade:row.trade};
  }
  function requirePrice(itemCode){
    const price=getPrice(itemCode);
    if(!price||!Number.isFinite(price.price))throw new Error(`A verified price is unavailable for fixed item code ${itemCode}. Open Company Pricing and confirm the V51 catalogue setup.`);
    return price;
  }
  function priceSnapshot(itemCode){const price=requirePrice(itemCode);return{item_code:price.item_code,item_key:price.item_key,description:price.description,unit:price.unit,unit_price_used:price.price,default_price_at_time:price.default_price,custom_price_at_time:price.custom_price,price_source:price.price_source,price_list_id:price.price_list_id,price_list_name:price.price_list_name,captured_at:new Date().toISOString()}}
  function snapshotForElement(element){
    const code=element?.dataset?.itemCode||element?.dataset?.catalogueKey||'';
    const price=getPrice(code);
    return price?{...price,unit_price_used:Number(element.getAttribute('data-rate')||price.price),captured_at:new Date().toISOString()}:null;
  }

  function installRateStyles(){
    if(document.getElementById('ac-company-rate-styles'))return;
    const style=document.createElement('style');style.id='ac-company-rate-styles';style.textContent='.ac-rate-source-badge{display:inline-flex;margin-left:7px;padding:3px 6px;border-radius:999px;background:rgba(255,255,255,.08);color:#aaa;font:950 8px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.05em;text-transform:uppercase;vertical-align:middle}.ac-rate-source-badge.custom{background:rgba(245,180,0,.14);color:#ffd15a}.ac-rate-code{display:block;margin-top:4px;color:#777;font:750 8px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}';document.head.appendChild(style);
  }
  function trustBanner(){
    let banner=document.querySelector('.ac-catalogue-trust');
    if(banner)return banner;
    const host=document.querySelector('.actions,.hero,.panel-head,main');
    if(!host)return null;
    banner=document.createElement('aside');banner.className='ac-catalogue-trust checking';banner.setAttribute('role','status');banner.innerHTML='<strong>Checking company pricing…</strong><span>Pricing remains locked until the server and active list are verified.</span>';
    host.insertAdjacentElement('afterend',banner);
    return banner;
  }
  function renderTrust(trade){
    const banner=trustBanner();if(!banner)return;
    const status=tradeStatus(trade),date=value=>{if(!value)return'not supplied';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?String(value):parsed.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})};
    banner.className='ac-catalogue-trust '+(status.ready?'verified':'locked');
    if(status.ready){
      const listName=securityState.active_price_list_name||'Default catalogue';
      banner.innerHTML=`<strong>✓ Verified company pricing</strong><span>${status.loaded} fixed ${trade} item codes • ${listName} • ${securityState.custom_count} company override${securityState.custom_count===1?'':'s'} • Checked ${date(securityState.checked_at)}</span>`;
    }else{
      const reason=securityState.error||(!securityState.verified?'Server authorisation has not been verified.':`${status.loaded} of ${status.expected} fixed ${trade} items are available.`);
      banner.innerHTML=`<strong>Pricing locked — company catalogue unavailable</strong><span>${reason} No estimate has been calculated. Run the V51 Company Pricing migration or contact the Owner.</span>`;
    }
  }
  function setCalculatorLocked(locked){
    document.documentElement.classList.toggle('ac-pricing-locked',locked);
    document.querySelectorAll('.qtyInput,.qty-btn').forEach(control=>{control.disabled=locked;control.title=locked?'Verified company prices must load before quantities can be priced.':''});
  }
  function addSourceMarker(item,row){
    const name=item.querySelector('.item-name strong,.item-name')||item.querySelector('strong');
    if(!name)return;
    let badge=name.querySelector?.('.ac-rate-source-badge');
    if(!badge){badge=document.createElement('span');badge.className='ac-rate-source-badge';name.appendChild(badge)}
    badge.className='ac-rate-source-badge '+(row.is_custom?'custom':'');badge.textContent=row.is_custom?'Your rate':'Default';
    let code=item.querySelector('.ac-rate-code');
    if(!code){code=document.createElement('small');code.className='ac-rate-code';(item.querySelector('.item-desc')||name.parentElement||name).appendChild(code)}
    code.textContent=row.item_code;
  }
  function applyCalculator(){
    installRateStyles();
    const trade=tradeFromPath();if(!trade)return;
    const status=tradeStatus(trade),catalogue=list(trade),items=[...document.querySelectorAll('.item[data-rate]')];
    items.forEach((item,index)=>{
      const row=catalogue.find(candidate=>candidate.item_key===item.dataset.catalogueKey)||catalogue.find(candidate=>Number(candidate.sort_order)===index);
      if(!status.ready||!row){item.setAttribute('data-rate','0');const rate=item.querySelector('.rate');if(rate)rate.textContent='Verified company rate required';return}
      item.dataset.catalogueKey=row.item_key;item.dataset.itemCode=row.item_code;item.dataset.priceSource=row.is_custom?'custom':'default';item.dataset.defaultPrice=String(row.default_price);item.dataset.priceListId=row.active_price_list_id||'';
      item.setAttribute('data-rate',String(row.builder_rate));const rate=item.querySelector('.rate');if(rate)rate.textContent=money(row.builder_rate)+' ex GST';
      addSourceMarker(item,row);
    });
    setCalculatorLocked(!status.ready);renderTrust(trade);
    const api={electrical:global.ACQuoteCalculator,plumbing:global.ACPlumbingQuote,cladding:global.ACCladdingQuote}[trade];
    if(api?.calculateTotals)api.calculateTotals();else document.querySelector('.qtyInput')?.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function applyToCatalogues(catalogues){
    Object.keys(catalogues||{}).forEach(trade=>{
      const target=catalogues[trade]?.items;if(!Array.isArray(target))return;
      list(trade).forEach(item=>{if(target[item.sort_order]){target[item.sort_order][0]=item.name||target[item.sort_order][0];target[item.sort_order][1]=Number(item.builder_rate);target[item.sort_order][2]={item_code:item.item_code,is_custom:item.is_custom,price_source:item.price_source,default_price:item.default_price,price_list_id:item.active_price_list_id,price_list_name:item.active_price_list_name}}});
    });
    return catalogues;
  }
  function requireVerified(trade){
    const status=tradeStatus(trade);if(!status.ready)throw new Error(`Verified ${trade} pricing is unavailable. No estimate was calculated. Open Company Pricing and confirm all ${status.expected} fixed items are present.`);return list(trade)
  }

  async function context(){
    await global.ACAuth?.ready;const profile=global.ACAuth?.profile();
    if(!global.ACAuth?.hasAccess?.()||!profile?.organisation_id)return null;
    return{profile,headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(await global.ACAuth.headers())}};
  }
  async function rpc(name,body={}){
    const ctx=await context();if(!ctx)throw new Error('An active company account is required.');
    const response=await fetch(`${base()}/rest/v1/rpc/${name}`,{method:'POST',headers:ctx.headers,body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||data.error||`${name} failed (${response.status}).`);
    return data;
  }
  async function verifyAccess(ctx){
    securityState={...securityState,verified:false,authorised:false,can_edit:false,role:'',checked_at:null,error:'',pricing_ready:false,counts:{},active_price_list_id:null,active_price_list_name:'',custom_count:0};
    if(!ctx||!config.catalogueCloudEnabled){securityState.error=ctx?'Secure catalogue service is disabled.':'An active account is required.';return securityState}
    try{
      const response=await fetch(`${base()}/rest/v1/rpc/catalogue_access_probe`,{method:'POST',headers:ctx.headers,body:'{}'}),data=await response.json().catch(()=>({}));
      if(!response.ok||data.authorised!==true)throw new Error(data.message||'Company Pricing is not included in this account role.');
      securityState={...securityState,verified:true,authorised:true,can_edit:data.can_edit===true,role:data.role||'',checked_at:data.checked_at||new Date().toISOString(),active_price_list_id:data.active_price_list_id||null,active_price_list_name:data.active_price_list_name||'',error:''};
    }catch(error){securityState.error=error.message||'The server could not verify company pricing access.'}
    global.dispatchEvent(new CustomEvent('ac-catalogue-security',{detail:{...securityState}}));return securityState;
  }
  function deriveMetadata(){
    const sorted=[...rows].sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))),latest=sorted[0]||{};
    securityState.active_price_list_id=latest.active_price_list_id||securityState.active_price_list_id||null;securityState.active_price_list_name=latest.active_price_list_name||securityState.active_price_list_name||'';
    securityState.rate_version=securityState.active_price_list_name||'Default catalogue';securityState.verified_at=latest.updated_at||securityState.checked_at||'';securityState.effective_from=latest.updated_at||'';securityState.updated_at=latest.updated_at||'';
    securityState.custom_count=rows.filter(row=>row.is_custom).length;
    securityState.counts=Object.fromEntries(['electrical','plumbing','cladding'].map(trade=>[trade,tradeStatus(trade)]));securityState.pricing_ready=['electrical','plumbing','cladding'].every(trade=>securityState.counts[trade].ready);
  }
  async function loadCloud(){
    rows=[];applyCalculator();const ctx=await context(),access=await verifyAccess(ctx);if(!access.verified){applyCalculator();return[]}
    try{
      const response=await fetch(`${base()}/rest/v1/rpc/get_ac_effective_price_catalogue`,{method:'POST',headers:ctx.headers,body:JSON.stringify({p_trade:null})}),data=await response.json().catch(()=>[]);
      if(!response.ok)throw new Error(data.message||`Company pricing request failed (${response.status}). Run the V51 Company Pricing migration.`);
      if(!Array.isArray(data))throw new Error('Company pricing returned an invalid response.');
      rows=data.map(item=>({catalogue_id:item.catalogue_id,item_key:item.item_key,item_code:item.item_code,trade:item.trade,sort_order:Number(item.sort_order),name:item.item_name,unit:item.unit||'each',default_price:Number(item.default_price),custom_price:item.custom_price==null?null:Number(item.custom_price),builder_rate:Number(item.effective_price),customer_margin:20,is_custom:item.is_custom===true,price_source:item.is_custom===true?'custom':'default',active_price_list_id:item.active_price_list_id||null,active_price_list_name:item.active_price_list_name||'',active:true,source:item.is_custom===true?'company-price-list':'default-catalogue',verification_status:'approved',verified_at:item.updated_at||new Date().toISOString(),updated_at:item.updated_at||new Date().toISOString()}));
      deriveMetadata();applyCalculator();global.dispatchEvent(new CustomEvent('ac-catalogue-changed',{detail:{rows:list(),security:{...securityState}}}));return list();
    }catch(error){
      rows=[];securityState.verified=false;securityState.pricing_ready=false;securityState.error=error.message||'Company pricing unavailable.';applyCalculator();global.dispatchEvent(new CustomEvent('ac-catalogue-security',{detail:{...securityState}}));console.warn('AC company pricing unavailable:',securityState.error);return[];
    }
  }

  async function getPricingWorkspace(priceListId=null){return rpc('get_ac_company_pricing_workspace',{p_price_list_id:priceListId})}
  async function saveCompanyPrices(priceListId,changes,source='manual'){return rpc('save_ac_company_prices',{p_price_list_id:priceListId,p_changes:changes,p_change_source:source})}
  async function createPriceList(name,activate=true){return rpc('create_ac_company_price_list',{p_name:name,p_activate:activate})}
  async function activatePriceList(priceListId){return rpc('activate_ac_company_price_list',{p_price_list_id:priceListId})}
  async function deactivatePriceList(priceListId){return rpc('deactivate_ac_company_price_list',{p_price_list_id:priceListId})}
  async function init(){applyCalculator();await loadCloud();readyResolve(list())}

  global.ACPriceCatalogue={
    ready,list,rowAt,getPrice,requirePrice,priceSnapshot,snapshotForElement,effectiveRate,
    applyCalculator,applyToCatalogues,loadCloud,security:()=>({...securityState}),verifyAccess,
    tradeStatus,pricingReady,requireVerified,schema:()=>schema.map(item=>({...item})),
    getPricingWorkspace,saveCompanyPrices,createPriceList,activatePriceList,deactivatePriceList
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
