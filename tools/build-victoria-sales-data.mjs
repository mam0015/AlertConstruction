import fs from 'node:fs';
import path from 'node:path';

const [houseQuarterFile,unitQuarterFile,houseAnnualFile,unitAnnualFile,outputFile]=process.argv.slice(2);
if(!outputFile)throw new Error('Usage: node build-victoria-sales-data.mjs house-quarter unit-quarter house-annual unit-annual output.js');

function rows(file){
  return fs.readFileSync(file,'utf8').split(/\r?\n/).map(line=>line.trim()).filter(line=>/^[A-Z]/.test(line));
}

function parts(line){
  const match=line.match(/^([A-Z][A-Z0-9 '&()./\-]*?)\s+(\d.*)$/);
  if(!match)return null;
  const tokens=[...match[2].replaceAll(',','').matchAll(/(\d+(?:\.\d+)?)([\^*]?)/g)].map(item=>({value:Number(item[1]),marker:item[2]||''}));
  return{name:match[1].replace(/\s+/g,' ').trim(),tokens};
}

function quarterly(file){
  const result={};
  for(const line of rows(file)){
    const parsed=parts(line);if(!parsed||parsed.tokens.length<7)continue;
    const medians=parsed.tokens.slice(0,5).map(item=>item.value),q4Sales=parsed.tokens[5].value,yearSales=parsed.tokens[6].value;
    if(!medians.every(value=>value>=50000)||q4Sales>5000||yearSales>20000)continue;
    result[parsed.name]={q4:medians[4],q4Sales,yearSales,lowSample:parsed.tokens[4].marker==='^'||q4Sales<10};
  }
  return result;
}

function annual(file){
  const result={};
  for(const line of rows(file)){
    const parsed=parts(line);if(!parsed||parsed.tokens.length<12)continue;
    const annual2025=parsed.tokens[10].value;
    if(annual2025>=50000&&annual2025<=20000000)result[parsed.name]=annual2025;
  }
  return result;
}

const hq=quarterly(houseQuarterFile),uq=quarterly(unitQuarterFile),ha=annual(houseAnnualFile),ua=annual(unitAnnualFile),names=[...new Set([...Object.keys(hq),...Object.keys(uq),...Object.keys(ha),...Object.keys(ua)])].sort(),suburbs={};
for(const name of names){
  const entry={};
  if(ha[name]||hq[name])entry.h=[ha[name]||null,hq[name]?.q4||null,hq[name]?.q4Sales||0,hq[name]?.yearSales||0,hq[name]?.lowSample?1:0];
  if(ua[name]||uq[name])entry.u=[ua[name]||null,uq[name]?.q4||null,uq[name]?.q4Sales||0,uq[name]?.yearSales||0,uq[name]?.lowSample?1:0];
  suburbs[name]=entry;
}

if(suburbs.ROWVILLE?.h?.[0]!==1151500||suburbs.ROWVILLE?.h?.[1]!==1220000)throw new Error('Official Rowville house data did not parse as expected');
if(Object.keys(suburbs).length<700)throw new Error(`Only ${Object.keys(suburbs).length} suburbs parsed`);

const payload={
  source:'Valuer-General Victoria property sales statistics',
  sourceUrl:'https://www.land.vic.gov.au/valuations/resources-and-reports/property-sales-statistics',
  annualPeriod:'2025',quarterPeriod:'Oct–Dec 2025',released:'June–July 2026',generatedAt:new Date().toISOString(),
  fields:['annual2025','q4_2025','q4Sales','yearSales','q4LowSample'],suburbs
};
fs.writeFileSync(path.resolve(outputFile),`/* Generated from official Valuer-General Victoria tables. Do not edit values manually. */\nwindow.ACVictoriaSalesData=${JSON.stringify(payload)};\n`);
console.log(`Wrote ${Object.keys(suburbs).length} Victorian localities to ${outputFile}`);
