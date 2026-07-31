(function(){
  'use strict';
  const $=id=>document.getElementById(id),api=window.ACFinanceAPI,params=new URLSearchParams(location.search),preview=params.get('preview')==='1',previewRole=params.get('role')||'owner';
  let state={viewer:null,permissions:{},projects:[],transactions:[],payments:[],budgets:[],project_totals:[],members:[],invoice_summary:{count:0,balance_due:0,overdue_count:0},from:'',to:'',projectId:'',tab:'overview',editing:null,paying:null};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0};
  const cents=value=>Math.round((number(value)+Number.EPSILON)*100);
  const dollars=value=>Math.round(number(value))/100;
  const money=value=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',currencyDisplay:'narrowSymbol',maximumFractionDigits:0}).format(number(value)).replace(/^A\$/,'A$');
  const moneyFull=value=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',currencyDisplay:'narrowSymbol',minimumFractionDigits:2,maximumFractionDigits:2}).format(number(value)).replace(/^A\$/,'A$');
  const today=()=>{const date=new Date(),offset=date.getTimezoneOffset();return new Date(date.getTime()-offset*60000).toISOString().slice(0,10)};
  const shift=(value,days)=>{const date=new Date(`${value}T00:00:00`);date.setDate(date.getDate()+days);return date.toISOString().slice(0,10)};
  const roleLabel=value=>({owner:'Owner',admin:'Admin',manager:'Project Manager',estimator:'Estimator',site_supervisor:'Site Supervisor',worker:'Worker'})[value]||String(value||'Team member').replace(/_/g,' ');
  const project=id=>state.projects.find(item=>item.id===id)||null;
  const projectName=id=>project(id)?.name||'No linked project';
  const dateLabel=value=>value?new Date(`${String(value).slice(0,10)}T00:00:00`).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'—';
  const statusClass=value=>String(value||'').toLowerCase().replace(/\s+/g,'-');
  const uid=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  function permissions(role=previewRole){
    if(role==='owner')return{can_open:true,scope:'company',can_view_dashboard:true,can_manage_transactions:true,can_submit_expense:true,can_record_payments:true,can_approve:true,can_manage_budgets:true,can_manage_access:true,can_export:true,approval_limit:null};
    if(role==='admin')return{can_open:true,scope:'company',can_view_dashboard:true,can_manage_transactions:true,can_submit_expense:true,can_record_payments:true,can_approve:true,can_manage_budgets:true,can_manage_access:false,can_export:true,approval_limit:5000,finance_enabled:true};
    if(role==='manager')return{can_open:true,scope:'assigned',can_view_dashboard:false,can_manage_transactions:true,can_submit_expense:true,can_record_payments:false,can_approve:false,can_manage_budgets:false,can_manage_access:false,can_export:true,approval_limit:0};
    if(role==='estimator')return{can_open:true,scope:'assigned',can_view_dashboard:false,can_manage_transactions:false,can_submit_expense:false,can_record_payments:false,can_approve:false,can_manage_budgets:false,can_manage_access:false,can_export:false,approval_limit:0};
    return{can_open:true,scope:'own',can_view_dashboard:false,can_manage_transactions:false,can_submit_expense:true,can_record_payments:false,can_approve:false,can_manage_budgets:false,can_manage_access:false,can_export:false,approval_limit:0};
  }
  function previewData(){
    const viewerId={owner:'owner-preview',admin:'admin-preview',manager:'manager-preview',estimator:'estimator-preview',site_supervisor:'supervisor-preview',worker:'worker-preview'}[previewRole]||'owner-preview';
    const projects=[
      {id:'project-rowville',name:'Rowville Renovation',address:'Rowville VIC',assigned:true},
      {id:'project-glen',name:'Glen Waverley Extension',address:'Glen Waverley VIC',assigned:!['worker','site_supervisor'].includes(previewRole)},
      {id:'project-mitcham',name:'Mitcham Townhouses',address:'Mitcham VIC',assigned:previewRole==='owner'||previewRole==='admin'}
    ].filter(item=>previewRole==='owner'||previewRole==='admin'||item.assigned);
    const rows=[
      {id:'fin-1',entry_kind:'income',project_id:'project-rowville',category:'Progress Claim',counterparty:'Dawson Family',description:'Stage 3 progress claim',reference_no:'INV-2026-0041',transaction_date:shift(today(),-75),due_date:shift(today(),-61),amount_ex_gst:42000,gst_amount:4200,amount_inc_gst:46200,paid_amount_inc_gst:46200,payment_status:'Paid',payment_date:shift(today(),-58),status:'Approved',created_by:'owner-preview'},
      {id:'fin-2',entry_kind:'expense',project_id:'project-rowville',category:'Materials',counterparty:'Bowens',description:'Framing timber and fixings',reference_no:'BW-28914',transaction_date:shift(today(),-68),due_date:shift(today(),-38),amount_ex_gst:12640,gst_amount:1264,amount_inc_gst:13904,paid_amount_inc_gst:13904,payment_status:'Paid',payment_date:shift(today(),-40),status:'Approved',created_by:'admin-preview'},
      {id:'fin-3',entry_kind:'income',project_id:'project-glen',category:'Progress Claim',counterparty:'Horizon Developments',description:'Extension framing claim',reference_no:'INV-2026-0047',transaction_date:shift(today(),-43),due_date:shift(today(),-29),amount_ex_gst:58500,gst_amount:5850,amount_inc_gst:64350,paid_amount_inc_gst:30000,payment_status:'Partially Paid',payment_date:shift(today(),-24),status:'Approved',created_by:'owner-preview'},
      {id:'fin-4',entry_kind:'expense',project_id:'project-glen',category:'Subcontractors',counterparty:'Metro Plumbing',description:'Rough-in labour and materials',reference_no:'MP-7732',transaction_date:shift(today(),-38),due_date:shift(today(),-10),amount_ex_gst:18400,gst_amount:1840,amount_inc_gst:20240,paid_amount_inc_gst:0,payment_status:'Unpaid',payment_date:null,status:'Approved',created_by:'manager-preview'},
      {id:'fin-5',entry_kind:'expense',project_id:'project-rowville',category:'Equipment',counterparty:'Kennards Hire',description:'Scaffold hire extension',reference_no:'KH-10294',transaction_date:shift(today(),-12),due_date:shift(today(),2),amount_ex_gst:2900,gst_amount:290,amount_inc_gst:3190,paid_amount_inc_gst:0,payment_status:'Unpaid',payment_date:null,status:'Pending Approval',created_by:'supervisor-preview',receipt_name:'kennards-receipt.pdf',receipt_path:'preview/receipt'},
      {id:'fin-6',entry_kind:'income',project_id:'project-rowville',category:'Variation',counterparty:'Dawson Family',description:'Approved kitchen joinery variation',reference_no:'VAR-014',transaction_date:shift(today(),-8),due_date:shift(today(),6),amount_ex_gst:8700,gst_amount:870,amount_inc_gst:9570,paid_amount_inc_gst:0,payment_status:'Unpaid',payment_date:null,status:'Draft',created_by:'manager-preview'},
      {id:'fin-7',entry_kind:'expense',project_id:'project-rowville',category:'Materials',counterparty:'Bunnings',description:'Site consumables',reference_no:'BN-882103',transaction_date:shift(today(),-2),due_date:today(),amount_ex_gst:286.36,gst_amount:28.64,amount_inc_gst:315,paid_amount_inc_gst:315,payment_status:'Paid',payment_date:shift(today(),-2),status:'Pending Approval',created_by:'worker-preview',receipt_name:'bunnings.jpg',receipt_path:'preview/receipt2'}
    ];
    const visible=previewRole==='owner'||previewRole==='admin'?rows:previewRole==='manager'?rows.filter(item=>projects.some(p=>p.id===item.project_id)):previewRole==='estimator'?[]:rows.filter(item=>item.created_by===viewerId);
    const payments=['owner','admin'].includes(previewRole)?rows.filter(item=>item.status==='Approved'&&number(item.paid_amount_inc_gst)>0).map(item=>({id:`pay-${item.id}`,transaction_id:item.id,project_id:item.project_id,entry_kind:item.entry_kind,amount_inc_gst:item.paid_amount_inc_gst,payment_date:item.payment_date,payment_method:item.payment_method||'Bank Transfer',reference_no:item.reference_no})).filter(item=>item.payment_date>=state.from&&item.payment_date<=state.to):[];
    const projectTotals=['owner','admin','manager'].includes(previewRole)?projects.map(item=>{
      const entries=rows.filter(row=>row.project_id===item.id&&row.status==='Approved');
      return{project_id:item.id,revenue:entries.filter(row=>row.entry_kind==='income').reduce((sum,row)=>sum+number(row.amount_ex_gst),0),actual_cost:entries.filter(row=>row.entry_kind==='expense').reduce((sum,row)=>sum+number(row.amount_ex_gst),0)};
    }):[];
    return{
      viewer:{id:viewerId,role:previewRole,full_name:roleLabel(previewRole)},
      permissions:permissions(previewRole),
      projects,
      transactions:visible,
      payments,
      budgets:[
        {project_id:'project-rowville',original_budget:175000,approved_variations:8700,revenue_forecast:215000,committed_cost:6500,cost_to_complete:59000,notes:'Fit-off and landscaping remaining.'},
        {project_id:'project-glen',original_budget:240000,approved_variations:12500,revenue_forecast:290000,committed_cost:18400,cost_to_complete:148000,notes:'Framing stage.'},
        {project_id:'project-mitcham',original_budget:510000,approved_variations:0,revenue_forecast:620000,committed_cost:0,cost_to_complete:460000,notes:'Early works.'}
      ].filter(item=>projects.some(project=>project.id===item.project_id)),
      project_totals:projectTotals,
      members:[
        {id:'admin-preview',full_name:'Office Admin',email:'admin@alertconstruction.com.au',role:'admin',finance_permission:{finance_enabled:true,can_view_company_dashboard:true,can_manage_transactions:true,can_manage_budgets:true,can_approve:true,can_export:true,approval_limit:5000}},
        {id:'manager-preview',full_name:'Sarah Chen',email:'sarah@alertconstruction.com.au',role:'manager',finance_permission:null}
      ],
      invoice_summary:{count:4,balance_due:43850,overdue_count:1}
    };
  }

  function setPeriod(value=$('financePeriod')?.value||'financial-year'){
    const now=today();let from,to=now;
    if(value==='30'){from=shift(now,-29)}
    else if(value==='90'){from=shift(now,-89)}
    else if(value==='365'){from=shift(now,-364)}
    else if(value==='financial-year'){
      const date=new Date(`${now}T00:00:00`),year=date.getMonth()>=6?date.getFullYear():date.getFullYear()-1;
      from=`${year}-07-01`;to=`${year+1}-06-30`;
    }else if(value==='custom'){
      from=$('financeFrom').value||shift(now,-89);to=$('financeTo').value||now;
    }
    state.from=from;state.to=to;$('financeFrom').value=from;$('financeTo').value=to;
    document.querySelectorAll('.finance-custom-date').forEach(item=>item.hidden=value!=='custom');
  }
  async function load(){
    try{
      if(!state.from)setPeriod();
      const result=preview?previewData():await api.snapshot(state.from,state.to,state.projectId);
      state={...state,...result,permissions:{...result.permissions},transactions:Array.isArray(result.transactions)?result.transactions:[],payments:Array.isArray(result.payments)?result.payments:[],projects:Array.isArray(result.projects)?result.projects:[],budgets:Array.isArray(result.budgets)?result.budgets:[],project_totals:Array.isArray(result.project_totals)?result.project_totals:[],members:Array.isArray(result.members)?result.members:[],invoice_summary:result.invoice_summary||{count:0,balance_due:0,overdue_count:0}};
      renderAll();applyRoleUI();applyRoute();
    }catch(error){
      const authorised=preview||window.ACAuth?.canUseTool?.('finance')===true;
      $('financeNav').hidden=!authorised;
      $('financeView').innerHTML=`<div class="page-head"><div><div class="eyebrow">Commercial &amp; Finance</div><h1>Financial Data.</h1><p>The Finance workspace is available for this role, but its data could not be loaded.</p></div><div class="page-actions"><button class="btn primary" id="financeRetry" type="button">Try Again</button></div></div><div class="finance-no-access"><strong>${esc(error.message)}</strong><br><br>${authorised?'Run the V50 Finance repair SQL once, then select Try Again.':'This account does not currently have Finance access.'}</div>`;
      $('financeRetry')?.addEventListener('click',()=>location.reload());
      window.ACRefreshSideGroups?.();
    }
  }

  function approved(){return state.transactions.filter(item=>item.status==='Approved')}
  function inPeriod(value){return Boolean(value&&String(value).slice(0,10)>=state.from&&String(value).slice(0,10)<=state.to)}
  function effectivePayments(){
    const rows=[...state.payments];
    approved().forEach(item=>{
      if(number(item.paid_amount_inc_gst)<=0||!item.payment_date||rows.some(payment=>payment.transaction_id===item.id))return;
      rows.push({id:`transaction-paid-${item.id}`,transaction_id:item.id,project_id:item.project_id,entry_kind:item.entry_kind,amount_inc_gst:number(item.paid_amount_inc_gst),payment_date:item.payment_date,payment_method:item.payment_method||'',reference_no:item.reference_no||''});
    });
    return rows;
  }
  function summary(){
    const rows=approved().filter(item=>inPeriod(item.transaction_date)),income=rows.filter(item=>item.entry_kind==='income'),expenses=rows.filter(item=>item.entry_kind==='expense'),cashRows=effectivePayments().filter(item=>inPeriod(item.payment_date));
    const revenue=income.reduce((sum,item)=>sum+number(item.amount_ex_gst),0);
    const expense=expenses.reduce((sum,item)=>sum+number(item.amount_ex_gst),0);
    const cashIn=cashRows.filter(item=>item.entry_kind==='income').reduce((sum,item)=>sum+number(item.amount_inc_gst),0);
    const cashOut=cashRows.filter(item=>item.entry_kind==='expense').reduce((sum,item)=>sum+number(item.amount_inc_gst),0);
    const forecasts=state.projects.map(item=>projectMetrics(item.id)),committed=forecasts.reduce((sum,item)=>sum+item.committed,0),costToComplete=forecasts.reduce((sum,item)=>sum+number(item.budget.cost_to_complete),0),forecastRevenue=forecasts.reduce((sum,item)=>sum+item.forecastRevenue,0)||revenue,forecastProfit=forecasts.reduce((sum,item)=>sum+item.profit,0);
    return{revenue,expense,cashIn,cashOut,netCash:cashIn-cashOut,committed,profit:revenue-expense,forecastRevenue,costToComplete,forecastProfit};
  }
  function setCard(id,value,meta){$(id).textContent=money(value);const target=$(`${id}Meta`);if(target)target.textContent=meta}
  function renderCards(){
    const data=summary(),invoice=state.invoice_summary||{};
    setCard('financeCashIn',data.cashIn,'Payments received · GST inclusive');
    setCard('financeCashOut',data.cashOut,'Payments made · GST inclusive');
    setCard('financeNetCash',data.netCash,data.netCash>=0?'Positive cash position':'Cash out exceeds cash in');
    setCard('financeOutstanding',number(invoice.balance_due),`${number(invoice.count)} unpaid · ${number(invoice.overdue_count)} overdue`);
    setCard('financeForecast',data.forecastProfit,'Forecast revenue less final forecast cost');
    $('financeNetCashCard').classList.toggle('negative',data.netCash<0);$('financeForecastCard').classList.toggle('negative',data.forecastProfit<0);
  }
  function monthKey(value){return String(value||'').slice(0,7)}
  function monthParts(value){
    const match=String(value||'').match(/^(\d{4})-(\d{2})/);
    return match?{year:Number(match[1]),month:Number(match[2])}:null;
  }
  function monthToken(year,month){return`${year}-${String(month).padStart(2,'0')}`}
  function nextMonth(value){
    const parts=monthParts(value);if(!parts)return'';
    const month=parts.month===12?1:parts.month+1,year=parts.month===12?parts.year+1:parts.year;
    return monthToken(year,month);
  }
  function monthLabel(key){
    const parts=monthParts(key);
    return parts?new Intl.DateTimeFormat('en-AU',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(parts.year,parts.month-1,1))):key;
  }
  function monthlySeries(){
    const keys=[],end=monthKey(state.to);let cursor=monthKey(state.from),guard=0;
    while(cursor&&cursor<=end&&guard++<18){keys.push(cursor);cursor=nextMonth(cursor)}
    const active=keys.length>12?keys.slice(-12):keys;
    const rows=approved(),payments=effectivePayments().filter(item=>inPeriod(item.payment_date));
    return active.map(key=>{const income=rows.filter(item=>item.entry_kind==='income'&&monthKey(item.transaction_date)===key).reduce((sum,item)=>sum+number(item.amount_ex_gst),0),expense=rows.filter(item=>item.entry_kind==='expense'&&monthKey(item.transaction_date)===key).reduce((sum,item)=>sum+number(item.amount_ex_gst),0),cashIn=payments.filter(item=>item.entry_kind==='income'&&monthKey(item.payment_date)===key).reduce((sum,item)=>sum+number(item.amount_inc_gst),0),cashOut=payments.filter(item=>item.entry_kind==='expense'&&monthKey(item.payment_date)===key).reduce((sum,item)=>sum+number(item.amount_inc_gst),0);return{key,label:monthLabel(key),income,expense,cashIn,cashOut,net:cashIn-cashOut}});
  }
  function niceMaximum(values){
    const highest=Math.max(0,...values);if(highest<=0)return 0;
    const magnitude=10**Math.floor(Math.log10(highest)),normalised=highest/magnitude;
    const step=normalised<=1?1:normalised<=2?2:normalised<=5?5:10;
    return step*magnitude;
  }
  function axisMoney(value){
    if(value>=1000000)return`$${(value/1000000).toFixed(value>=10000000?0:1)}m`;
    if(value>=1000)return`$${(value/1000).toFixed(value>=10000?0:1)}k`;
    return money(value);
  }
  function emptyChart(message){return`<div class="finance-chart-empty"><strong>No chart data yet</strong><span>${esc(message)}</span></div>`}
  function lineChart(data){
    const values=data.flatMap(item=>[item.income,item.expense]),max=niceMaximum(values);
    if(!max)return emptyChart('Add and approve an income or expense entry in this reporting period.');
    const width=760,height=260,padLeft=58,padRight=26,padTop=20,padBottom=34,x=index=>padLeft+(width-padLeft-padRight)*(data.length===1?.5:index/(data.length-1)),y=value=>height-padBottom-(height-padTop-padBottom)*value/max;
    const line=key=>data.map((item,index)=>`${index?'L':'M'}${x(index).toFixed(1)},${y(item[key]).toFixed(1)}`).join(' ');
    const grid=[0,.25,.5,.75,1].map(ratio=>{const gridY=y(max*ratio);return`<line x1="${padLeft}" y1="${gridY.toFixed(1)}" x2="${width-padRight}" y2="${gridY.toFixed(1)}"></line><text x="${padLeft-8}" y="${(gridY+3).toFixed(1)}" text-anchor="end">${esc(axisMoney(max*ratio))}</text>`}).join('');
    const labels=data.map((item,index)=>`<text x="${x(index)}" y="${height-8}" text-anchor="middle">${esc(item.label)}</text>`).join('');
    const points=key=>data.map((item,index)=>`<circle cx="${x(index)}" cy="${y(item[key])}" r="3"><title>${esc(item.label)} · ${key==='income'?'Income':'Expenses'} ${esc(moneyFull(item[key]))}</title></circle>`).join('');
    return`<svg class="finance-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Approved income and expense trend"><g class="finance-grid">${grid}</g><g class="finance-axis">${labels}</g><path class="finance-line income" d="${line('income')}"></path><path class="finance-line expense" d="${line('expense')}"></path><g class="finance-points income">${points('income')}</g><g class="finance-points expense">${points('expense')}</g></svg>`;
  }
  function barChart(data){
    const max=niceMaximum(data.flatMap(item=>[item.cashIn,item.cashOut]));
    if(!max)return emptyChart('Record a payment against an approved income or expense entry to update cash flow.');
    return`<div class="finance-bars">${data.map(item=>`<div class="finance-bar-group"><div class="finance-bar-pair"><i class="income" style="height:${item.cashIn?Math.max(2,item.cashIn/max*100):0}%" title="Cash received ${esc(moneyFull(item.cashIn))}"></i><i class="expense" style="height:${item.cashOut?Math.max(2,item.cashOut/max*100):0}%" title="Cash paid ${esc(moneyFull(item.cashOut))}"></i></div><span>${esc(item.label)}</span><small>${item.cashIn||item.cashOut?`${esc(money(item.cashIn))} / ${esc(money(item.cashOut))}`:'—'}</small></div>`).join('')}</div>`;
  }
  function renderCharts(){
    const data=monthlySeries();$('financeCashChart').innerHTML=lineChart(data);$('financeCompareChart').innerHTML=barChart(data);
    const updated=$('financeChartUpdated');if(updated)updated.textContent=`Live data · updated ${new Date().toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})}`;
    const categories=new Map();approved().filter(item=>item.entry_kind==='expense'&&inPeriod(item.transaction_date)).forEach(item=>categories.set(item.category||'Other',(categories.get(item.category||'Other')||0)+number(item.amount_ex_gst)));
    const rows=[...categories.entries()].sort((a,b)=>b[1]-a[1]),total=rows.reduce((sum,row)=>sum+row[1],0),colours=['#f5b400','#ff7b72','#83b7ff','#40d18a','#b48cff','#f29f67','#9fa4a2'];
    let start=0;const stops=rows.map((row,index)=>{const end=start+(total?row[1]/total*100:0),value=`${colours[index%colours.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;start=end;return value});
    $('financeDonut').style.background=rows.length?`conic-gradient(${stops.join(',')})`:'#252828';
    $('financeExpenseLegend').innerHTML=rows.map((row,index)=>`<div><i style="background:${colours[index%colours.length]}"></i><span>${esc(row[0])}</span><strong>${esc(money(row[1]))}</strong></div>`).join('')||'<span class="finance-empty">No approved expenses in this period.</span>';
  }
  function transactionRows(kind){
    const rows=state.transactions.filter(item=>(!kind||item.entry_kind===kind)&&inPeriod(item.transaction_date)).sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date)));
    return rows.map(item=>{
      const own=item.created_by===state.viewer?.id,draft=item.status==='Draft',canEdit=draft&&(own||state.permissions.can_manage_transactions),canVoid=item.status==='Approved'&&state.viewer?.role==='owner',balance=Math.max(0,number(item.amount_inc_gst)-number(item.paid_amount_inc_gst)),canPay=item.status==='Approved'&&balance>.004&&state.permissions.can_record_payments;
      return`<tr data-finance-row="${esc(item.id)}"><td><strong>${esc(item.counterparty||'Unspecified')}</strong><span>${esc(item.description||item.reference_no||'Finance entry')}</span></td><td>${esc(projectName(item.project_id))}</td><td>${esc(item.category||'Other')}</td><td>${esc(dateLabel(item.transaction_date))}</td><td class="finance-amount">${esc(moneyFull(item.amount_inc_gst))}<span>${esc(moneyFull(item.amount_ex_gst))} ex GST</span></td><td><span class="finance-status ${statusClass(item.status)}">${esc(item.status)}</span><span class="finance-payment">${esc(item.payment_status||'Unpaid')}${balance>0?` · ${esc(moneyFull(balance))} due`:''}</span></td><td><div class="finance-row-actions">${item.receipt_path?`<button type="button" data-finance-action="receipt">Receipt</button>`:''}${canPay?`<button type="button" data-finance-action="payment">Record Payment</button>`:''}${canEdit?`<button type="button" data-finance-action="edit">Edit</button>`:''}${canVoid?`<button class="danger" type="button" data-finance-action="void">Void</button>`:''}</div></td></tr>`;
    }).join('');
  }
  function renderTransactions(){
    $('financeIncomeRows').innerHTML=transactionRows('income')||'<tr><td colspan="7"><div class="finance-empty">No income entries match this period.</div></td></tr>';
    $('financeExpenseRows').innerHTML=transactionRows('expense')||'<tr><td colspan="7"><div class="finance-empty">No expense entries match this period.</div></td></tr>';
  }
  function projectMetrics(projectId){
    const rows=approved().filter(item=>item.project_id===projectId),totals=state.project_totals.find(item=>item.project_id===projectId),income=totals?number(totals.revenue):rows.filter(item=>item.entry_kind==='income').reduce((sum,item)=>sum+number(item.amount_ex_gst),0),expense=totals?number(totals.actual_cost):rows.filter(item=>item.entry_kind==='expense').reduce((sum,item)=>sum+number(item.amount_ex_gst),0),budget=state.budgets.find(item=>item.project_id===projectId)||{},committed=number(budget.committed_cost),forecastCost=expense+committed+number(budget.cost_to_complete),forecastRevenue=number(budget.revenue_forecast)||income,profit=forecastRevenue-forecastCost,margin=forecastRevenue?profit/forecastRevenue*100:0,available=number(budget.original_budget)+number(budget.approved_variations)-forecastCost;
    return{income,expense,committed,budget,forecastCost,forecastRevenue,profit,margin,available};
  }
  function renderBudgets(){
    $('financeBudgetRows').innerHTML=state.projects.map(item=>{const data=projectMetrics(item.id),limit=number(data.budget.original_budget)+number(data.budget.approved_variations),used=limit?Math.max(0,Math.min(100,data.forecastCost/limit*100)):0;return`<tr data-budget-project="${esc(item.id)}"><td><strong>${esc(item.name)}</strong><span>${esc(item.address||'')}</span></td><td>${esc(money(data.budget.original_budget))}</td><td data-finance-actual-cost>${esc(money(data.expense))}</td><td>${esc(money(data.committed))}</td><td>${esc(money(data.budget.cost_to_complete))}</td><td><div class="finance-budget-track"><i style="width:${used.toFixed(1)}%"></i></div><span>${esc(money(data.forecastCost))}</span></td><td class="${data.available<0?'negative':''}">${esc(money(data.available))}</td><td><button type="button" data-finance-budget-open>${state.permissions.can_manage_budgets?'Manage':'View'}</button></td></tr>`}).join('')||'<tr><td colspan="8"><div class="finance-empty">No authorised projects are available.</div></td></tr>';
    $('financeProfitRows').innerHTML=state.projects.map(item=>{const data=projectMetrics(item.id);return`<tr><td><strong>${esc(item.name)}</strong></td><td>${esc(money(data.forecastRevenue))}</td><td>${esc(money(data.forecastCost))}</td><td class="${data.profit<0?'negative':'positive'}">${esc(money(data.profit))}</td><td>${data.margin.toFixed(1)}%</td></tr>`}).join('');
  }
  function renderApprovals(){
    const rows=state.transactions.filter(item=>item.status==='Pending Approval').sort((a,b)=>String(a.transaction_date).localeCompare(String(b.transaction_date)));
    $('financeApprovalList').innerHTML=rows.map(item=>`<article class="finance-approval" data-finance-approval="${esc(item.id)}"><div class="finance-approval-icon">${item.entry_kind==='income'?'↓':'↑'}</div><div><span>${esc(item.entry_kind==='income'?'Income':'Expense')} · ${esc(item.category||'Other')}</span><strong>${esc(item.counterparty||item.description||'Finance entry')}</strong><small>${esc(projectName(item.project_id))} · ${esc(dateLabel(item.transaction_date))}${item.reference_no?' · '+esc(item.reference_no):''}</small></div><b>${esc(moneyFull(item.amount_inc_gst))}</b><div class="finance-approval-actions">${item.receipt_path?'<button type="button" data-finance-approval-action="receipt">Receipt</button>':''}${state.permissions.can_approve?'<button class="reject" type="button" data-finance-approval-action="reject">Reject</button><button class="approve" type="button" data-finance-approval-action="approve">Approve</button>':'<span>Awaiting Owner approval</span>'}</div></article>`).join('')||'<div class="finance-empty">No entries are waiting for approval.</div>';
    ['financeApprovalsBadge','financeApprovalsTabBadge'].forEach(id=>{const badge=$(id);if(!badge)return;badge.textContent=rows.length;badge.classList.toggle('show',rows.length>0)});
  }
  function renderAccess(){
    $('financeAccessList').innerHTML=state.members.filter(item=>item.role==='admin').map(item=>{const value=item.finance_permission||{};return`<article class="finance-access-card" data-finance-user="${esc(item.id)}"><div><strong>${esc(item.full_name||item.email)}</strong><span>${esc(item.email||'Admin account')}</span></div><label><input type="checkbox" data-permission="finance_enabled" ${value.finance_enabled?'checked':''}> Finance access</label><label><input type="checkbox" data-permission="can_view_company_dashboard" ${value.can_view_company_dashboard?'checked':''}> Company dashboard</label><label><input type="checkbox" data-permission="can_manage_transactions" ${value.can_manage_transactions?'checked':''}> Manage entries</label><label><input type="checkbox" data-permission="can_manage_budgets" ${value.can_manage_budgets?'checked':''}> Manage budgets</label><label><input type="checkbox" data-permission="can_approve" ${value.can_approve?'checked':''}> Approve entries</label><label><input type="checkbox" data-permission="can_export" ${value.can_export?'checked':''}> Export reports</label><label>Approval limit<input type="number" min="0" step="100" data-permission="approval_limit" value="${esc(value.approval_limit||0)}"></label><button class="btn primary" type="button" data-finance-save-access>Save access</button></article>`}).join('')||'<div class="finance-empty">No Admin accounts are available. Admin finance access is off by default.</div>';
  }
  function syncOperationsOverview(){
    if(!window.ACOperationsOverview?.setFinance)return;
    const totals=state.projects.map((item,index)=>{
      const data=projectMetrics(item.id),limit=number(data.budget.original_budget)+number(data.budget.approved_variations),used=limit?(data.expense+data.committed)/limit*100:0;
      return{...item,progress:preview?[68,55,32][index]??Math.min(100,used):Math.min(130,used),status:used>100?'Budget exceeded':'In progress',reference:preview?`ATP-${String(index+1).padStart(3,'0')}`:'Operation Hub',start:preview?'15 Jan 2026':'—',finish:preview?'28 Nov 2026':'—',budget:limit,actual:data.expense,committed:data.committed,forecast:data.forecastCost,revenue:data.forecastRevenue,profit:data.profit};
    });
    const data=summary(),budget=totals.reduce((sum,item)=>sum+number(item.budget),0),actual=totals.reduce((sum,item)=>sum+number(item.actual),0),committed=totals.reduce((sum,item)=>sum+number(item.committed),0),forecast=totals.reduce((sum,item)=>sum+number(item.forecast),0);
    const categories=new Map();approved().filter(item=>item.entry_kind==='expense'&&inPeriod(item.transaction_date)).forEach(item=>categories.set(item.category||'Other',(categories.get(item.category||'Other')||0)+number(item.amount_ex_gst)));
    const weekAgo=shift(today(),-6),weeklyRevenue=approved().filter(item=>item.entry_kind==='income'&&String(item.transaction_date||'').slice(0,10)>=weekAgo&&String(item.transaction_date||'').slice(0,10)<=today()).reduce((sum,item)=>sum+number(item.amount_ex_gst),0);
    window.ACOperationsOverview.setFinance({
      permissions:state.permissions,
      projects:totals,
      summary:data,
      budget,
      actual,
      committed,
      forecast,
      weeklyRevenue,
      approvalCount:state.transactions.filter(item=>item.status==='Pending Approval').length,
      overdueCount:number(state.invoice_summary?.overdue_count),
      categories:[...categories.entries()].sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}))
    });
  }
  function renderAll(){renderCards();renderCharts();renderTransactions();renderBudgets();renderApprovals();renderAccess();syncOperationsOverview()}

  function applyRoleUI(){
    const p=state.permissions||{},role=state.viewer?.role||previewRole,scope=p.scope||'own';
    $('financeNav').hidden=!p.can_open;
    const copy=role==='owner'?'Full company finance control, approvals and audit-safe voids.':role==='admin'?'Finance-enabled Admin access set by the Owner.':role==='manager'?'Assigned projects only. Company-wide profit, payroll and private Owner information stay hidden.':role==='estimator'?'Read-only estimate and assigned-project budget values. Transactions and company profit stay hidden.':'Submit and track only your own project expense claims.';
    $('financeRoleNotice').innerHTML=`<strong>${esc(roleLabel(role))} · ${esc(scope==='company'?'Company scope':scope==='assigned'?'Assigned projects':'Own submissions')}</strong><span>${esc(copy)}</span>`;
    document.querySelectorAll('[data-finance-company-only]').forEach(item=>item.hidden=!p.can_view_dashboard);
    document.querySelectorAll('[data-finance-manage]').forEach(item=>item.hidden=!p.can_manage_transactions);
    document.querySelectorAll('[data-finance-expense-submit]').forEach(item=>item.hidden=!(p.can_manage_transactions||p.can_submit_expense));
    const expenseTab=document.querySelector('[data-finance-tab="expenses"]'),budgetTab=document.querySelector('[data-finance-tab="budgets"]');
    if(expenseTab)expenseTab.hidden=!(p.can_manage_transactions||p.can_submit_expense);
    if(budgetTab)budgetTab.hidden=scope==='own';
    document.querySelectorAll('[data-finance-approve-tab]').forEach(item=>item.hidden=!p.can_approve);
    document.querySelectorAll('[data-finance-access-tab]').forEach(item=>item.hidden=!p.can_manage_access);
    document.querySelectorAll('[data-finance-export]').forEach(item=>item.hidden=!p.can_export);
    document.querySelectorAll('[data-finance-actual-cost]').forEach(item=>item.hidden=role==='estimator');
    document.querySelectorAll('[data-overview-company-finance]').forEach(item=>item.hidden=!p.can_view_dashboard);
    window.ACRefreshSideGroups?.();
    $('financeProjectFilter').innerHTML='<option value="">All authorised projects</option>'+state.projects.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
    if(!p.can_view_dashboard&&state.tab==='overview')state.tab=role==='estimator'?'budgets':role==='manager'?'budgets':'expenses';
    switchTab(state.tab,false);
  }
  function switchTab(tab,updateRoute=true){
    const button=[...document.querySelectorAll('[data-finance-tab]')].find(item=>item.dataset.financeTab===tab&&!item.hidden);
    if(!button){const fallback=[...document.querySelectorAll('[data-finance-tab]')].find(item=>!item.hidden);tab=fallback?.dataset.financeTab||'budgets'}
    state.tab=tab;
    document.querySelectorAll('[data-finance-tab]').forEach(item=>item.classList.toggle('active',item.dataset.financeTab===tab));
    document.querySelectorAll('[data-finance-panel]').forEach(item=>item.classList.toggle('active',item.dataset.financePanel===tab));
    if(updateRoute){const url=new URL(location.href);url.searchParams.set('view','financial-data');url.searchParams.set('financeTab',tab);history.replaceState(null,'',url)}
  }
  function applyRoute(){
    if(params.get('view')==='financial-data'&&state.permissions.can_open){$('financeNav')?.click();switchTab(params.get('financeTab')||state.tab)}
  }
  function notify(message,tone=''){const note=document.createElement('div');note.className=`finance-toast ${tone}`;note.textContent=message;document.body.appendChild(note);requestAnimationFrame(()=>note.classList.add('show'));setTimeout(()=>{note.classList.remove('show');setTimeout(()=>note.remove(),250)},3300)}

  function fillProjectSelect(){
    $('financeEntryProject').innerHTML='<option value="">Choose project</option>'+state.projects.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
  }
  function openEntry(kind='expense',item=null){
    state.editing=item||null;fillProjectSelect();$('financeEntryForm').reset();$('financeEntryId').value=item?.id||'';$('financeEntryKind').value=item?.entry_kind||kind;
    const ids={financeEntryProject:'project_id',financeEntryCategory:'category',financeEntryCounterparty:'counterparty',financeEntryDescription:'description',financeEntryReference:'reference_no',financeEntryDate:'transaction_date',financeEntryDue:'due_date',financeEntryAmountEx:'amount_ex_gst',financeEntryGstRate:'gst_rate',financeEntryPaid:'paid_amount_inc_gst',financeEntryPaymentDate:'payment_date',financeEntryPaymentMethod:'payment_method'};
    Object.entries(ids).forEach(([id,key])=>$(id).value=item?.[key]??'');
    if(!item){$('financeEntryDate').value=today();$('financeEntryDue').value=today();$('financeEntryGstRate').value=10}
    if(!state.permissions.can_manage_transactions){$('financeEntryKind').value='expense';$('financeEntryKind').disabled=true}else $('financeEntryKind').disabled=false;
    $('financeEntryTitle').textContent=item?'Edit Draft Entry':$('financeEntryKind').value==='income'?'Add Income':'Add Expense';
    $('financeEntrySubmit').textContent=state.viewer?.role==='owner'?'Save Approved':'Submit for Approval';
    $('financeEntryReceiptCurrent').textContent=item?.receipt_name?`Current: ${item.receipt_name}`:'';
    updateEntryMath();$('financeEntryModal').classList.add('show');$('financeEntryModal').setAttribute('aria-hidden','false');
  }
  function closeEntry(){$('financeEntryModal').classList.remove('show');$('financeEntryModal').setAttribute('aria-hidden','true');state.editing=null}
  function updateEntryMath(){
    const ex=Math.max(0,number($('financeEntryAmountEx').value)),rate=Math.max(0,number($('financeEntryGstRate').value)),gst=dollars(Math.round(cents(ex)*rate/100)),total=dollars(cents(ex)+cents(gst)),paid=Math.min(total,Math.max(0,number($('financeEntryPaid').value)));
    $('financeEntryGst').textContent=moneyFull(gst);$('financeEntryTotal').textContent=moneyFull(total);$('financeEntryBalance').textContent=moneyFull(total-paid);
  }
  function entryPayload(status){
    const ex=Math.max(0,number($('financeEntryAmountEx').value)),rate=Math.max(0,number($('financeEntryGstRate').value)),gst=dollars(Math.round(cents(ex)*rate/100)),total=dollars(cents(ex)+cents(gst)),paid=Math.min(total,Math.max(0,number($('financeEntryPaid').value)));
    if(!$('financeEntryProject').value)throw new Error('Choose a project.');
    if(!$('financeEntryCounterparty').value.trim())throw new Error('Enter the customer or supplier.');
    if(!$('financeEntryDescription').value.trim())throw new Error('Enter a description.');
    if(ex<=0)throw new Error('Amount excluding GST must be greater than zero.');
    return{entry_kind:$('financeEntryKind').value,project_id:$('financeEntryProject').value,category:$('financeEntryCategory').value||'Other',counterparty:$('financeEntryCounterparty').value.trim(),description:$('financeEntryDescription').value.trim(),reference_no:$('financeEntryReference').value.trim(),transaction_date:$('financeEntryDate').value,due_date:$('financeEntryDue').value||null,gst_rate:rate,amount_ex_gst:ex,gst_amount:gst,amount_inc_gst:total,paid_amount_inc_gst:paid,payment_status:paid>=total?'Paid':paid>0?'Partially Paid':'Unpaid',payment_date:paid>0?($('financeEntryPaymentDate').value||$('financeEntryDate').value):null,payment_method:$('financeEntryPaymentMethod').value,status};
  }
  async function saveEntry(status){
    try{
      const finalStatus=status==='Draft'?'Draft':state.viewer?.role==='owner'?'Approved':'Pending Approval',payload=entryPayload(finalStatus),file=$('financeEntryReceipt').files?.[0]||null;
      let saved;
      if(preview){
        if(state.editing){Object.assign(state.editing,payload);saved=state.editing}else{saved={id:uid('finance'),...payload,created_by:state.viewer.id,created_at:new Date().toISOString()};state.transactions.unshift(saved)}
        if(file){saved.receipt_name=file.name;saved.receipt_path='preview/new-receipt';saved.receipt_type=file.type}
      }else{
        saved=state.editing?await api.updateEntry(state.editing.id,payload):await api.createEntry(payload);saved=Array.isArray(saved)?saved[0]:saved;
        if(file)saved=await api.uploadReceipt(saved.id,file);
      }
      closeEntry();notify(finalStatus==='Draft'?'Draft saved.':finalStatus==='Approved'?'Finance entry approved and saved.':'Finance entry submitted for approval.','good');await reloadOrRender();
    }catch(error){notify(error.message,'error')}
  }
  async function reloadOrRender(){if(preview)renderAll();else await load()}

  function openBudget(projectId){
    const item=state.budgets.find(row=>row.project_id===projectId)||{project_id:projectId,original_budget:0,approved_variations:0,revenue_forecast:0,committed_cost:0,cost_to_complete:0,notes:''};
    $('financeBudgetProjectId').value=projectId;$('financeBudgetProjectName').textContent=projectName(projectId);$('financeBudgetOriginal').value=item.original_budget||0;$('financeBudgetVariations').value=item.approved_variations||0;$('financeBudgetRevenue').value=item.revenue_forecast||0;$('financeBudgetCommitted').value=item.committed_cost||0;$('financeBudgetComplete').value=item.cost_to_complete||0;$('financeBudgetNotes').value=item.notes||'';
    $('financeBudgetForm').querySelectorAll('input,textarea,button[type="submit"]').forEach(control=>control.disabled=!state.permissions.can_manage_budgets);
    $('financeBudgetModal').classList.add('show');$('financeBudgetModal').setAttribute('aria-hidden','false');
  }
  function closeBudget(){$('financeBudgetModal').classList.remove('show');$('financeBudgetModal').setAttribute('aria-hidden','true')}
  async function saveBudget(event){
    event.preventDefault();if(!state.permissions.can_manage_budgets)return;
    const payload={project_id:$('financeBudgetProjectId').value,original_budget:Math.max(0,number($('financeBudgetOriginal').value)),approved_variations:number($('financeBudgetVariations').value),revenue_forecast:Math.max(0,number($('financeBudgetRevenue').value)),committed_cost:Math.max(0,number($('financeBudgetCommitted').value)),cost_to_complete:Math.max(0,number($('financeBudgetComplete').value)),notes:$('financeBudgetNotes').value.trim()};
    try{if(preview){const item=state.budgets.find(row=>row.project_id===payload.project_id);if(item)Object.assign(item,payload);else state.budgets.push(payload)}else await api.upsertBudget(payload);closeBudget();notify('Project finance forecast saved.','good');await reloadOrRender()}catch(error){notify(error.message,'error')}
  }
  function openPayment(item){
    const balance=Math.max(0,dollars(cents(item.amount_inc_gst)-cents(item.paid_amount_inc_gst)));if(balance<=0)return;
    state.paying=item;$('financePaymentForm').reset();$('financePaymentTransactionId').value=item.id;$('financePaymentTitle').textContent=item.counterparty||item.description||'Finance entry';$('financePaymentBalance').textContent=moneyFull(balance);$('financePaymentAmount').max=balance.toFixed(2);$('financePaymentAmount').value=balance.toFixed(2);$('financePaymentDate').value=today();$('financePaymentModal').classList.add('show');$('financePaymentModal').setAttribute('aria-hidden','false');
  }
  function closePayment(){$('financePaymentModal').classList.remove('show');$('financePaymentModal').setAttribute('aria-hidden','true');state.paying=null}
  async function savePayment(event){
    event.preventDefault();const item=state.paying;if(!item)return;const balance=Math.max(0,dollars(cents(item.amount_inc_gst)-cents(item.paid_amount_inc_gst))),amount=dollars(cents($('financePaymentAmount').value));
    if(amount<=0||amount>balance){notify(`Enter a payment between ${moneyFull(.01)} and ${moneyFull(balance)}.`,'error');return}
    const payment={amount_inc_gst:amount,payment_date:$('financePaymentDate').value||today(),payment_method:$('financePaymentMethod').value,reference_no:$('financePaymentReference').value.trim()};
    try{
      if(preview){state.payments.push({id:uid('payment'),transaction_id:item.id,project_id:item.project_id,entry_kind:item.entry_kind,...payment});item.paid_amount_inc_gst=dollars(cents(item.paid_amount_inc_gst)+cents(amount));item.payment_status=item.paid_amount_inc_gst>=number(item.amount_inc_gst)?'Paid':'Partially Paid';item.payment_date=payment.payment_date;item.payment_method=payment.payment_method}else await api.recordPayment(item.id,payment);
      closePayment();notify('Payment recorded and cash flow updated.','good');await reloadOrRender();
    }catch(error){notify(error.message,'error')}
  }
  async function setTransactionStatus(id,status){
    const item=state.transactions.find(row=>row.id===id);if(!item)return;
    let note='';if(status==='Voided'){note=prompt('Reason for voiding this approved entry:')||'';if(!note)return}
    if(status==='Rejected'){note=prompt('Reason for rejecting this entry:')||'';if(!note)return}
    try{if(preview){item.status=status;item.review_note=note}else await api.setStatus(id,status,note);notify(`Entry ${status.toLowerCase()}.`,'good');await reloadOrRender()}catch(error){notify(error.message,'error')}
  }
  async function openReceipt(item){try{if(preview)return notify(`Preview receipt: ${item.receipt_name||'attached file'}`);await api.openReceipt(item.receipt_path,item.receipt_name,item.receipt_type)}catch(error){notify(error.message,'error')}}
  function exportCsv(){
    const quote=value=>`"${String(value??'').replace(/"/g,'""')}"`,rows=[['Type','Project','Category','Customer / Supplier','Description','Reference','Date','Ex GST','GST','Total','Paid','Payment status','Approval status']];
    state.transactions.filter(item=>inPeriod(item.transaction_date)).forEach(item=>rows.push([item.entry_kind,projectName(item.project_id),item.category,item.counterparty,item.description,item.reference_no,item.transaction_date,item.amount_ex_gst,item.gst_amount,item.amount_inc_gst,item.paid_amount_inc_gst,item.payment_status,item.status]));
    const blob=new Blob([rows.map(row=>row.map(quote).join(',')).join('\n')],{type:'text/csv'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`AlertTradiePro-Finance-${state.from}-to-${state.to}.csv`;link.click();URL.revokeObjectURL(link.href);
  }

  document.querySelectorAll('[data-finance-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.financeTab)));
  document.querySelectorAll('[data-finance-open]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.financeOpen)));
  document.querySelectorAll('[data-finance-overview-link]').forEach(button=>button.addEventListener('click',()=>{if(state.permissions.can_view_dashboard)switchTab('overview')}));
  document.querySelectorAll('[data-finance-new]').forEach(button=>button.addEventListener('click',()=>openEntry(button.dataset.financeNew)));
  $('financeNav').addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('view','financial-data');url.searchParams.set('financeTab',state.tab);history.replaceState(null,'',url)});
  $('financePeriod').addEventListener('change',()=>{setPeriod();load()});['financeFrom','financeTo'].forEach(id=>$(id).addEventListener('change',()=>{setPeriod('custom');load()}));$('financeProjectFilter').addEventListener('change',()=>{state.projectId=$('financeProjectFilter').value;load()});$('financeRefresh').addEventListener('click',load);
  $('financeEntryAmountEx').addEventListener('input',updateEntryMath);$('financeEntryGstRate').addEventListener('input',updateEntryMath);$('financeEntryPaid').addEventListener('input',updateEntryMath);$('financeEntryKind').addEventListener('change',()=>{$('financeEntryTitle').textContent=$('financeEntryKind').value==='income'?'Add Income':'Add Expense'});
  $('financeEntryDraft').addEventListener('click',()=>saveEntry('Draft'));$('financeEntrySubmit').addEventListener('click',()=>saveEntry('Submit'));document.querySelectorAll('[data-finance-entry-close]').forEach(button=>button.addEventListener('click',closeEntry));
  ['financeIncomeRows','financeExpenseRows'].forEach(id=>$(id).addEventListener('click',event=>{const button=event.target.closest('[data-finance-action]');if(!button)return;const item=state.transactions.find(row=>row.id===button.closest('[data-finance-row]').dataset.financeRow);if(button.dataset.financeAction==='edit')openEntry(item.entry_kind,item);if(button.dataset.financeAction==='receipt')openReceipt(item);if(button.dataset.financeAction==='payment')openPayment(item);if(button.dataset.financeAction==='void')setTransactionStatus(item.id,'Voided')}));
  $('financeApprovalList').addEventListener('click',event=>{const button=event.target.closest('[data-finance-approval-action]');if(!button)return;const item=state.transactions.find(row=>row.id===button.closest('[data-finance-approval]').dataset.financeApproval);if(button.dataset.financeApprovalAction==='receipt')openReceipt(item);if(button.dataset.financeApprovalAction==='approve')setTransactionStatus(item.id,'Approved');if(button.dataset.financeApprovalAction==='reject')setTransactionStatus(item.id,'Rejected')});
  $('financeBudgetRows').addEventListener('click',event=>{const button=event.target.closest('[data-finance-budget-open]');if(button)openBudget(button.closest('[data-budget-project]').dataset.budgetProject)});$('financeBudgetForm').addEventListener('submit',saveBudget);document.querySelectorAll('[data-finance-budget-close]').forEach(button=>button.addEventListener('click',closeBudget));
  $('financePaymentForm').addEventListener('submit',savePayment);document.querySelectorAll('[data-finance-payment-close]').forEach(button=>button.addEventListener('click',closePayment));
  $('financeAccessList').addEventListener('click',async event=>{const button=event.target.closest('[data-finance-save-access]');if(!button)return;const card=button.closest('[data-finance-user]'),permission={};card.querySelectorAll('[data-permission]').forEach(input=>permission[input.dataset.permission]=input.type==='checkbox'?input.checked:Math.max(0,number(input.value)));try{if(preview){const member=state.members.find(item=>item.id===card.dataset.financeUser);member.finance_permission=permission}else await api.setPermission(card.dataset.financeUser,permission);notify('Admin finance access updated.','good');await reloadOrRender()}catch(error){notify(error.message,'error')}});
  document.querySelectorAll('[data-finance-export]').forEach(button=>button.addEventListener('click',exportCsv));
  $('financeEntryModal').addEventListener('click',event=>{if(event.target===$('financeEntryModal'))closeEntry()});$('financeBudgetModal').addEventListener('click',event=>{if(event.target===$('financeBudgetModal'))closeBudget()});$('financePaymentModal').addEventListener('click',event=>{if(event.target===$('financePaymentModal'))closePayment()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeEntry();closeBudget();closePayment()}});

  setPeriod();load();
})();
