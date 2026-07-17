import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS=new Set(["https://mam0015.github.io","http://localhost:4173","http://127.0.0.1:4173"]);
const ALLOWED_FILE_TYPES=new Set(["application/pdf","image/png","image/jpeg","image/webp","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain","text/csv"]);
const PLAN_FILE_TYPES=new Set(["application/pdf","image/png","image/jpeg","image/webp"]);
const MAX_DATA_URL_LENGTH=22_000_000;

type CatalogItem={name:string;rate:number};
type TradeConfig={label:string;required:string;rules:string;actionIndexes:{removed:number[];moved:number[]};catalog:CatalogItem[]};

// Future Carpentry module scaffold. It is intentionally excluded from TRADE_CONFIG,
// so no Carpentry request can be submitted until verified prices and plan rules exist.
// When the module is ready, move this entry into TRADE_CONFIG and populate catalog.
const FUTURE_TRADE_CONFIG={
  carpentry:{enabled:false,label:"Carpentry",required:"",rules:"",actionIndexes:{removed:[],moved:[]},catalog:[] as CatalogItem[]}
};

const TRADE_CONFIG:Record<string,TradeConfig>={
  electrical:{
    label:"Electrical",
    required:"An electrical layout with visible electrical symbols, switching/power information, annotations or an electrical legend. An ordinary architectural floor plan without electrical information is not enough.",
    rules:"For added work use supply-and-install/new-wiring items unless the plan explicitly says install-only. Follow the legend for outlet and switch types/gangs. For a removed existing power point or 1/2/3/4-gang switch, the matching Replacement / fit-off catalogue item may be used as the existing-work allowance, but warn that this is an allowance rather than a dedicated demolition-only rate. For a clearly moved downlight, the LED Downlight Install only rate may be used; do not use it for a pure removal. Do not infer switchboard, circuits, mains, smoke alarms, appliances, solar, EV charging, security or other unpriced scope.",
    actionIndexes:{removed:[6,9,11,13,15],moved:[1,6,9,11,13,15,21,22]},
    catalog:[
      {name:"LED Downlight - Supply, wiring & install",rate:65},{name:"LED Downlight - Install only",rate:45},{name:"Bathroom Wall Light - Install on tiles",rate:160},{name:"Outdoor Entrance Light",rate:180},{name:"Shaving Cabinet Light",rate:240},{name:"Power Point - New wiring & install",rate:65},{name:"Power Point - Replacement / fit off",rate:35},{name:"Double Power Point with extra switch",rate:75},{name:"Weatherproof Power Point",rate:150},{name:"1 Gang Light Switch - Replacement",rate:35},{name:"1 Gang Light Switch - New wiring",rate:65},{name:"2 Gang Light Switch - Replacement",rate:40},{name:"2 Gang Light Switch - New wiring",rate:75},{name:"3 Gang Light Switch - Replacement",rate:45},{name:"3 Gang Light Switch - New wiring",rate:85},{name:"4 Gang Light Switch - Replacement",rate:65},{name:"Rotary LED Dimmer",rate:90},{name:"Electric Towel Heater",rate:220},{name:"Non-Electric Towel Rack",rate:85},{name:"3-in-1 Fan / Heat / Light Combo",rate:250},{name:"Rangehood Duct",rate:320},{name:"TV Antenna Point",rate:55},{name:"Data Point",rate:55}
    ]
  },
  plumbing:{
    label:"Plumbing",
    required:"A plumbing, hydraulic, sanitary, drainage or services plan showing enough plumbing scope to quantify. Visible toilets or sinks on an ordinary architectural plan alone are not enough to price rough-in and fit-off reliably.",
    rules:"Do not double count a bathroom/ensuite/laundry/kitchen rough-in package together with individual rough-in points for the same scope. Fit-off items may be counted separately only when the requested scope includes fit-off. A removed or moved sanitary drain may map to Sanitary Drain Alteration only where the drawings genuinely show remove/reinstall or alteration. Other fixture removals need an explicit matching catalogue rate or remain unpriced. Never infer gas work, concrete cutting, drain alteration or call-outs unless noted on the plumbing documentation.",
    actionIndexes:{removed:[22],moved:[22]},
    catalog:[
      {name:"Bathroom Rough-In Package",rate:3200},{name:"Ensuite Rough-In Package",rate:3700},{name:"Ground Floor Bathroom Rough-In",rate:2500},{name:"Laundry Rough-In",rate:800},{name:"Kitchen Rough-In",rate:1100},{name:"Retreat Sink Rough-In",rate:700},{name:"New Water Point Rough-In",rate:220},{name:"Waste Point Rough-In",rate:180},{name:"Wall Mixer Rough-In",rate:160},{name:"Smart Toilet Setup",rate:190},{name:"Rain Shower Nogging",rate:150},{name:"Toilet Fit-Off",rate:320},{name:"Vanity Basin Fit-Off",rate:300},{name:"Shower Fit-Off",rate:380},{name:"Bath Fit-Off",rate:420},{name:"Kitchen Sink Fit-Off",rate:330},{name:"Laundry Trough Fit-Off",rate:260},{name:"Water to Fridge Fit-Off",rate:190},{name:"Dishwasher Connection",rate:260},{name:"Gas Line Alteration",rate:410},{name:"Gas Hot Plate Fit-Off",rate:330},{name:"Concrete Saw Cut / Jackhammer Allowance",rate:650},{name:"Sanitary Drain Alteration",rate:480},{name:"Coloured Bath Waste + Flexible Connection",rate:250},{name:"Call-Out / Minor Plumbing Item",rate:165}
    ]
  },
  cladding:{
    label:"Cladding",
    required:"Building elevations or a cladding/material schedule that clearly identifies cladding extents plus dimensions or a usable scale. A floor plan without measurable cladding elevations is not enough.",
    rules:"For a plan-based estimate prefer the m² rate, relevant corner moulding quantities and one delivery. Never combine m²/LM calculations with a full invoice package because that double counts material. Deduct openings only when dimensions are visible. This catalogue contains material and delivery rates, not verified cladding demolition or relocation labour rates, so removed or moved cladding must remain unpriced.",
    actionIndexes:{removed:[],moved:[]},
    catalog:[
      {name:"Thermory Pine Trax Natural C32 Cladding - 140 x 20 LM",rate:15.71},{name:"Thermory C32 Cladding - 5.4m Length",rate:84.97},{name:"Thermory C32 Cladding - estimated material coverage m²",rate:112.25},{name:"Thermory C32 Cladding - 28 Lengths / 151.40 LM",rate:2379.24},{name:"42 x 42 THERMOLIT SPR Corner Mould CP3 @ 4200mm",rate:46.42},{name:"42 x 42 THERMOLIT SPR Corner Mould CP3 LM",rate:11.05},{name:"Corner Moulding Pack - 6 Pieces",rate:278.50},{name:"Delivery Charge / Express Delivery UTE",rate:86.36},{name:"Original Invoice Package - 28 Lengths + 4 Corners + Delivery",rate:2651.24},{name:"Revised Invoice Package - 28 Lengths + 6 Corners + Delivery",rate:2744.10},{name:"Order Confirmation Package - 28 Lengths + Delivery, no corners",rate:2465.60}
    ]
  }
};

