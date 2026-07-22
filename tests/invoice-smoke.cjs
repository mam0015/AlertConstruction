const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const fail=message=>{throw new Error(message)};
const math=require('../invoice/calculations.js');

const totals=math.calculateInvoice({default_profit_type:'percent',default_profit_value:20,gst_enabled:true,gst_rate:10,discount_amount:0,amount_paid:64},[
  {title:'Taxable work',quantity:2,unit:'each',base_cost:100,profit_type:'',profit_value:'',gst_applicable:true},
  {title:'GST-free work',quantity:1,unit:'item',base_cost:50,profit_type:'fixed',profit_value:10,gst_applicable:false}
]);
if(totals.subtotal!==300||totals.profit_amount!==50||totals.gst_amount!==24||totals.total_amount!==324||totals.balance_due!==260)fail('Invoice profit, GST or payment arithmetic is incorrect');

const auth=read('shared/auth.js'),shell=read('shared/product-shell.js'),html=read('invoice/index.html'),app=read('invoice/app.js'),sql=read('supabase/migrations/20260722_invoice_generator_v38.sql');
if(!/invoice:\['owner','estimator','manager'\]/.test(auth))fail('Invoice frontend role matrix is not exact');
if(!shell.includes('quote-analysis|invoice|projects'))fail('Direct invoice URL is not protected by the global login gate');
for(const id of ['newInvoiceBtn','saveBtn','previewBtn','generateBtn','duplicateBtn','printBtn','deleteBtn','settingsBtn'])if(!html.includes(`id="${id}"`))fail(`Missing invoice action ${id}`);
if(!app.includes("role==='manager'")||!app.includes("document.querySelectorAll('.edit-only')"))fail('Manager read-only UI enforcement is missing');
for(const marker of [
  "array['owner','estimator','manager']","array['owner','estimator']","array['owner']",
  "revoke all on public.ac_invoice_settings,public.ac_invoice_counters,public.ac_invoices,public.ac_invoice_items from anon,authenticated",
  "document-'profit_amount'-'private_notes'-'created_by'-'updated_by'-'pdf_generated_by'",
  "public.current_ac_role() in ('owner','estimator','manager')",
  "bucket_id='invoice-pdfs'","invoice_pdf_generated","invoice_deleted"
])if(!sql.includes(marker))fail(`Invoice security migration is missing: ${marker}`);
if(/sk-[A-Za-z0-9_-]{20,}/.test([html,app,sql].join('\n')))fail('Possible secret was added to invoice files');

const j=require('../vendor/jspdf.umd.min.js'),autoTable=require('../vendor/jspdf.plugin.autotable.min.js');autoTable.applyPlugin(j.jsPDF);global.jspdf=j;
const pdf=require('../invoice/pdf.js'),logo='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/invoice-logo.png')).toString('base64');
const invoice={invoice_number:'INV-2026-0001',status:'Issued',issue_date:'2026-07-22',due_date:'2026-08-05',customer_name:'Test Client',project_name:'Test Project',default_profit_type:'percent',default_profit_value:20,gst_enabled:true,gst_rate:10,discount_amount:0,amount_paid:0,payment_terms:'Payment is due in 14 days.',private_notes:'SECRET INTERNAL NOTE'};
const items=Array.from({length:24},(_,index)=>({title:'Renovation',description:`Long customer-safe scope line ${index+1}. Materials, preparation and installation included to the approved specification.`,quantity:1,unit:'item',base_cost:100+index,profit_type:'percent',profit_value:20,gst_applicable:true}));
const settings={company_name:'Alert Construction Pty Ltd',abn:'72 646 119 717',address:'Suite 40 / 541 Blackburn Rd\nMount Waverley VIC 3149',phone:'(03) 8820 6567',email:'info@alertconstruction.com.au',website:'www.alertconstruction.com.au',bank_account_name:'Alert Construction Pty Ltd',bank_bsb:'063-254',bank_account_number:'1089 6626'};
const generated=pdf.buildInvoicePdf(invoice,items,settings,{logoData:logo});
if(generated.doc.getNumberOfPages()<2)fail('Multi-page PDF pagination did not run');
const bytes=Buffer.from(generated.doc.output('arraybuffer')),binary=bytes.toString('latin1');
if(bytes.length<10000||!generated.filename.startsWith('Invoice_INV-2026-0001_Test-Client'))fail('Invoice PDF or automatic filename is invalid');
if(binary.includes('SECRET INTERNAL NOTE')||binary.includes('profit_amount')||binary.includes('base_cost'))fail('Internal invoice data leaked into the customer PDF');

console.log('PASS: invoice calculations, exact roles, Manager masking, RLS/RPC markers, secure storage and multi-page PDF');
