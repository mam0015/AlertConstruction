(function(global){
  'use strict';
  const clean=value=>String(value==null?'':value).trim();
  const safePart=value=>clean(value).replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,90)||'Project';
  const date=value=>{if(!value)return'';const parsed=new Date(`${String(value).slice(0,10)}T00:00:00`);return Number.isNaN(parsed.getTime())?clean(value):parsed.toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'})};
  const year=value=>String(value||new Date().getFullYear()).slice(0,4);
  function filename(company,project){return`${safePart(company.company_name)}_${safePart(project.name)}_Photo-Booklet_${year(new Date().getFullYear())}.pdf`}
  function jspdf(){const source=global.jspdf||global.jsPDF;if(!source)throw new Error('PDF engine is unavailable. Refresh the page and try again.');return source.jsPDF||source}
  function rgb(value,fallback=[245,180,0]){const match=/^#?([0-9a-f]{6})$/i.exec(clean(value));return match?[0,2,4].map(index=>parseInt(match[1].slice(index,index+2),16)):fallback}
  function imageBox(doc,data,x,y,w,h,mode='contain'){
    if(!data){doc.setFillColor(232,232,229);doc.rect(x,y,w,h,'F');doc.setTextColor(145);doc.setFontSize(9);doc.text('PROJECT PHOTO',x+w/2,y+h/2,{align:'center'});return false}
    try{
      const props=doc.getImageProperties(data),ratio=props.width/props.height,boxRatio=w/h;let drawW=w,drawH=h,drawX=x,drawY=y;
      if(mode==='contain'){if(ratio>boxRatio){drawH=w/ratio;drawY=y+(h-drawH)/2}else{drawW=h*ratio;drawX=x+(w-drawW)/2}}
      else if(ratio>boxRatio){drawW=h*ratio;drawX=x-(drawW-w)/2}else{drawH=w/ratio;drawY=y-(drawH-h)/2}
      doc.addImage(data,props.fileType||'JPEG',drawX,drawY,drawW,drawH,undefined,'FAST');return true;
    }catch(_){doc.setFillColor(232,232,229);doc.rect(x,y,w,h,'F');doc.setTextColor(145);doc.setFontSize(9);doc.text('PHOTO UNAVAILABLE',x+w/2,y+h/2,{align:'center'});return false}
  }
  function logo(doc,data,x,y,maxW=48,maxH=28){
    if(!data)return false;try{const props=doc.getImageProperties(data),ratio=props.width/props.height;let w=maxW,h=w/ratio;if(h>maxH){h=maxH;w=h*ratio}doc.addImage(data,props.fileType||'PNG',x,y,w,h,undefined,'FAST');return true}catch(_){return false}
  }
  function addHeader(doc,company,brand,title,kicker){
    doc.setFillColor(20,23,23);doc.rect(0,0,210,25,'F');doc.setFillColor(...brand);doc.rect(0,0,5,25,'F');
    doc.setTextColor(255);doc.setFont(doc.__acFont||'helvetica','bold');doc.setFontSize(9);doc.text(clean(company.company_name)||'Construction Company',15,10);
    doc.setFont(doc.__acFont||'helvetica','normal');doc.setTextColor(190);doc.setFontSize(7);doc.text(clean(kicker).toUpperCase(),15,16);
    doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(255);doc.setFontSize(10);doc.text(clean(title),195,13,{align:'right',maxWidth:85});
  }
  function addPage(doc,company,brand,title,kicker){doc.addPage();addHeader(doc,company,brand,title,kicker);return 37}
  function textBlock(doc,label,value,x,y,w,brand){
    if(!clean(value))return y;doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(...brand);doc.setFontSize(7);doc.text(clean(label).toUpperCase(),x,y);y+=5;doc.setFont(doc.__acFont||'helvetica','normal');doc.setTextColor(40);doc.setFontSize(9);const lines=doc.splitTextToSize(clean(value),w);doc.text(lines,x,y);return y+lines.length*4.2+5;
  }
  function fact(doc,label,value,x,y,w){
    doc.setFillColor(246,245,241);doc.roundedRect(x,y,w,17,2,2,'F');doc.setFont(doc.__acFont||'helvetica','normal');doc.setTextColor(130);doc.setFontSize(6.8);doc.text(clean(label).toUpperCase(),x+4,y+5);doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(30);doc.setFontSize(8.4);doc.text(doc.splitTextToSize(clean(value)||'-',w-8).slice(0,2),x+4,y+10);return y+21
  }
  function photoCard(doc,photo,x,y,w,h,brand){
    doc.setFillColor(248,247,243);doc.roundedRect(x,y,w,h,2,2,'F');imageBox(doc,photo.data_url,x+2,y+2,w-4,h-22,'contain');
    doc.setFillColor(...brand);doc.rect(x+2,y+h-20,2,h>55?15:12,'F');doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(28);doc.setFontSize(8);doc.text(clean(photo.title)||clean(photo.area)||clean(photo.project_stage)||photo.phase,x+7,y+h-15,{maxWidth:w-11});
    doc.setFont(doc.__acFont||'helvetica','normal');doc.setTextColor(105);doc.setFontSize(6.8);const meta=[photo.area,photo.project_stage,date(photo.photo_date)].filter(Boolean).join('  |  ');doc.text(clean(meta),x+7,y+h-10,{maxWidth:w-11});
    if(photo.description){doc.setTextColor(65);doc.setFontSize(6.5);doc.text(doc.splitTextToSize(clean(photo.description),w-11).slice(0,1),x+7,y+h-6)}
  }
  function addPhotoSection(doc,company,brand,title,kicker,photos){
    if(!photos.length)return;
    for(let index=0;index<photos.length;index+=2){
      let y=addPage(doc,company,brand,index?`${title} continued`:title,kicker),batch=photos.slice(index,index+2);
      batch.forEach((photo,offset)=>{photoCard(doc,photo,15,y,180,102,brand);y+=111});
    }
  }
  function projectLocation(project,booklet){
    const mode=clean(booklet.location_mode)||'Hide Location';if(mode==='Hide Location')return'';
    if(mode==='Show Full Address')return clean(project.address);
    const address=clean(project.address),parts=address.split(',').map(part=>part.trim()).filter(Boolean);return parts.length>1?parts.slice(-2).join(', '):address;
  }
  function installFonts(doc,options){
    const normal=clean(options.fontNormalData).split(',').pop(),bold=clean(options.fontBoldData).split(',').pop();if(!normal||!bold)return;
    try{doc.addFileToVFS('ACSans-Regular.ttf',normal);doc.addFont('ACSans-Regular.ttf','ACSans','normal');doc.addFileToVFS('ACSans-Bold.ttf',bold);doc.addFont('ACSans-Bold.ttf','ACSans','bold');doc.__acFont='ACSans'}catch(_){doc.__acFont='helvetica'}
  }
  function buildMarketingBooklet(project={},photos=[],pairs=[],company={},booklet={},options={}){
    const JsPDF=jspdf(),doc=new JsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),brand=rgb(company.brand_colour),approved=photos.filter(photo=>photo.privacy_status==='Approved for Marketing'),before=approved.filter(photo=>photo.phase==='Before'),during=approved.filter(photo=>photo.phase==='During'),after=approved.filter(photo=>photo.phase==='After'),byId=new Map(approved.map(photo=>[photo.id,photo])),validPairs=pairs.map(pair=>({...pair,before:byId.get(pair.before_photo_id),after:byId.get(pair.after_photo_id)})).filter(pair=>pair.before&&pair.after),cover=approved.find(photo=>photo.cover_photo)||approved.find(photo=>photo.featured&&photo.phase==='After')||after[0]||approved[0],location=projectLocation(project,booklet),title=clean(booklet.title)||'Project Transformation Report';
    if(!approved.length)throw new Error('Approve at least one photo for Marketing before creating the booklet.');
    installFonts(doc,options);

    doc.setFillColor(18,21,21);doc.rect(0,0,210,297,'F');imageBox(doc,cover?.data_url,0,0,210,190,'cover');doc.setFillColor(18,21,21);doc.rect(0,186,210,111,'F');doc.setFillColor(...brand);doc.rect(0,186,7,111,'F');
    if(!logo(doc,options.logoData,15,202,52,28)){doc.setTextColor(255);doc.setFont(doc.__acFont||'helvetica','bold');doc.setFontSize(12);doc.text(clean(company.company_name)||'Construction Company',15,209)}
    doc.setFont(doc.__acFont||'helvetica','normal');doc.setTextColor(...brand);doc.setFontSize(8);doc.text(title.toUpperCase(),15,239);doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(255);doc.setFontSize(27);doc.text(doc.splitTextToSize(clean(project.name)||'Project',170).slice(0,2),15,251);
    doc.setFont(doc.__acFont||'helvetica','normal');doc.setTextColor(190);doc.setFontSize(9);doc.text([clean(booklet.project_type),location,[date(booklet.start_date),date(booklet.completion_date)].filter(Boolean).join(' - ')].filter(Boolean).join('  |  '),15,278,{maxWidth:175});
    if(company.slogan){doc.setTextColor(225);doc.setFontSize(8);doc.text(clean(company.slogan),15,288,{maxWidth:175})}

    let y=addPage(doc,company,brand,'Project Overview','The project');
    const facts=[['Project',project.name],['Project type',booklet.project_type],['Location',location||'Private'],['Status',project.status||booklet.project_status],['Started',date(booklet.start_date)],['Completed',date(booklet.completion_date)]];
    facts.forEach((item,index)=>fact(doc,item[0],item[1],15+(index%2)*92,37+Math.floor(index/2)*21,87));y=105;
    [['Initial requirements',booklet.initial_requirements],['Initial condition',booklet.initial_problems],['Scope of work',booklet.scope_of_work],['Challenges and solutions',[booklet.project_challenges,booklet.solutions_provided].filter(Boolean).join('\n\n')],['Final result',booklet.final_result]].forEach(([label,value])=>{y=textBlock(doc,label,value,15,y,180,brand)});

    y=addPage(doc,company,brand,'About Our Company','Who we are');logo(doc,options.logoData,15,y,52,30);y+=36;
    doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(24);doc.setFontSize(20);doc.text(clean(company.company_name)||'Our Company',15,y);y+=9;
    if(company.slogan){doc.setFont(doc.__acFont||'helvetica','normal');doc.setTextColor(...brand);doc.setFontSize(10);doc.text(clean(company.slogan),15,y);y+=10}
    y=textBlock(doc,'About',company.company_description,15,y,180,brand);y=textBlock(doc,'Main services',company.services,15,y,180,brand);y=textBlock(doc,'Service areas',company.service_areas,15,y,180,brand);
    const trust=[company.builder_registration_number?`Builder Registration: ${company.builder_registration_number}`:'',company.abn?`ABN ${company.abn}`:''].filter(Boolean);if(trust.length){doc.setFillColor(246,245,241);doc.roundedRect(15,y,180,20,2,2,'F');doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(40);doc.setFontSize(8.5);doc.text(trust.join('  |  '),20,y+12,{maxWidth:170})}

    addPhotoSection(doc,company,brand,'Before','Initial condition',before);
    if(during.length){
      const stages=[];during.forEach(photo=>{const stage=clean(photo.project_stage)||'Construction Progress';let group=stages.find(item=>item.stage===stage);if(!group){group={stage,photos:[]};stages.push(group)}group.photos.push(photo)});
      stages.forEach(group=>addPhotoSection(doc,company,brand,group.stage,'During construction',group.photos));
    }
    addPhotoSection(doc,company,brand,'Completed Project','The finished result',after);

    validPairs.forEach((pair,index)=>{
      y=addPage(doc,company,brand,index?'Before & After continued':'Before & After','Transformation comparison');doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(30);doc.setFontSize(15);doc.text(clean(pair.title)||clean(pair.before.area)||'Project transformation',15,y);y+=9;
      const cardY=y,imageH=93;imageBox(doc,pair.before.data_url,15,cardY,87,imageH,'contain');imageBox(doc,pair.after.data_url,108,cardY,87,imageH,'contain');doc.setFillColor(25,28,28);doc.rect(15,cardY,29,8,'F');doc.rect(108,cardY,25,8,'F');doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(255);doc.setFontSize(7);doc.text('BEFORE',19,cardY+5.5);doc.text('AFTER',112,cardY+5.5);y=cardY+104;
      if(pair.description)y=textBlock(doc,'What changed',pair.description,15,y,180,brand);
    });

    y=addPage(doc,company,brand,'Project Summary','The result');
    [['Work completed',booklet.work_completed||booklet.scope_of_work],['Result',booklet.final_result],['Services delivered',booklet.main_services_completed],['Problems solved',booklet.problems_solved],['Project highlights',booklet.project_highlights],['Thank you',booklet.thank_you_message||'Thank you for taking the time to view this project.']].forEach(([label,value])=>{y=textBlock(doc,label,value,15,y,180,brand)});
    const cta=clean(booklet.call_to_action)||'Planning a renovation or construction project? Contact our team to discuss how we can help bring your project to life.';doc.setFillColor(20,23,23);doc.roundedRect(15,Math.min(y+3,245),180,29,2,2,'F');doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(...brand);doc.setFontSize(10);doc.text(doc.splitTextToSize(cta,166),22,Math.min(y+3,245)+11);

    y=addPage(doc,company,brand,'Contact','Start a conversation');doc.setFillColor(20,23,23);doc.roundedRect(15,y,180,210,3,3,'F');logo(doc,options.logoData,28,y+18,65,35);doc.setFont(doc.__acFont||'helvetica','bold');doc.setTextColor(255);doc.setFontSize(23);doc.text(doc.splitTextToSize(clean(company.company_name)||'Construction Company',145),28,y+66);if(company.slogan){doc.setFont(doc.__acFont||'helvetica','normal');doc.setTextColor(...brand);doc.setFontSize(10);doc.text(clean(company.slogan),28,y+83,{maxWidth:150})}
    doc.setFont(doc.__acFont||'helvetica','normal');doc.setTextColor(210);doc.setFontSize(9.5);let contactY=y+109;[[company.phone,'Phone'],[company.email,'Email'],[company.website,'Website'],[company.service_areas,'Service areas'],[company.abn?`ABN ${company.abn}`:'','Business']].filter(([value])=>clean(value)).forEach(([value,label])=>{doc.setTextColor(...brand);doc.setFont(doc.__acFont||'helvetica','bold');doc.setFontSize(7);doc.text(label.toUpperCase(),28,contactY);contactY+=5;doc.setTextColor(240);doc.setFont(doc.__acFont||'helvetica','normal');doc.setFontSize(10);doc.text(doc.splitTextToSize(clean(value),145),28,contactY);contactY+=13});doc.setTextColor(225);doc.setFontSize(9);doc.text(doc.splitTextToSize(cta,150),28,y+193);

    const pages=doc.getNumberOfPages();for(let page=2;page<=pages;page++){doc.setPage(page);doc.setDrawColor(225);doc.line(15,282,195,282);doc.setFont(doc.__acFont||'helvetica','normal');doc.setFontSize(7);doc.setTextColor(135);doc.text(clean(company.company_name)||'Company',15,288);doc.text(`Page ${page} of ${pages}`,195,288,{align:'right'})}
    return{doc,blob:doc.output('blob'),filename:filename(company,project),approvedPhotoCount:approved.length,pageCount:pages};
  }
  const api={buildMarketingBooklet,filename};global.ACBookletPDF=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