const PLAN_COMPARE_SCHEMA={type:"object",additionalProperties:false,properties:{
  status:{type:"string",enum:["success","missing_trade_plan"]},
  summary:{type:"string"},
  legend_findings:{type:"array",items:{type:"object",additionalProperties:false,properties:{plan:{type:"string",enum:["existing","proposed"]},symbol_label:{type:"string"},meaning:{type:"string"},evidence:{type:"string"},confidence:{type:"string",enum:["high","medium","low"]}},required:["plan","symbol_label","meaning","evidence","confidence"]}},
  symbols:{type:"array",items:{type:"object",additionalProperties:false,properties:{
    symbol_label:{type:"string"},description:{type:"string"},added_catalog_index:{type:"integer",minimum:-1},removed_catalog_index:{type:"integer",minimum:-1},moved_catalog_index:{type:"integer",minimum:-1},
    existing_quantity:{type:"number",minimum:0},proposed_quantity:{type:"number",minimum:0},unchanged_quantity:{type:"number",minimum:0},added_quantity:{type:"number",minimum:0},removed_quantity:{type:"number",minimum:0},moved_quantity:{type:"number",minimum:0},
    confidence:{type:"string",enum:["high","medium","low"]},existing_evidence:{type:"string"},proposed_evidence:{type:"string"}
  },required:["symbol_label","description","added_catalog_index","removed_catalog_index","moved_catalog_index","existing_quantity","proposed_quantity","unchanged_quantity","added_quantity","removed_quantity","moved_quantity","confidence","existing_evidence","proposed_evidence"]}},
  assumptions:{type:"array",items:{type:"string"}},warnings:{type:"array",items:{type:"string"}},unpriced_items:{type:"array",items:{type:"string"}}
},required:["status","summary","legend_findings","symbols","assumptions","warnings","unpriced_items"]};

