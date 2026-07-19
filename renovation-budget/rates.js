(function(global){
  'use strict';

  /*
    Public rate schema only. Verified Electrical, Plumbing and Cladding values
    are loaded after Supabase Auth + RLS approval. No Builder rate is shipped
    in the GitHub Pages bundle. Other values remain clearly labelled planning
    allowances and never receive the "Verified AC rate" trust label.
  */
  const protectedRate=(trade,index,name,unit='each')=>({name,rate:null,unit,catalogueKey:`${trade}:${index}`});
  const verified={
    electrical:{
      downlightSupply:protectedRate('electrical',0,'LED Downlight — supply, wiring & install'),
      downlightInstall:protectedRate('electrical',1,'LED Downlight — install only'),
      bathroomWallLight:protectedRate('electrical',2,'Bathroom Wall Light — install on tiles'),
      entranceLight:protectedRate('electrical',3,'Outdoor Entrance Light'),
      shavingLight:protectedRate('electrical',4,'Shaving Cabinet Light'),
      powerPointNew:protectedRate('electrical',5,'Power Point — new wiring & install'),
      powerPointReplace:protectedRate('electrical',6,'Power Point — replacement / fit-off'),
      doublePowerPoint:protectedRate('electrical',7,'Double Power Point with extra switch'),
      weatherproofPower:protectedRate('electrical',8,'Weatherproof Power Point'),
      switch1Replace:protectedRate('electrical',9,'1 Gang Light Switch — replacement'),
      switch1New:protectedRate('electrical',10,'1 Gang Light Switch — new wiring'),
      switch2Replace:protectedRate('electrical',11,'2 Gang Light Switch — replacement'),
      switch2New:protectedRate('electrical',12,'2 Gang Light Switch — new wiring'),
      switch3Replace:protectedRate('electrical',13,'3 Gang Light Switch — replacement'),
      switch3New:protectedRate('electrical',14,'3 Gang Light Switch — new wiring'),
      switch4New:protectedRate('electrical',15,'4 Gang Light Switch — replacement'),
      dimmer:protectedRate('electrical',16,'Rotary LED Dimmer'),
      towelHeater:protectedRate('electrical',17,'Electric Towel Heater'),
      towelRack:protectedRate('electrical',18,'Non-Electric Towel Rack'),
      fanHeatLight:protectedRate('electrical',19,'3-in-1 Fan / Heat / Light Combo'),
      rangehoodDuct:protectedRate('electrical',20,'Rangehood Duct'),
      tvPoint:protectedRate('electrical',21,'TV Antenna Point'),
      dataPoint:protectedRate('electrical',22,'Data Point')
    },
    plumbing:{
      bathroomRoughIn:protectedRate('plumbing',0,'Bathroom Rough-In Package','bathroom'),
      ensuiteRoughIn:protectedRate('plumbing',1,'Ensuite Rough-In Package','ensuite'),
      groundBathroomRoughIn:protectedRate('plumbing',2,'Ground Floor Bathroom Rough-In','bathroom'),
      laundryRoughIn:protectedRate('plumbing',3,'Laundry Rough-In','laundry'),
      kitchenRoughIn:protectedRate('plumbing',4,'Kitchen Rough-In','kitchen'),
      retreatSinkRoughIn:protectedRate('plumbing',5,'Retreat Sink Rough-In','sink'),
      waterPoint:protectedRate('plumbing',6,'New Water Point Rough-In','point'),
      wastePoint:protectedRate('plumbing',7,'Waste Point Rough-In','point'),
      wallMixer:protectedRate('plumbing',8,'Wall Mixer Rough-In'),
      smartToilet:protectedRate('plumbing',9,'Smart Toilet Setup'),
      rainShowerNogging:protectedRate('plumbing',10,'Rain Shower Nogging'),
      toiletFitOff:protectedRate('plumbing',11,'Toilet Fit-Off'),
      vanityFitOff:protectedRate('plumbing',12,'Vanity Basin Fit-Off'),
      showerFitOff:protectedRate('plumbing',13,'Shower Fit-Off'),
      bathFitOff:protectedRate('plumbing',14,'Bath Fit-Off'),
      kitchenSinkFitOff:protectedRate('plumbing',15,'Kitchen Sink Fit-Off'),
      laundryTroughFitOff:protectedRate('plumbing',16,'Laundry Trough Fit-Off'),
      fridgeWater:protectedRate('plumbing',17,'Water to Fridge Fit-Off'),
      dishwasher:protectedRate('plumbing',18,'Dishwasher Connection'),
      gasAlteration:protectedRate('plumbing',19,'Gas Line Alteration'),
      gasCooktop:protectedRate('plumbing',20,'Gas Hot Plate Fit-Off'),
      concreteCut:protectedRate('plumbing',21,'Concrete Saw Cut / Jackhammer Allowance','allowance'),
      drainAlteration:protectedRate('plumbing',22,'Sanitary Drain Alteration'),
      bathWaste:protectedRate('plumbing',23,'Coloured Bath Waste + Flexible Connection'),
      minorItem:protectedRate('plumbing',24,'Call-Out / Minor Plumbing Item')
    },
    cladding:{
      linealMetre:protectedRate('cladding',0,'Thermory Pine Trax Natural C32 Cladding','LM'),
      length54:protectedRate('cladding',1,'Thermory C32 Cladding — 5.4m Length','length'),
      coverage:protectedRate('cladding',2,'Thermory C32 Cladding — material coverage','m²'),
      package28:protectedRate('cladding',3,'Thermory C32 — 28 Lengths / 151.40 LM','package'),
      corner42:protectedRate('cladding',4,'42 x 42 Thermolit Corner Mould @ 4200mm'),
      cornerLm:protectedRate('cladding',5,'42 x 42 Thermolit Corner Mould','LM'),
      cornerPack:protectedRate('cladding',6,'Corner Moulding Pack — 6 pieces','pack'),
      delivery:protectedRate('cladding',7,'Cladding Delivery','delivery'),
      originalPackage:protectedRate('cladding',8,'Original Invoice Package','package'),
      revisedPackage:protectedRate('cladding',9,'Revised Invoice Package','package'),
      orderPackage:protectedRate('cladding',10,'Order Confirmation Package','package')
    }
  };

  const allowances={
    demolition:{
      bathroom:{name:'Bathroom demolition and strip-out',rate:2800,unit:'room'},
      kitchen:{name:'Kitchen demolition and strip-out',rate:3400,unit:'room'},
      laundry:{name:'Laundry demolition and strip-out',rate:1500,unit:'room'},
      interior:{name:'General internal demolition',rate:48,unit:'m² of floor area'},
      waste:{name:'Waste removal and disposal',rate:950,unit:'load'}
    },
    waterproofing:{
      bathroom:{name:'Bathroom waterproofing',rate:105,unit:'m²'},
      laundry:{name:'Laundry waterproofing',rate:90,unit:'m²'}
    },
    tiling:{
      floorInstall:{name:'Floor tile installation',rate:105,unit:'m²'},
      wallInstall:{name:'Wall tile installation',rate:125,unit:'m²'},
      splashbackInstall:{name:'Splashback tile installation',rate:135,unit:'m²'},
      tileSupply:{name:'Tile supply allowance',rate:55,unit:'m²'}
    },
    cabinetry:{
      kitchen:{name:'Kitchen cabinetry and joinery',rate:1150,unit:'linear metre'},
      vanity:{name:'Bathroom vanity allowance',rate:1250,unit:'each'},
      laundry:{name:'Laundry cabinetry and joinery',rate:900,unit:'linear metre'},
      wardrobe:{name:'Built-in wardrobe allowance',rate:1800,unit:'each'}
    },
    benchtop:{
      stone:{name:'Engineered stone / porcelain benchtop allowance',rate:720,unit:'m²'},
      laminate:{name:'Laminate benchtop allowance',rate:280,unit:'m²'}
    },
    fixtures:{
      bathroom:{name:'Bathroom fixtures and fittings allowance',rate:2800,unit:'bathroom'},
      bath:{name:'Bath supply allowance',rate:950,unit:'each'},
      showerScreen:{name:'Frameless shower screen allowance',rate:1150,unit:'each'},
      kitchenSink:{name:'Kitchen sink and tap allowance',rate:850,unit:'kitchen'},
      laundryTrough:{name:'Laundry trough and tap allowance',rate:650,unit:'laundry'},
      appliances:{name:'Kitchen appliance allowance',rate:5200,unit:'kitchen'}
    },
    carpentry:{
      bathroomPrep:{name:'Bathroom carpentry and substrate preparation',rate:1750,unit:'room'},
      kitchenPrep:{name:'Kitchen carpentry and wall preparation',rate:2100,unit:'room'},
      laundryPrep:{name:'Laundry carpentry and wall preparation',rate:900,unit:'room'},
      wallChange:{name:'Internal wall modification allowance',rate:2300,unit:'wall'},
      internalDoor:{name:'Internal door replacement',rate:720,unit:'door'},
      skirting:{name:'Skirting and architrave allowance',rate:32,unit:'linear metre'},
      deck:{name:'Timber/composite deck allowance',rate:520,unit:'m²'},
      pergola:{name:'Pergola allowance',rate:980,unit:'m²'}
    },
    plastering:{
      wetArea:{name:'Wet-area plaster and patching',rate:850,unit:'room'},
      walls:{name:'Internal plaster repair allowance',rate:28,unit:'m² of floor area'}
    },
    painting:{
      bathroom:{name:'Bathroom painting allowance',rate:780,unit:'room'},
      kitchen:{name:'Kitchen painting allowance',rate:900,unit:'room'},
      laundry:{name:'Laundry painting allowance',rate:580,unit:'room'},
      interior:{name:'Whole-interior painting allowance',rate:52,unit:'m² of floor area'},
      exterior:{name:'Exterior painting allowance',rate:68,unit:'m² of wall area'}
    },
    flooring:{
      hybrid:{name:'Hybrid flooring — supply and install',rate:88,unit:'m²'},
      carpet:{name:'Carpet — supply and install',rate:62,unit:'m²'},
      timber:{name:'Engineered timber — supply and install',rate:175,unit:'m²'},
      tile:{name:'Internal floor tiles — supply and install',rate:165,unit:'m²'}
    },
    exterior:{
      claddingInstall:{name:'Cladding installation allowance',rate:92,unit:'m²'},
      landscaping:{name:'Landscaping allowance',rate:185,unit:'m²'},
      fence:{name:'New fencing allowance',rate:180,unit:'linear metre'},
      exteriorDoor:{name:'External door replacement allowance',rate:2200,unit:'door'},
      window:{name:'Window replacement allowance',rate:1450,unit:'window'},
      gutter:{name:'Gutter and downpipe allowance',rate:105,unit:'linear metre'}
    },
    professional:{
      design:{name:'Design, documentation and permit allowance',rate:6500,unit:'project'},
      engineering:{name:'Engineering allowance',rate:3500,unit:'project'},
      preliminaries:{name:'Site setup and project preliminaries',rate:4200,unit:'project'},
      cleaning:{name:'Final clean and handover allowance',rate:1400,unit:'project'}
    }
  };

  global.ACRenovationRates={
    verified,
    allowances,
    customerMargin:0.20,
    gst:0.10,
    qualityMultipliers:{essential:0.82,standard:1,premium:1.35,luxury:1.75},
    qualityLabels:{essential:'Essential / Budget',standard:'Standard',premium:'Premium',luxury:'Luxury'},
    missingVerifiedCatalogues:['Tiling','Carpentry & framing','Cabinetry & joinery','Waterproofing','Demolition','Painting','Flooring','Roofing','Windows & doors','Landscaping','Concreting','Heating & cooling','Permits & design']
  };
  const catalogue=global.AC_CATALOGUE_DEFAULTS||(global.AC_CATALOGUE_DEFAULTS=[]),tradeMap={demolition:'demolition',waterproofing:'waterproofing',tiling:'tiling',cabinetry:'cabinetry',benchtop:'benchtops',fixtures:'fixtures',carpentry:'carpentry',plastering:'plastering',painting:'painting',flooring:'flooring',exterior:'exterior',professional:'professional'};
  Object.entries(allowances).forEach(([group,items])=>Object.entries(items).forEach(([key,item],index)=>catalogue.push({item_key:`renovation:${group}:${key}`,trade:tradeMap[group]||'general',sort_order:index,name:item.name,builder_rate:Number(item.rate),unit:item.unit,customer_margin:20,active:true,source:'planning-allowance'})));
})(window);
