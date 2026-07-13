(function(global){
  'use strict';

  const REGISTRY={
    electrical:{
      enabled:true,label:'Electrical',
      patterns:[
        {catalog_index:0,label:'LED downlight',aliases:['LED downlight','downlight','DL']},
        {catalog_index:3,label:'outdoor wall light',aliases:['outdoor light','wall light','WL']},
        {catalog_index:5,label:'new power point',aliases:['power point','GPO','PP']},
        {catalog_index:6,label:'replacement power point',aliases:['replacement power point','replace GPO','existing GPO']},
        {catalog_index:8,label:'weatherproof power point',aliases:['weatherproof power point','weatherproof GPO','WP GPO']},
        {catalog_index:10,label:'1 gang switch',aliases:['1 gang switch','1G switch']},
        {catalog_index:12,label:'2 gang switch',aliases:['2 gang switch','2G switch']},
        {catalog_index:14,label:'3 gang switch',aliases:['3 gang switch','3G switch']},
        {catalog_index:16,label:'4 gang switch',aliases:['4 gang switch','4G switch']},
        {catalog_index:17,label:'LED dimmer',aliases:['LED dimmer','dimmer']},
        {catalog_index:19,label:'fan heat light',aliases:['3 in 1','fan heat light','exhaust fan']},
        {catalog_index:20,label:'rangehood duct',aliases:['rangehood duct','range hood duct']},
        {catalog_index:21,label:'TV point',aliases:['TV point','TV']},
        {catalog_index:22,label:'data point',aliases:['data point','DATA']}
      ]
    },
    plumbing:{
      enabled:true,label:'Plumbing',
      patterns:[
        {catalog_index:0,label:'bathroom rough-in package',aliases:['bathroom rough in','bathroom rough-in']},
        {catalog_index:1,label:'ensuite rough-in package',aliases:['ensuite rough in','ensuite rough-in']},
        {catalog_index:3,label:'laundry rough-in',aliases:['laundry rough in','laundry rough-in']},
        {catalog_index:4,label:'kitchen rough-in',aliases:['kitchen rough in','kitchen rough-in']},
        {catalog_index:6,label:'water point',aliases:['water point','WP']},
        {catalog_index:7,label:'waste point',aliases:['waste point']},
        {catalog_index:8,label:'wall mixer',aliases:['wall mixer','WM']},
        {catalog_index:11,label:'toilet fit-off',aliases:['toilet','WC']},
        {catalog_index:12,label:'vanity basin fit-off',aliases:['vanity basin','vanity']},
        {catalog_index:13,label:'shower fit-off',aliases:['shower']},
        {catalog_index:14,label:'bath fit-off',aliases:['bathtub','bath']},
        {catalog_index:15,label:'kitchen sink fit-off',aliases:['kitchen sink']},
        {catalog_index:16,label:'laundry trough fit-off',aliases:['laundry trough']},
        {catalog_index:17,label:'water to fridge',aliases:['fridge water','water to fridge']},
        {catalog_index:18,label:'dishwasher connection',aliases:['dishwasher','DW']},
        {catalog_index:19,label:'gas line alteration',aliases:['gas line alteration']},
        {catalog_index:20,label:'gas hot plate',aliases:['gas hot plate','gas cooktop']},
        {catalog_index:22,label:'sanitary drain alteration',aliases:['sanitary drain','sewer drain']}
      ]
    },
    cladding:{
      enabled:true,label:'Cladding',decimal:true,
      patterns:[
        {catalog_index:0,label:'Thermory C32 lineal metres',aliases:['C32 cladding LM','cladding LM','lineal metre']},
        {catalog_index:2,label:'cladding area',aliases:['cladding area','cladding m2','cladding sqm'],area:true},
        {catalog_index:4,label:'corner moulding',aliases:['corner moulding','corner mould','CP3']},
        {catalog_index:7,label:'delivery',aliases:['delivery charge','delivery'],once:true}
      ]
    },

    // Future module scaffold. It is intentionally disabled and never appears in the UI.
    // To activate later: add priced calculator items and detection patterns, set enabled:true,
    // then add a data-trade="carpentry" button to plan-ai/index.html.
    carpentry:{
      enabled:false,label:'Carpentry',path:'../carpentry/index.html',
      storage:'ac_ai_carpentry_prefill_v1',decimal:false,patterns:[],catalogItems:[]
    }
  };

  const escapeRegExp=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const normalise=value=>String(value||'').replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ').trim();

  function aliasSource(aliases){
    return aliases.slice().sort((a,b)=>b.length-a.length).map(escapeRegExp).join('|');
  }

  function countPattern(text,pattern){
    if(pattern.once){
      const found=new RegExp('\\b(?:'+aliasSource(pattern.aliases)+')\\b','i').test(text);
      return found?{quantity:1,explicit:false,matches:1}:null;
    }
    if(pattern.area){
      const areas=[];let match;
      const areaRegex=/(\d+(?:\.\d+)?)\s*(?:m2|m²|sqm|square metres?)/gi;
      while((match=areaRegex.exec(text)))areas.push(Number(match[1]));
      if(areas.length)return{quantity:Math.round(areas.reduce((a,b)=>a+b,0)*100)/100,explicit:true,matches:areas.length};
    }
    const source=aliasSource(pattern.aliases),beforeValues=[],afterValues=[];let match;
    const before=new RegExp('([0-9]+(?:\\.[0-9]+)?)\\s*(?:x|×|no\\.?|qty\\.?|units?)?\\s*(?:'+source+')\\b','gi');
    const after=new RegExp('\\b(?:'+source+')\\s*(?:x|×|:|-|qty\\.?)\\s*([0-9]+(?:\\.[0-9]+)?)','gi');
    while((match=before.exec(text)))beforeValues.push(Number(match[1]));
    while((match=after.exec(text)))afterValues.push(Number(match[1]));
    const values=afterValues.length?afterValues:beforeValues;
    if(values.length)return{quantity:values.reduce((a,b)=>a+b,0),explicit:true,matches:values.length};
    const occurrences=text.match(new RegExp('\\b(?:'+source+')\\b','gi'))||[];
    if(!occurrences.length)return null;
    // A single occurrence is often only the legend. More than one is treated as a tag count,
    // with one occurrence removed as a conservative legend allowance.
    return{quantity:Math.max(1,occurrences.length-(occurrences.length>1?1:0)),explicit:false,matches:occurrences.length};
  }

  async function recogniseImage(source,onProgress){
    if(!global.Tesseract)throw new Error('Fast Scan OCR could not load. Check the internet connection or use Smart AI.');
    const result=await global.Tesseract.recognize(source,'eng',{logger:event=>{
      if(event.status==='recognizing text'&&onProgress)onProgress(Math.round((event.progress||0)*100),'Reading plan labels');
    }});
    return result&&result.data?result.data.text||'':'';
  }

  async function pdfText(file,onProgress){
    if(!global.pdfjsLib)throw new Error('Fast Scan PDF reader could not load. Check the internet connection or use Smart AI.');
    global.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const bytes=new Uint8Array(await file.arrayBuffer());
    const pdf=await global.pdfjsLib.getDocument({data:bytes}).promise;
    const pages=Math.min(pdf.numPages,6),chunks=[];
    for(let pageNumber=1;pageNumber<=pages;pageNumber++){
      if(onProgress)onProgress(Math.round((pageNumber-1)/pages*60),'Reading PDF text');
      const page=await pdf.getPage(pageNumber),content=await page.getTextContent();
      chunks.push(content.items.map(item=>item.str||'').join(' '));
    }
    let text=normalise(chunks.join(' '));
    if(text.length>=120)return{text,source:'searchable PDF text',pages};
    const ocr=[];
    for(let pageNumber=1;pageNumber<=Math.min(pages,3);pageNumber++){
      const page=await pdf.getPage(pageNumber),viewport=page.getViewport({scale:1.45});
      const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:context,viewport}).promise;
      ocr.push(await recogniseImage(canvas,(value,label)=>onProgress&&onProgress(60+Math.round(((pageNumber-1)+value/100)/Math.min(pages,3)*38),label)));
    }
    text=normalise(ocr.join(' '));
    return{text,source:'on-device OCR',pages:Math.min(pages,3)};
  }

  async function extractText(file,onProgress){
    if(file.type==='application/pdf'||/\.pdf$/i.test(file.name||''))return pdfText(file,onProgress);
    const text=normalise(await recogniseImage(file,onProgress));
    return{text,source:'on-device OCR',pages:1};
  }

  async function analyse(file,trade,onProgress){
    const rules=REGISTRY[trade];
    if(!rules||!rules.enabled)throw new Error('This trade is not available yet.');
    const extracted=await extractText(file,onProgress),items=[];
    let explicitCount=0;
    for(const pattern of rules.patterns){
      const result=countPattern(extracted.text,pattern);if(!result||!result.quantity)continue;
      let quantity=rules.decimal?Math.round(result.quantity*100)/100:Math.max(1,Math.round(result.quantity));
      if(result.explicit)explicitCount++;
      items.push({catalog_index:pattern.catalog_index,quantity,evidence:result.explicit?`Fast Scan read an explicit quantity for ${pattern.label}.`:`Fast Scan found repeated ${pattern.label} labels/tags; confirm against the legend.`});
    }
    const confidence=items.length>=4&&explicitCount>=2?'medium':items.length>=2?'medium-low':'low';
    const warnings=[
      'Fast Scan reads searchable text, schedules, legends and OCR-visible tags; it cannot reliably understand every graphical symbol.',
      'Confirm every quantity against the drawing before using the estimate.'
    ];
    if(trade==='electrical')warnings.push('New versus replacement work is only classified when the plan explicitly labels it.');
    if(trade==='plumbing')warnings.push('Room labels alone do not prove rough-in scope; confirm rough-in and fit-off inclusions.');
    if(trade==='cladding')warnings.push('Confirm elevations, scale, deductions for openings and whether measured areas include all cladding faces.');
    if(!items.length)return{status:'missing_trade_plan',summary:`Fast Scan could not find reliable ${rules.label.toLowerCase()} quantities.`,items:[],assumptions:[],warnings,unpriced_items:[],confidence,scanSource:extracted.source,method:'fast'};
    return{
      status:'success',
      summary:`Fast Scan found ${items.length} possible ${rules.label.toLowerCase()} item types using ${extracted.source}. Review the quantities before quoting.`,
      items,
      assumptions:[`Scanned up to ${extracted.pages} page(s) locally on this device.`,`Text-based matches are preliminary and were mapped to the existing ${rules.label} price catalogue.`],
      warnings,unpriced_items:[],confidence,scanSource:extracted.source,method:'fast'
    };
  }

  global.ACLocalPlanAnalyser={analyse,registry:REGISTRY};
})(window);