const QUOTE_SCHEMA={type:"object",additionalProperties:false,properties:{
  supplier:{type:"string"},quote_number:{type:"string"},summary:{type:"string"},
  gst_treatment:{type:"string",enum:["ex_gst","inc_gst","mixed","unknown"]},
  quote_total_ex_gst:{type:"number",minimum:0},quote_total_inc_gst:{type:"number",minimum:0},
  items:{type:"array",items:{type:"object",additionalProperties:false,properties:{
    quoted_name:{type:"string"},description:{type:"string"},quantity:{type:"number",minimum:0},
    quoted_unit_price_ex_gst:{type:"number",minimum:0},quoted_line_total_ex_gst:{type:"number",minimum:0},
    catalog_index:{type:"integer",minimum:-1},match_confidence:{type:"string",enum:["high","medium","low","none"]},
    evidence:{type:"string"},notes:{type:"string"}
  },required:["quoted_name","description","quantity","quoted_unit_price_ex_gst","quoted_line_total_ex_gst","catalog_index","match_confidence","evidence","notes"]}},
  warnings:{type:"array",items:{type:"string"}}
},required:["supplier","quote_number","summary","gst_treatment","quote_total_ex_gst","quote_total_inc_gst","items","warnings"]};

function cors(origin:string|null){const allowed=origin&&ALLOWED_ORIGINS.has(origin)?origin:"https://mam0015.github.io";return{"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}}
function json(body:unknown,status:number,origin:string|null){return new Response(JSON.stringify(body),{status,headers:{...cors(origin),"Content-Type":"application/json"}})}
function outputText(response:any){if(typeof response?.output_text==="string")return response.output_text;for(const output of response?.output||[])for(const content of output?.content||[])if(content.type==="output_text"&&typeof content.text==="string")return content.text;return""}
function round(value:number){return Math.round((Number(value)||0)*100)/100}

async function requireSignedInUser(request:Request,origin:string|null){
  const authorization=request.headers.get("authorization")||"";
  if(!/^Bearer\s+\S+$/i.test(authorization))return{response:json({error:"Sign in before using AI analysis."},401,origin)};
  const url=Deno.env.get("SUPABASE_URL")||"",apikey=Deno.env.get("SUPABASE_ANON_KEY")||request.headers.get("apikey")||"";
  if(!url||!apikey)return{response:json({error:"Secure account verification is not configured."},503,origin)};
  try{
    const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey,"Authorization":authorization}});
    if(!response.ok)return{response:json({error:"Your secure session is invalid or expired. Sign in again."},401,origin)};
    const user=await response.json();
    if(!user?.id)return{response:json({error:"Your secure session could not be verified. Sign in again."},401,origin)};
    return{user};
  }catch(error){
    console.error("auth verification error",error instanceof Error?error.message:error);
    return{response:json({error:"Secure account verification is temporarily unavailable."},503,origin)};
  }
}

