(function(global){
  'use strict';
  const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0};
  const cents=value=>Math.round((number(value)+Number.EPSILON)*100);
  const money=value=>Math.round(number(value))/100;
  const positive=value=>Math.max(0,number(value));

  function calculateItem(item={},defaults={}){
    const quantity=positive(item.quantity),baseCostCents=cents(positive(item.base_cost));
    const profitType=item.profit_type==='fixed'?'fixed':(defaults.profit_type==='fixed'?'fixed':'percent');
    const rawProfit=item.profit_value===''||item.profit_value==null?defaults.profit_value:item.profit_value;
    const profitValue=positive(rawProfit);
    const profitUnitCents=profitType==='fixed'?cents(profitValue):Math.round(baseCostCents*profitValue/100);
    const sellingUnitCents=baseCostCents+profitUnitCents;
    const lineSubtotalCents=Math.round(quantity*sellingUnitCents);
    const lineProfitCents=Math.round(quantity*profitUnitCents);
    return{
      ...item,
      quantity,
      base_cost:money(baseCostCents),
      profit_type:profitType,
      profit_value:profitValue,
      profit_unit:money(profitUnitCents),
      selling_unit_price:money(sellingUnitCents),
      line_profit:money(lineProfitCents),
      line_subtotal:money(lineSubtotalCents),
      gst_applicable:item.gst_applicable!==false
    };
  }

  function calculateInvoice(invoice={},items=[]){
    const defaults={profit_type:invoice.default_profit_type==='fixed'?'fixed':'percent',profit_value:positive(invoice.default_profit_value)};
    const calculatedItems=(items||[]).map(item=>calculateItem(item,defaults));
    const subtotalCents=calculatedItems.reduce((sum,item)=>sum+cents(item.line_subtotal),0);
    const profitCents=calculatedItems.reduce((sum,item)=>sum+cents(item.line_profit),0);
    const requestedDiscount=cents(positive(invoice.discount_amount)),discountCents=Math.min(requestedDiscount,subtotalCents);
    const taxableCents=calculatedItems.filter(item=>item.gst_applicable).reduce((sum,item)=>sum+cents(item.line_subtotal),0);
    const taxableRatio=subtotalCents?taxableCents/subtotalCents:0;
    const taxableDiscountCents=Math.round(discountCents*taxableRatio);
    const gstRate=invoice.gst_enabled===false?0:positive(invoice.gst_rate==null?10:invoice.gst_rate);
    const gstCents=Math.round(Math.max(0,taxableCents-taxableDiscountCents)*gstRate/100);
    const totalCents=subtotalCents-discountCents+gstCents;
    const amountPaidCents=Math.min(cents(positive(invoice.amount_paid)),totalCents);
    return{
      items:calculatedItems,
      subtotal:money(subtotalCents),
      discount_amount:money(discountCents),
      profit_amount:money(profitCents),
      gst_amount:money(gstCents),
      total_amount:money(totalCents),
      amount_paid:money(amountPaidCents),
      balance_due:money(totalCents-amountPaidCents),
      gst_rate:gstRate
    };
  }

  function formatAUD(value,withCode=false){
    const formatted=new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',currencyDisplay:withCode?'code':'narrowSymbol',minimumFractionDigits:2,maximumFractionDigits:2}).format(number(value));
    return formatted.replace(/^A\$/,'A$');
  }

  const api={calculateItem,calculateInvoice,formatAUD};
  global.ACInvoiceMath=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
