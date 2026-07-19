(function(global){
  'use strict';

  const config=global.AC_PLATFORM_CONFIG||{};
  const schema=(global.AC_CATALOGUE_DEFAULTS||[]).map(item=>({...item}));
  let rows=[];
  let securityState={verified:false,authorised:false,can_edit:false,role:'',checked_at:null,error:'',pricing_ready:false,rate_version:'',verified_at:'',effective_from:'',updated_at:'',counts:{}};
  let readyResolve;
  const ready=new Promise(resolve=>readyResolve=resolve);

  const money=value=>Number(value).toLocaleString('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2,maximumFractionDigits:2});
  const base=()=>String(config.supabaseUrl||'').replace(/\/$/,'');
  const tradeFromPath=()=>(location.pathname.match(/\/(electrical|plumbing|cladding)\//)||[])[1]||'';
  const schemaFor=trade=>schema.filter(item=>!trade||item.trade===trade).sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
  const list=trade=>rows.filter(item=>!trade||item.trade===trade).sort((a,b)=>String(a.trade).localeCompare(String(b.trade))||Number(a.sort_order)-Number(b.sort_order));

  function tradeStatus(trade){
    const expected=schemaFor(trade),loaded=list(trade),keys=new Set(loaded.map(item=>item.item_key));
    const complete=Boolean(trade)&&expected.length>0&&expected.every(item=>keys.has(item.item_key));
    const approved=loaded.length>0&&loaded.every(item=>item.verification_status==='approved'&&item.verified_at&&Number.isFinite(Number(item.builder_rate))&&Number(item.builder_rate)>=0);
    return{trade,expected:expected.length,loaded:loaded.length,complete,approved,ready:securityState.verified&&complete&&approved};
  }
  function pricingReady(trade){return trade?tradeStatus(trade).ready:securityState.pricing_ready===true}
  function effectiveRate(trade,index){const row=list(trade).find(item=>Number(item.sort_order)===Number(index));return row&&pricingReady(trade)?Number(row.builder_rate):null}

  function trustBanner(){
    let banner=document.querySelector('.ac-catalogue-trust');
    if(banner)return banner;
    const host=document.querySelector('.actions,.hero,.panel-head,main');
    if(!host)return null;
    banner=document.createElement('aside');banner.className='ac-catalogue-trust checking';banner.setAttribute('role','status');banner.innerHTML='<strong>Checking protected AC rates…</strong><span>Pricing remains locked until the server and catalogue version are verified.</span>';
    host.insertAdjacentElement(host.matches('.actions')?'afterend':'afterend',banner);
    return banner;
  }
  function renderTrust(trade){
    const banner=trustBanner();if(!banner)return;
    const status=tradeStatus(trade),date=value=>{if(!value)return'not supplied';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?String(value):parsed.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})};
    banner.className='ac-catalogue-trust '+(status.ready?'verified':'locked');
    if(status.ready){
      banner.innerHTML=`<strong>✓ Verified AC company catalogue</strong><span>${status.loaded} approved ${trade} rates • Version ${securityState.rate_version||'recorded'} • Effective ${date(securityState.effective_from||securityState.verified_at)} • Server/RLS checked ${date(securityState.checked_at)}</span>`;
    }else{
      const reason=securityState.error||(!securityState.verified?'Server authorisation has not been verified.':`${status.loaded} of ${status.expected} approved ${trade} rates are available.`);
      banner.innerHTML=`<strong>Pricing locked — verified catalogue unavailable</strong><span>${reason} No public or stale fallback price has been used. Open Account or Catalogue and complete the v27 Supabase migration.</span>`;
    }
  }
  function setCalculatorLocked(locked){
    document.documentElement.classList.toggle('ac-pricing-locked',locked);
    document.querySelectorAll('.qtyInput,.qty-btn').forEach(control=>{control.disabled=locked;control.title=locked?'Verified company rates must load before quantities can be priced.':''});
  }
  function applyCalculator(){
    const trade=tradeFromPath();if(!trade)return;
    const status=tradeStatus(trade),catalogue=list(trade),items=[...document.querySelectorAll('.item[data-rate]')];
    items.forEach((item,index)=>{
      const row=catalogue.find(candidate=>candidate.item_key===item.dataset.catalogueKey)||catalogue.find(candidate=>Number(candidate.sort_order)===index);
      if(!status.ready||!row){item.setAttribute('data-rate','0');const rate=item.querySelector('.rate');if(rate)rate.textContent='Secure verified rate required';return}
      item.dataset.catalogueKey=row.item_key;item.setAttribute('data-rate',String(row.builder_rate));const rate=item.querySelector('.rate');if(rate)rate.textContent=money(row.builder_rate)+' ex GST';
    });
    setCalculatorLocked(!status.ready);renderTrust(trade);
    const api={electrical:global.ACQuoteCalculator,plumbing:global.ACPlumbingQuote,cladding:global.ACCladdingQuote}[trade];
    if(api?.calculateTotals)api.calculateTotals();else document.querySelector('.qtyInput')?.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function applyToCatalogues(catalogues){
    Object.keys(catalogues||{}).forEach(trade=>{
      const target=catalogues[trade]?.items;if(!Array.isArray(target))return;
      list(trade).forEach(item=>{if(target[item.sort_order]){target[item.sort_order][0]=item.name||target[item.sort_order][0];target[item.sort_order][1]=Number(item.builder_rate)}});
    });
    return catalogues;
  }
  function requireVerified(trade){
    const status=tradeStatus(trade);if(!status.ready)throw new Error(`Verified ${trade} pricing is unavailable. No estimate was calculated. Open the secure Catalogue and confirm all ${status.expected} approved rates are present.`);return list(trade)
  }

  async function context(){
    await global.ACAuth?.ready;const profile=global.ACAuth?.profile();
    if(!global.ACAuth?.hasAccess?.()||!profile?.organisation_id)return null;
    return{profile,headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(await global.ACAuth.headers())}};
  }
  async function verifyAccess(ctx){
    securityState={...securityState,verified:false,authorised:false,can_edit:false,role:'',checked_at:null,error:'',pricing_ready:false,counts:{}};
    if(!ctx||!config.catalogueCloudEnabled){securityState.error=ctx?'Secure catalogue service is disabled.':'An active account is required.';return securityState}
    try{
      const response=await fetch(`${base()}/rest/v1/rpc/catalogue_access_probe`,{method:'POST',headers:ctx.headers,body:'{}'}),data=await response.json().catch(()=>({}));
      if(!response.ok||data.authorised!==true)throw new Error(data.message||`Server access check failed (${response.status}).`);
      securityState={...securityState,verified:true,authorised:true,can_edit:data.can_edit===true,role:data.role||'',checked_at:data.checked_at||new Date().toISOString(),error:''};
    }catch(error){securityState.error=error.message||'The server could not verify catalogue access.'}
    global.dispatchEvent(new CustomEvent('ac-catalogue-security',{detail:{...securityState}}));return securityState;
  }
  function deriveMetadata(){
    const sorted=[...rows].sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))),latest=sorted[0]||{},versions=[...new Set(rows.map(row=>row.rate_version).filter(Boolean))];
    securityState.rate_version=versions.length===1?versions[0]:(versions.length?`${versions.length} approved versions`:'');securityState.verified_at=latest.verified_at||'';securityState.effective_from=latest.effective_from||'';securityState.updated_at=latest.updated_at||'';
    securityState.counts=Object.fromEntries(['electrical','plumbing','cladding'].map(trade=>[trade,tradeStatus(trade)]));securityState.pricing_ready=['electrical','plumbing','cladding'].every(trade=>securityState.counts[trade].ready);
  }
  async function loadCloud(){
    rows=[];applyCalculator();const ctx=await context(),access=await verifyAccess(ctx);if(!access.verified){applyCalculator();return[]}
    try{
      const query=`${base()}/rest/v1/price_catalogue?organisation_id=eq.${encodeURIComponent(ctx.profile.organisation_id)}&active=eq.true&verification_status=eq.approved&select=item_key,trade,sort_order,item_name,unit,builder_rate,margin_percent,active,source,source_reference,verification_status,rate_version,effective_from,verified_at,verified_by,updated_at&order=trade,sort_order`;
      const response=await fetch(query,{headers:ctx.headers});if(!response.ok)throw new Error(`Protected catalogue request failed (${response.status}). Run the v27 trusted-catalogue migration.`);
      rows=(await response.json()).map(item=>({...item,name:item.item_name,customer_margin:Number(item.margin_percent),builder_rate:Number(item.builder_rate)}));deriveMetadata();applyCalculator();global.dispatchEvent(new CustomEvent('ac-catalogue-changed',{detail:{rows:list(),security:{...securityState}}}));return list();
    }catch(error){rows=[];securityState.verified=false;securityState.pricing_ready=false;securityState.error=error.message||'Protected catalogue unavailable.';applyCalculator();global.dispatchEvent(new CustomEvent('ac-catalogue-security',{detail:{...securityState}}));console.warn('AC protected catalogue unavailable:',securityState.error);return[]}
  }
  async function save(item){
    const ctx=await context();if(!ctx||!config.catalogueCloudEnabled)throw new Error('Secure catalogue service is unavailable. No local-only price change was made.');
    if(!securityState.verified)await verifyAccess(ctx);if(!securityState.verified||!securityState.can_edit)throw new Error(securityState.error||'The server did not authorise catalogue editing.');
    const payload={organisation_id:ctx.profile.organisation_id,item_key:item.item_key,trade:item.trade,sort_order:Number(item.sort_order),item_name:String(item.name||'').trim(),unit:item.unit||'each',builder_rate:Number(item.builder_rate),margin_percent:Number(item.customer_margin||20),active:item.active!==false,source:item.source||'Office-approved rate',source_reference:String(item.source_reference||'').trim(),effective_from:item.effective_from||new Date().toISOString().slice(0,10),updated_by:global.ACAuth.user()?.id||null};
    if(!payload.item_name||!Number.isFinite(payload.builder_rate)||payload.builder_rate<0)throw new Error('Enter a valid item name and non-negative approved rate.');
    if(!payload.source_reference)throw new Error('An approved invoice, supplier list or internal rate-card reference is required before saving.');
    const response=await fetch(`${base()}/rest/v1/price_catalogue?on_conflict=organisation_id,item_key`,{method:'POST',headers:{...ctx.headers,Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)}),data=await response.json().catch(()=>[]);
    if(!response.ok)throw new Error((data&&data.message)||`Catalogue save failed (${response.status}).`);await loadCloud();return list().find(row=>row.item_key===item.item_key)||item;
  }
  async function init(){applyCalculator();await loadCloud();readyResolve(list())}

  global.ACPriceCatalogue={ready,list,effectiveRate,applyCalculator,applyToCatalogues,loadCloud,save,security:()=>({...securityState}),verifyAccess,tradeStatus,pricingReady,requireVerified,schema:()=>schema.map(item=>({...item}))};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