async function callOpenAI(apiKey:string,payload:Record<string,unknown>){
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const data=await response.json();
  if(!response.ok)throw new Error(data?.error?.message||`OpenAI request failed (${response.status}).`);
  return data;
}

function filePart(fileData:unknown,fileName:unknown,fileType:unknown){
  const type=String(fileType||"");
  if(type.startsWith("image/"))return{type:"input_image",image_url:fileData,detail:"high"};
  const part:any={type:"input_file",filename:String(fileName||"document").slice(0,180),file_data:fileData};
  if(type==="application/pdf")part.detail="high";
  return part;
}

function catalogueText(trade:TradeConfig){return trade.catalog.map((item,index)=>`${index} | ${item.name} | ${item.rate.toFixed(2)} ex GST`).join("\n")}
function actionIndexText(trade:TradeConfig,action:"removed"|"moved"){const indexes=trade.actionIndexes[action];return indexes.length?indexes.map(index=>`${index} (${trade.catalog[index]?.name||"Unknown"})`).join(", "):"none — leave every action of this type unpriced"}

async function liveTrade(request:Request,tradeKey:string,baseTrade:TradeConfig){
  const url=Deno.env.get("SUPABASE_URL"),apikey=request.headers.get("apikey")||Deno.env.get("SUPABASE_ANON_KEY")||"",authorization=request.headers.get("authorization")||"";
  if(!url||!apikey||!authorization)return baseTrade;
  try{
    const response=await fetch(`${url}/rest/v1/price_catalogue?trade=eq.${encodeURIComponent(tradeKey)}&active=eq.true&select=sort_order,item_name,builder_rate&order=sort_order`,{headers:{apikey,authorization}});
    if(!response.ok)return baseTrade;
    const catalogue=baseTrade.catalog.map(item=>({...item}));
    for(const row of await response.json())if(Number.isInteger(Number(row.sort_order))&&catalogue[Number(row.sort_order)])catalogue[Number(row.sort_order)]={name:String(row.item_name||catalogue[Number(row.sort_order)].name),rate:Number(row.builder_rate)};
    return{...baseTrade,catalog:catalogue};
  }catch(_){return baseTrade}
}

