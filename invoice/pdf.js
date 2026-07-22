(function(global){
  'use strict';
  const math=global.ACInvoiceMath||(typeof require==='function'?require('./calculations.js'):null);
  const clean=value=>String(value==null?'':value).trim();
  const date=value=>{if(!value)return'';const parsed=new Date(`${value}T00:00:00`);return Number.isNaN(parsed.getTime())?value:parsed.toLocaleDateString('en-AU')};
  const filenamePart=value=>clean(value).replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,70)||'Client';
  function filename(invoice){return`Invoice_${clean(invoice.invoice_number)||'DRAFT'}_${filenamePart(invoice.customer_name||invoice.customer_company)}.pdf`}
  function jspdf(){const source=global.jspdf||global.jsPDF;if(!source)throw new Error('PDF engine is unavailable. Refresh the page and try again.');return source.jsPDF||source}
  function labelValue(doc,label,value,x,y,labelWidth=25){doc.setFont('helvetica','normal');doc.setTextColor(135);doc.text(label,x,y);doc.setTextColor(22);doc.text(clean(value)||'-',x+labelWidth,y)}
  function logo(doc,data){
    if(!data)return false;
    try{const props=doc.getImageProperties(data),maxW=40,maxH=34,ratio=props.width/props.height;let w=maxW,h=w/ratio;if(h>maxH){h=maxH;w=h*ratio}doc.addImage(data,props.fileType||'PNG',195-w,13,w,h,undefined,'FAST');return true}catch(_){return false}
  }
  function companyHeader(doc,settings,logoData){
    doc.setTextColor(25);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(clean(settings.company_name)||'Alert Construction',15,17);
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);let y=23;
    const lines=[...clean(settings.address).split(/\n+/),settings.phone,settings.email,settings.website,settings.abn?`ABN ${settings.abn}`:''].filter(Boolean);
    lines.forEach(line=>{doc.text(clean(line),15,y);y+=4.3});
    if(!logo(doc,logoData)){doc.setFont('helvetica','bold');doc.setFontSize(25);doc.text('AC',180,22);doc.setFontSize(7);doc.text('ALERT CONSTRUCTION',157,29)}
  }
  function compactHeader(doc,invoice){doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(35);doc.text('TAX INVOICE',15,14);doc.setFont('helvetica','normal');doc.setTextColor(120);doc.text(clean(invoice.invoice_number),195,14,{align:'right'})}
  function footer(doc,settings,page,total){
    doc.setDrawColor(220);doc.line(15,274,195,274);doc.setFont('helvetica','normal');doc.setTextColor(135);doc.setFontSize(7.5);
    const account=[settings.bank_account_name,settings.bank_bsb?`BSB: ${settings.bank_bsb}`:'',settings.bank_account_number?`Account: ${settings.bank_account_number}`:''].filter(Boolean).join('  |  ');
    if(account)doc.text(account,105,280,{align:'center',maxWidth:170});
    doc.text(`Page ${page} of ${total}`,105,287,{align:'center'});doc.text('Amounts shown in Australian dollars (AUD).',195,287,{align:'right'});
  }
  function ensureSpace(doc,y,needed,invoice){if(y+needed<=267)return y;doc.addPage();compactHeader(doc,invoice);return 23}

  function buildInvoicePdf(invoice={},items=[],settings={},options={}){
    const JsPDF=jspdf(),doc=new JsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
    const totals=options.totals||math.calculateInvoice(invoice,items),rows=(totals.items||items).map(item=>[
      clean(item.title)||'Service',clean(item.description)+(item.gst_applicable===false?'\nGST-free item':''),String(Number(item.quantity||0)),clean(item.unit)||'each',math.formatAUD(item.selling_unit_price),math.formatAUD(item.line_subtotal)
    ]);
    companyHeader(doc,settings,options.logoData);
    doc.setFont('helvetica','normal');doc.setTextColor(92);doc.setFontSize(20);doc.text('TAX INVOICE',15,55);
    if(clean(invoice.status).toLowerCase()==='draft'){doc.setFillColor(245,180,0);doc.roundedRect(15,59,23,7,1.2,1.2,'F');doc.setFont('helvetica','bold');doc.setTextColor(20);doc.setFontSize(7);doc.text('DRAFT',26.5,63.7,{align:'center'})}
    doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(135);doc.text('INVOICE TO',15,70);
    doc.setFont('helvetica','bold');doc.setTextColor(20);doc.setFontSize(10);doc.text(clean(invoice.customer_name)||clean(invoice.customer_company)||'-',15,76);
    doc.setFont('helvetica','normal');doc.setFontSize(8.3);let customerY=81;
    [invoice.customer_company&&invoice.customer_company!==invoice.customer_name?invoice.customer_company:'',invoice.customer_address,invoice.customer_email,invoice.customer_phone,invoice.customer_abn?`ABN ${invoice.customer_abn}`:''].filter(Boolean).forEach(value=>{doc.splitTextToSize(clean(value),88).forEach(line=>{doc.text(line,15,customerY);customerY+=4})});
    labelValue(doc,'INVOICE',clean(invoice.invoice_number)||'Draft',135,68,25);labelValue(doc,'DATE',date(invoice.issue_date),135,74,25);labelValue(doc,'DUE DATE',date(invoice.due_date),135,80,25);labelValue(doc,'PROJECT',invoice.project_name,135,86,25);if(invoice.reference_no)labelValue(doc,'REFERENCE',invoice.reference_no,135,92,25);
    const startY=Math.max(100,customerY+5);
    if(typeof doc.autoTable!=='function')throw new Error('PDF table engine is unavailable. Refresh the page and try again.');
    doc.autoTable({
      startY,head:[['ITEM','DESCRIPTION','QTY','UNIT','RATE','AMOUNT']],body:rows.length?rows:[['-','No invoice items','','','','']],
      margin:{left:15,right:15,bottom:32},tableWidth:180,theme:'plain',showHead:'everyPage',rowPageBreak:'avoid',pageBreak:'auto',
      styles:{font:'helvetica',fontSize:8.2,textColor:[25,25,25],cellPadding:{top:3,bottom:3,left:2,right:2},overflow:'linebreak',valign:'top',lineColor:[232,232,232],lineWidth:{bottom:.15}},
      headStyles:{fillColor:[229,229,229],textColor:[92,92,92],fontStyle:'bold',halign:'left',lineWidth:0},
      columnStyles:{0:{cellWidth:27,fontStyle:'bold'},1:{cellWidth:72},2:{cellWidth:13,halign:'right'},3:{cellWidth:15},4:{cellWidth:24,halign:'right'},5:{cellWidth:29,halign:'right'}},
      didDrawPage:data=>{if(data.pageNumber>1)compactHeader(doc,invoice)}
    });
    let y=ensureSpace(doc,(doc.lastAutoTable?.finalY||startY)+7,58,invoice),xLabel=127,xAmount=195;
    doc.setDrawColor(185);doc.setLineDashPattern([1.2,1.2],0);doc.line(121,y-3,195,y-3);doc.setLineDashPattern([],0);
    const totalLine=(label,value,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setTextColor(bold?20:120);doc.setFontSize(bold?10:9);doc.text(label,xLabel,y);doc.setTextColor(20);doc.text(math.formatAUD(value),xAmount,y,{align:'right'});y+=6};
    totalLine('SUBTOTAL EX GST',totals.subtotal);
    if(Number(totals.discount_amount)>0)totalLine('DISCOUNT',-totals.discount_amount);
    totalLine(`GST ${Number(totals.gst_rate||0).toFixed(0)}%`,totals.gst_amount);
    totalLine('TOTAL INC GST',totals.total_amount,true);totalLine('AMOUNT PAID',totals.amount_paid);
    doc.setDrawColor(185);doc.setLineDashPattern([1.2,1.2],0);doc.line(121,y-2,195,y-2);doc.setLineDashPattern([],0);y+=5;
    doc.setFont('helvetica','normal');doc.setTextColor(120);doc.setFontSize(10);doc.text('BALANCE DUE',121,y);doc.setFont('helvetica','bold');doc.setTextColor(10);doc.setFontSize(14);doc.text(math.formatAUD(totals.balance_due,true),195,y,{align:'right'});y+=10;
    y=ensureSpace(doc,y,38,invoice);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.setTextColor(85);doc.text('PAYMENT DETAILS',15,y);doc.setFont('helvetica','normal');doc.setTextColor(35);y+=5;
    const payment=[settings.bank_account_name,settings.bank_bsb?`BSB: ${settings.bank_bsb}`:'',settings.bank_account_number?`Account: ${settings.bank_account_number}`:''].filter(Boolean).join('  |  ');doc.text(payment||'Contact us for payment details.',15,y,{maxWidth:180});y+=7;
    if(invoice.payment_terms||settings.payment_terms){doc.setFont('helvetica','bold');doc.setTextColor(85);doc.text('PAYMENT TERMS',15,y);doc.setFont('helvetica','normal');doc.setTextColor(35);y+=5;const terms=doc.splitTextToSize(clean(invoice.payment_terms||settings.payment_terms),180);doc.text(terms,15,y);y+=terms.length*4+3}
    if(invoice.notes){y=ensureSpace(doc,y,18,invoice);doc.setFont('helvetica','bold');doc.setTextColor(85);doc.text('NOTES',15,y);doc.setFont('helvetica','normal');doc.setTextColor(35);doc.text(doc.splitTextToSize(clean(invoice.notes),180),15,y+5)}
    const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);footer(doc,settings,page,pages)}
    return{doc,blob:doc.output('blob'),filename:filename(invoice),totals};
  }
  const api={buildInvoicePdf,filename};global.ACInvoicePDF=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
