(function(global){
  'use strict';

  /*
    Public catalogue schema only.

    Builder rates are deliberately NOT shipped in this GitHub Pages bundle.
    A signed-in account must pass the Supabase catalogue_access_probe and RLS
    before catalogue-runtime.js loads an approved rate. This file keeps only
    item identity/order so calculators can render safely while pricing is
    locked.
  */
  const rows=[];
  function add(trade,items){
    items.forEach((item,index)=>rows.push({
      item_key:`${trade}:${index}`,
      trade,
      sort_order:index,
      name:item[0],
      builder_rate:null,
      unit:item[1]||'each',
      customer_margin:20,
      active:true,
      source:'protected-ac-catalogue',
      verification_status:'server-required'
    }));
  }

  add('electrical',[
    ['LED Downlight - Supply, wiring & install'],['LED Downlight - Install only'],['Bathroom Wall Light - Install on tiles'],['Outdoor Entrance Light'],['Shaving Cabinet Light'],['Power Point - New wiring & install'],['Power Point - Replacement / fit off'],['Double Power Point with extra switch'],['Weatherproof Power Point'],['1 Gang Light Switch - Replacement'],['1 Gang Light Switch - New wiring'],['2 Gang Light Switch - Replacement'],['2 Gang Light Switch - New wiring'],['3 Gang Light Switch - Replacement'],['3 Gang Light Switch - New wiring'],['4 Gang Light Switch - Replacement'],['Rotary LED Dimmer'],['Electric Towel Heater'],['Non-Electric Towel Rack'],['3-in-1 Fan / Heat / Light Combo'],['Rangehood Duct'],['TV Antenna Point'],['Data Point']
  ]);
  add('plumbing',[
    ['Bathroom Rough-In Package'],['Ensuite Rough-In Package'],['Ground Floor Bathroom Rough-In'],['Laundry Rough-In'],['Kitchen Rough-In'],['Retreat Sink Rough-In'],['New Water Point Rough-In'],['Waste Point Rough-In'],['Wall Mixer Rough-In'],['Smart Toilet Setup'],['Rain Shower Nogging'],['Toilet Fit-Off'],['Vanity Basin Fit-Off'],['Shower Fit-Off'],['Bath Fit-Off'],['Kitchen Sink Fit-Off'],['Laundry Trough Fit-Off'],['Water to Fridge Fit-Off'],['Dishwasher Connection'],['Gas Line Alteration'],['Gas Hot Plate Fit-Off'],['Concrete Saw Cut / Jackhammer Allowance'],['Sanitary Drain Alteration'],['Coloured Bath Waste + Flexible Connection'],['Call-Out / Minor Plumbing Item']
  ]);
  add('cladding',[
    ['Thermory Pine Trax Natural C32 Cladding - 140 x 20 LM','LM'],['Thermory C32 Cladding - 5.4m Length','length'],['Thermory C32 Cladding - estimated material coverage m²','m²'],['Thermory C32 Cladding - 28 Lengths / 151.40 LM','package'],['42 x 42 THERMOLIT SPR Corner Mould CP3 @ 4200mm'],['42 x 42 THERMOLIT SPR Corner Mould CP3 LM','LM'],['Corner Moulding Pack - 6 Pieces','pack'],['Delivery Charge / Express Delivery UTE','delivery'],['Original Invoice Package - 28 Lengths + 4 Corners + Delivery','package'],['Revised Invoice Package - 28 Lengths + 6 Corners + Delivery','package'],['Order Confirmation Package - 28 Lengths + Delivery, no corners','package']
  ]);

  global.AC_CATALOGUE_DEFAULTS=rows;
})(window);