function normalisePlanComparison(extracted:any,trade:TradeConfig){
  if(extracted?.status!=="success")return{status:"missing_trade_plan",summary:String(extracted?.summary||"Matching trade plans were not found."),legend_findings:[],symbols:[],items:[],assumptions:[],warnings:Array.isArray(extracted?.warnings)?extracted.warnings.map(String):[],unpriced_items:[]};
  const validIndex=(value:unknown,action:"added"|"removed"|"moved")=>{const index=Number(value);if(!Number.isInteger(index)||index<0||index>=trade.catalog.length)return-1;if(action!=="added"&&!trade.actionIndexes[action].includes(index))return-1;return index};
  const symbols=(Array.isArray(extracted.symbols)?extracted.symbols:[]).map((raw:any)=>{
    const existing=round(Math.max(0,Number(raw.existing_quantity)||0)),proposed=round(Math.max(0,Number(raw.proposed_quantity)||0));
    const moved=round(Math.min(Math.max(0,Number(raw.moved_quantity)||0),existing,proposed));
    const unchanged=round(Math.min(Math.max(0,existing-moved),Math.max(0,proposed-moved)));
    const removed=round(Math.max(0,existing-moved-unchanged)),added=round(Math.max(0,proposed-moved-unchanged));
    return{symbol_label:String(raw.symbol_label||"Plan symbol"),description:String(raw.description||""),added_catalog_index:validIndex(raw.added_catalog_index,"added"),removed_catalog_index:validIndex(raw.removed_catalog_index,"removed"),moved_catalog_index:validIndex(raw.moved_catalog_index,"moved"),existing_quantity:existing,proposed_quantity:proposed,unchanged_quantity:unchanged,added_quantity:added,removed_quantity:removed,moved_quantity:moved,confidence:["high","medium","low"].includes(String(raw.confidence))?String(raw.confidence):"low",existing_evidence:String(raw.existing_evidence||""),proposed_evidence:String(raw.proposed_evidence||"")};
  }).filter((item:any)=>item.existing_quantity>0||item.proposed_quantity>0);
  const merged=new Map<string,any>(),unpriced=Array.isArray(extracted.unpriced_items)?extracted.unpriced_items.map(String):[];
  for(const symbol of symbols){
    const actions=[{action:"added",quantity:symbol.added_quantity,index:symbol.added_catalog_index,evidence:symbol.proposed_evidence},{action:"removed",quantity:symbol.removed_quantity,index:symbol.removed_catalog_index,evidence:symbol.existing_evidence},{action:"moved",quantity:symbol.moved_quantity,index:symbol.moved_catalog_index,evidence:[symbol.existing_evidence,symbol.proposed_evidence].filter(Boolean).join(" → ")}];
    for(const action of actions){
      if(action.quantity<=0)continue;
      if(action.index<0){unpriced.push(`${action.quantity} ${action.action} × ${symbol.description||symbol.symbol_label} — no verified ${action.action} action rate in catalogue`);continue}
      const key=`${action.action}:${action.index}`,evidence=[symbol.symbol_label,action.evidence].filter(Boolean).join(" — "),quantities={added_quantity:action.action==="added"?action.quantity:0,removed_quantity:action.action==="removed"?action.quantity:0,moved_quantity:action.action==="moved"?action.quantity:0};
      if(merged.has(key)){const item=merged.get(key);item.quantity=round(item.quantity+action.quantity);item.existing_quantity=round(item.existing_quantity+symbol.existing_quantity);item.proposed_quantity=round(item.proposed_quantity+symbol.proposed_quantity);for(const field of ["added_quantity","removed_quantity","moved_quantity"])item[field]=round(item[field]+quantities[field as keyof typeof quantities]);item.evidence=[item.evidence,evidence].filter(Boolean).join(" / ");if(symbol.confidence==="low")item.confidence="low";else if(symbol.confidence==="medium"&&item.confidence==="high")item.confidence="medium"}
      else merged.set(key,{action:action.action,catalog_index:action.index,quantity:action.quantity,existing_quantity:symbol.existing_quantity,proposed_quantity:symbol.proposed_quantity,...quantities,confidence:symbol.confidence,evidence});
    }
  }
  const order:Record<string,number>={added:0,removed:1,moved:2};
  return{status:"success",summary:String(extracted.summary||"Existing and proposed plans compared."),legend_findings:Array.isArray(extracted.legend_findings)?extracted.legend_findings:[],symbols,items:Array.from(merged.values()).sort((a:any,b:any)=>(order[a.action]-order[b.action])||(a.catalog_index-b.catalog_index)),assumptions:Array.isArray(extracted.assumptions)?extracted.assumptions.map(String):[],warnings:Array.isArray(extracted.warnings)?extracted.warnings.map(String):[],unpriced_items:Array.from(new Set(unpriced))};
}

async function comparePlans(apiKey:string,model:string,trade:TradeConfig,body:any){
  const scanMode=body.scanMode==="smart"?"smart":"fast";
  const modeInstruction=scanMode==="smart"
    ?"Perform a deep, careful comparison. Inspect every relevant page, legend, schedule, symbol family, room and revision in both files. Cross-check counts and explicitly look for duplicates, movement and missing pages."
    :"Perform one efficient comparison pass. Prioritise each plan's legend, visible trade symbols and clear annotations. Do not spend time on speculative interpretation; flag uncertainty instead.";
  const prompt=`You are a cautious Australian residential ${trade.label} existing-to-proposed plan comparison estimator. ${modeInstruction}

The first attached file is FILE A — EXISTING / BEFORE. The second attached file is FILE B — PROPOSED / FUTURE. Never reverse them.

FIRST PERFORM A STRICT TWO-FILE DOCUMENT GATE.
Each file must independently contain: ${trade.required}
If either file fails, is unreadable, is the wrong trade, or does not cover matching areas, return status "missing_trade_plan", empty legend_findings and symbols arrays, and no priceable assumptions. Explain which file is insufficient.

If and only if both gates pass, use this comparison workflow:
1. Read the legend/key in FILE A and FILE B separately. Record each discovered symbol and meaning in legend_findings. A symbol may have a different appearance or meaning between revisions, so do not blindly reuse FILE A's legend for FILE B. If a file has no legend, recognise only a clear standard Australian trade symbol, mark the evidence as "standard symbol inferred — no drawing legend", and reduce confidence; never identify an unfamiliar icon from appearance alone.
2. Locate every occurrence in the drawing area. Never count the example symbol drawn inside a legend/key, schedule header or explanatory note.
3. Count each symbol by page and room/zone in each file, then cross-check totals against schedules and notes.
4. Match comparable rooms/areas and symbol meanings between files. Same symbol in the same location = unchanged. Present only in FILE B = added. Present only in FILE A = removed. Same type clearly shifted to a different location = moved.
5. The arithmetic for every line must satisfy: existing_quantity = unchanged_quantity + removed_quantity + moved_quantity; proposed_quantity = unchanged_quantity + added_quantity + moved_quantity.
6. Do not call an item removed merely because a page, room, crop or scale is absent from one file. If coverage differs, warn and leave the affected comparison uncertain.
7. Map each action separately. added_catalog_index is the exact new-work rate, removed_catalog_index is an exact removal/replacement/existing-work rate, and moved_catalog_index is an exact relocation/alteration/remove-and-reinstall rate. Use -1 whenever that action has no genuinely suitable catalogue item. The three indexes may be different.
8. Never price a removal or relocation using a new-supply item. Never price a pure removal using an install-only rate. Existing-work Replacement / fit-off rates may be used only where the trade rules below expressly allow it. The application prices the action quantities from these separate indexes.
9. Do not count symbols from another trade, background/reference drawings, superseded duplicate sheets or revision overlays twice.

Trade rules: ${trade.rules}

Fixed Alert Construction catalogue. The first number is catalog_index and the final number is the fixed ex-GST rate:
${catalogueText(trade)}

Server-enforced action-rate allowlist:
- removed_catalog_index may only use: ${actionIndexText(trade,"removed")}
- moved_catalog_index may only use: ${actionIndexText(trade,"moved")}
Any other removal/move mapping will be rejected and shown as Unpriced.

Never change rates. Include file, page, room/zone, symbol/legend label or dimension evidence for both existing_evidence and proposed_evidence. Assign high, medium or low confidence to every symbol line. Put unsupported actions or ambiguous work in unpriced_items. If the icon or its legend meaning is unclear, do not guess. A human must be able to see which exact icon meaning and which exact catalogue action rate produced every priced line.

User request: ${String(body.question||`Compare the existing and proposed ${trade.label} plans.`).slice(0,3000)}`;
  const content:any[]=[
    {type:"input_text",text:"FILE A — EXISTING / BEFORE PLAN. Read this file as the current condition."},
    filePart(body.existingFileData,body.existingFileName,body.existingFileType),
    {type:"input_text",text:"FILE B — PROPOSED / FUTURE PLAN. Read this file as the intended new condition."},
    filePart(body.proposedFileData,body.proposedFileName,body.proposedFileType),
    {type:"input_text",text:prompt}
  ];
  const data=await callOpenAI(apiKey,{model,reasoning:{effort:scanMode==="smart"?"high":"low"},input:[{role:"user",content}],text:{format:{type:"json_schema",name:"trade_plan_comparison",strict:true,schema:PLAN_COMPARE_SCHEMA}},store:true,max_output_tokens:scanMode==="smart"?9000:6500});
  const analysis:any=normalisePlanComparison(JSON.parse(outputText(data)),trade);
  analysis.method=scanMode;
  return{analysis,responseId:data.id};
}

function normaliseQuote(extracted:any,trade:TradeConfig){
  const items=(Array.isArray(extracted.items)?extracted.items:[]).map((raw:any)=>{
    let quantity=Math.max(0,Number(raw.quantity)||0);if(!quantity)quantity=1;
    let unit=Math.max(0,Number(raw.quoted_unit_price_ex_gst)||0),line=Math.max(0,Number(raw.quoted_line_total_ex_gst)||0);
    if(!line&&unit)line=unit*quantity;if(!unit&&line&&quantity)unit=line/quantity;
    let index=Number(raw.catalog_index);
    const confidence=String(raw.match_confidence||"none");
    if(!Number.isInteger(index)||index<0||index>=trade.catalog.length||confidence==="low"||confidence==="none")index=-1;
    const ac=index>=0?round(trade.catalog[index].rate*quantity):0,difference=index>=0&&line>0?round(line-ac):0;
    const status=index<0||line<=0?"unmatched":difference>100?"expensive":difference< -100?"cheap":"fair";
    return{quoted_name:String(raw.quoted_name||"Quoted item"),description:String(raw.description||""),quantity:round(quantity),quoted_unit_price_ex_gst:round(unit),quoted_line_total_ex_gst:round(line),catalog_index:index,match_confidence:confidence,evidence:String(raw.evidence||""),notes:String(raw.notes||""),ac_unit_rate:index>=0?trade.catalog[index].rate:0,ac_line_total_ex_gst:ac,difference_ex_gst:difference,status};
  }).filter((item:any)=>item.quoted_name||item.quoted_line_total_ex_gst>0);
  let exTotal=Math.max(0,Number(extracted.quote_total_ex_gst)||0),incTotal=Math.max(0,Number(extracted.quote_total_inc_gst)||0);
  if(!exTotal&&incTotal&&extracted.gst_treatment==="inc_gst")exTotal=incTotal/1.1;
  if(!exTotal)exTotal=items.reduce((sum:number,item:any)=>sum+item.quoted_line_total_ex_gst,0);
  if(!incTotal&&exTotal)incTotal=exTotal*1.1;
  const counts={expensive:0,cheap:0,fair:0,unmatched:0};items.forEach((item:any)=>counts[item.status as keyof typeof counts]++);
  return{supplier:String(extracted.supplier||""),quote_number:String(extracted.quote_number||""),summary:String(extracted.summary||""),gst_treatment:String(extracted.gst_treatment||"unknown"),quote_total_ex_gst:round(exTotal),quote_total_inc_gst:round(incTotal),items,warnings:Array.isArray(extracted.warnings)?extracted.warnings.map(String):[],counts};
}

async function analyseQuote(apiKey:string,model:string,trade:TradeConfig,body:any){
  const prompt=`You are reviewing a real Australian ${trade.label} trade quote. Accuracy matters more than speed.

Read every page and table carefully. Extract every actual priced line item. Do not treat headings, subtotals, GST, deposits, payment schedules, balances, discounts or grand totals as line items. Preserve the supplier's wording and scope.

For each priced line:
1. Extract its quantity, ex-GST unit price and ex-GST line total.
2. If the document shows GST-inclusive pricing, convert the unit and line amount to ex GST by dividing by 1.10.
3. Match it to exactly one AC catalogue item only when the scope and unit basis genuinely align.
4. Use catalog_index -1 and confidence "none" when no reliable match exists.
5. Never spread a lump-sum total across unpriced scope and never invent missing prices or quantities.
6. Distinguish supply-and-install, installation-only, replacement, package, per-item, lineal-metre and square-metre scope.
7. Avoid double counting a package and its descriptive sub-items.

Fixed AC catalogue (the first number is catalog_index; rate is ex GST):
${catalogueText(trade)}

Return quote totals on both ex-GST and inc-GST bases when the document supports them. Clearly warn about exclusions, provisional sums, ambiguous GST, unclear quantities, unmatched scope, duplicated alternatives or anything that can make the comparison unreliable. Do not decide whether the overall quote is expensive from its total; the application will calculate each line separately using a fixed $100 line-item threshold.`;
  const data=await callOpenAI(apiKey,{model,reasoning:{effort:"high"},input:[{role:"user",content:[filePart(body.fileData,body.fileName,body.fileType),{type:"input_text",text:prompt}]}],text:{format:{type:"json_schema",name:"trade_quote_extraction",strict:true,schema:QUOTE_SCHEMA}},store:false,max_output_tokens:6500});
  const extracted=JSON.parse(outputText(data)),analysis:any=normaliseQuote(extracted,trade);
  analysis.market_review={summary:"Compared only with the fixed Alert Construction catalogue. Edit any uncertain match before use.",sources:[]};
  return{analysis,responseId:data.id};
}

async function processRequest(request:Request){
  const origin=request.headers.get("origin");
  if(request.method!=="POST")return json({error:"Method not allowed."},405,origin);
  const apiKey=Deno.env.get("OPENAI_API_KEY");if(!apiKey)return json({error:"Review service is not configured."},503,origin);
  try{
    const body=await request.json(),baseTrade=TRADE_CONFIG[body.trade];if(!baseTrade)return json({error:"Select Electrical, Plumbing or Cladding."},400,origin);
    const trade=await liveTrade(request,String(body.trade),baseTrade);
    const model=Deno.env.get("OPENAI_MODEL")||"gpt-5.6";
    if(body.mode==="question"){
      if(!body.previousResponseId||!body.question)return json({error:"A completed plan analysis and question are required."},400,origin);
      const data=await callOpenAI(apiKey,{model,previous_response_id:body.previousResponseId,input:[{role:"user",content:[{type:"input_text",text:String(body.question).slice(0,3000)}]}],store:true,max_output_tokens:1800});
      return json({answer:outputText(data),responseId:data.id},200,origin);
    }
    if(!["compare","quote"].includes(String(body.mode||"")))return json({error:"Unsupported analysis mode. Refresh the app before trying again."},400,origin);
    if(body.mode==="compare"){
      for(const kind of ["existing","proposed"]){
        const label=kind==="existing"?"Existing / Before":"Proposed / Future",fileType=String(body[`${kind}FileType`]||"").toLowerCase(),fileData=String(body[`${kind}FileData`]||""),fileName=String(body[`${kind}FileName`]||"");
        if(!fileData||!fileName)return json({error:`Upload the ${label} plan before comparing.`},400,origin);
        if(!PLAN_FILE_TYPES.has(fileType))return json({error:`The ${label} plan must be PDF, PNG, JPG or WEBP.`},400,origin);
        if(fileData.length>MAX_DATA_URL_LENGTH)return json({error:`The ${label} plan is too large.`},413,origin);
        if(!fileData.startsWith(`data:${fileType};base64,`))return json({error:`The ${label} plan data is invalid.`},400,origin);
      }
      return json(await comparePlans(apiKey,model,trade,body),200,origin);
    }
    if(!body.fileData||!body.fileName)return json({error:"Upload a quote before analysing it."},400,origin);
    const fileType=String(body.fileType||"").toLowerCase(),fileData=String(body.fileData||"");
    if(!ALLOWED_FILE_TYPES.has(fileType))return json({error:"Upload a PDF, Word, PNG, JPG, WEBP, TXT or CSV file."},400,origin);
    if(fileData.length>MAX_DATA_URL_LENGTH)return json({error:"The file is too large."},413,origin);
    if(!fileData.startsWith(`data:${fileType};base64,`))return json({error:"The uploaded file data is invalid."},400,origin);
    const result=await analyseQuote(apiKey,model,trade,body);
    return json(result,200,origin);
  }catch(error){console.error("analysis error",error instanceof Error?error.message:error);return json({error:"AI analysis failed. Check the Edge Function logs and OPENAI_API_KEY, then try again."},500,origin)}
}

export default {
  async fetch(request:Request){
    const origin=request.headers.get("origin");
    if(origin&&!ALLOWED_ORIGINS.has(origin))return json({error:"Origin not allowed."},403,origin);
    if(request.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});
    if(!origin)return json({error:"Origin required."},403,origin);
    const auth=await requireSignedInUser(request,origin);
    if(auth.response)return auth.response;
    return processRequest(request);
  }
};
