// Everything the public pages say, in one place, so a name, a link or an address is changed once.
//
// The wording of the service descriptions below is general: it says what a job of that kind normally includes. What is included in a particular
// project is always the written estimate or contract, and the pages say so.

// The product's name: Alert Tradie Pro (the same as the logo in the header). This is the only place that says it on the content pages.
export const PRODUCT_NAME = "Alert Tradie Pro";
export const CONSTRUCTION_NAME = "Alert Construction";
export const ENGINEERS_NAME = "Alert Engineers";

export const CONSTRUCTION_URL = "https://alertconstruction.com.au";
export const ENGINEERS_URL = "https://alertengineers.com.au";

// Where customers write when something is wrong. Shown on the Support page only.
export const SUPPORT_EMAIL = "mamobiniali@gmail.com";
export const SUPPORT_SUBJECT = `Support request - ${PRODUCT_NAME}`;

export type ServiceInfo = {
  slug: string;
  title: string;
  brand: typeof CONSTRUCTION_NAME | typeof ENGINEERS_NAME;
  tagline: string;
  image: string;
  about: string;
  includes: string[];
  goodFor: string;
};

export const SERVICES: ServiceInfo[] = [
  {
    slug: "kitchen-renovations",
    title: "Kitchen Renovations",
    brand: CONSTRUCTION_NAME,
    tagline: "Modern kitchens designed around the way you live.",
    image: "/images/service-kitchen.webp",
    about: "A kitchen renovation replaces or reshapes the room you use the most. We plan the layout around how you cook, store and entertain, then manage the build from removal of the old kitchen to the final clean.",
    includes: [
      "Layout, storage and lighting planning around your household",
      "Removal of the old kitchen and preparation of the room",
      "Cabinetry, benchtops, splashbacks and fittings",
      "Plumbing, electrical and gas work arranged through licensed trades, as the law requires",
      "Flooring, painting and finishing, then a defects check and handover",
    ],
    goodFor: "Outdated or cramped kitchens, a new layout, opening the kitchen to the living area, or a refresh before selling.",
  },
  {
    slug: "bathroom-renovations",
    title: "Bathroom Renovations",
    brand: CONSTRUCTION_NAME,
    tagline: "Practical, refined bathrooms built to last.",
    image: "/images/service-bathroom.webp",
    about: "A bathroom renovation is mostly about what you cannot see: waterproofing, falls and ventilation. We build those properly first, then finish the room so it is easy to live with and easy to clean.",
    includes: [
      "Layout planning for the shower, bath, vanity, toilet and storage",
      "Strip-out, repairs to the floor and walls, and waterproofing",
      "Tiling, vanity, shower screen, tapware and accessories",
      "Plumbing and electrical work arranged through licensed trades, as the law requires",
      "Ventilation, a final clean, a defects check and handover",
    ],
    goodFor: "Leaks or damp, tired tiling, a bathroom that no longer suits the household, or adding an ensuite.",
  },
  {
    slug: "home-renovations",
    title: "Home Renovations",
    brand: CONSTRUCTION_NAME,
    tagline: "Improve comfort, function and value throughout your home.",
    image: "/images/service-renovation.webp",
    about: "A home renovation can be one room or the whole house. We scope the work in stages, so you know what is being done, in what order, and what it will take to live around it.",
    includes: [
      "Room-by-room or whole-home scope, in a sensible order of work",
      "Walls, ceilings, floors, doors, windows and joinery",
      "Repairs found along the way, raised with you before they are done",
      "Painting, finishing and a final clean",
      "Regular approved updates in your portal while the work is under way",
    ],
    goodFor: "Homes that need updating, family changes, a new look, or fixing the things that keep being put off.",
  },
  {
    slug: "home-extensions",
    title: "Home Extensions",
    brand: CONSTRUCTION_NAME,
    tagline: "More space, better flow and a stronger connection to home.",
    image: "/images/service-extension.webp",
    about: "An extension adds space without the cost of moving. We coordinate the design, the engineering and the approvals your project needs, then build it so the new part joins the old one properly.",
    includes: [
      "Early advice on what is practical on your block and budget",
      "Engineering input from Alert Engineers, and coordination of the approvals the project needs",
      "Structure, roof, services and weather-tight enclosure",
      "Linking the new space to the existing home, inside and out",
      "Finishes, inspections at the key stages, and handover",
    ],
    goodFor: "A growing family, a home office, a bigger living area, a second storey, or a new bedroom and bathroom.",
  },
  {
    slug: "new-homes",
    title: "New Homes",
    brand: CONSTRUCTION_NAME,
    tagline: "Quality new homes tailored to your site and lifestyle.",
    image: "/images/service-new-home.webp",
    about: "A new home starts with your site and the way you want to live. We guide you from the first conversation to the keys, with engineering, approvals and each stage of construction explained along the way.",
    includes: [
      "Site assessment and early advice on what suits the land",
      "Engineering from Alert Engineers and coordination of design and approvals",
      "Construction by stage, with inspections and approved progress updates",
      "Selections and variations written down and agreed before they are built",
      "Quality inspection and a clear handover",
    ],
    goodFor: "Owners with land, knock-down rebuilds, and anyone who wants one team to run the whole job.",
  },
  {
    slug: "building-inspections",
    title: "Building Inspections",
    brand: CONSTRUCTION_NAME,
    tagline: "Clear, practical reports backed by building experience.",
    image: "/images/service-inspection.webp",
    about: "A building inspection tells you the condition of a building in plain words. A builder looks at the structure, the finishes and the signs of trouble, and you receive a written report that says what matters first.",
    includes: [
      "A site inspection by an experienced builder",
      "A written report with photos and a plain-language summary",
      "Defects and risks explained, with what to deal with first",
      "Stage or completion inspections for work under way",
      "Advice on repairs and on whether an engineer should look as well",
    ],
    goodFor: "Buying or selling, checking work that has been done, new-build stage checks, or a second opinion.",
  },
  {
    slug: "maintenance-and-repairs",
    title: "Maintenance & Repairs",
    brand: CONSTRUCTION_NAME,
    tagline: "Reliable help to keep your property in good condition.",
    image: "/images/service-maintenance.webp",
    about: "Small jobs left too long become big ones. Maintenance and repairs keeps a property sound: we find the cause, fix it properly and tell you what to watch for next.",
    includes: [
      "Carpentry, patching, painting and general building repairs",
      "Water-damage and leak-related repairs, once the source is dealt with",
      "Doors, windows, locks, fittings and fixtures",
      "A written list of the work, so you know what was done",
      "Photos before and after for your records",
    ],
    goodFor: "Landlords and owners, pre-sale tidy-ups, and the list of small jobs that never gets finished.",
  },
  {
    slug: "engineering-services",
    title: "Engineering Services",
    brand: ENGINEERS_NAME,
    tagline: "Structural engineering, assessments, reports and advice.",
    image: "/images/service-engineering.webp",
    about: "Alert Engineers looks after the engineering side of building work. That includes designing structure for new work, assessing existing structure, and writing clear reports you can act on. Alert Construction works with Alert Engineers on its own projects.",
    includes: [
      "Structural design and drawings for renovations, extensions and new homes",
      "Assessment of existing structure, for example cracking, movement or removing a wall",
      "Written reports with practical recommendations",
      "Technical advice during design and construction",
      "Coordination with the builder so the engineering is built as designed",
    ],
    goodFor: "Anyone planning structural changes, worried about cracks or movement, or needing an engineer's report.",
  },
];

export const JOURNEY = [
  { title: "Register your project", text: "Press Request a Job, choose the service, tell us about the work and add photos or plans. You receive a private project reference." },
  { title: "Our team follows up", text: "The team reviews your request, contacts you, visits the site when needed and prepares a written estimate." },
  { title: "Sign in whenever you like", text: "Use Customer Sign In with your reference, or the email or phone number and the suburb you gave us. There is no account to create and no password to remember." },
  { title: "Track it and see your news", text: "Approved updates, scheduled work, documents and messages appear in your portal as your project moves forward. Internal notes stay private." },
];

export const REASONS = [
  { icon: "01", title: "One place for your whole project", text: "Your request, photos, plans, estimate and updates sit together instead of being spread across emails, texts and phone calls." },
  { icon: "02", title: "You always know what is happening", text: "Sign in and see the current stage, what is scheduled next and what has been approved. No chasing, no guessing." },
  { icon: "03", title: "Builder and engineer under one roof", text: "Alert Construction builds and Alert Engineers does the engineering. You deal with one connected team, not two companies that have to be coordinated." },
  { icon: "04", title: "Written before it is built", text: "A request is an enquiry, not a contract. Scope, estimate and any change are put in writing and agreed before the work goes ahead." },
  { icon: "05", title: "Your information stays yours", text: "Projects are opened only with your private reference, or with the details you gave us. There is no public project search, and our internal notes are never shown to customers." },
  { icon: "06", title: "Quality is checked, not assumed", text: "Completed work is inspected by the site supervisor, reviewed by the office and approved by the owner before the project is closed." },
  { icon: "07", title: "Simple on any device", text: "Works on a phone, tablet or computer, in light or dark, and can be installed on your home screen like an app." },
  { icon: "08", title: "A real person to talk to", text: "The portal does not replace people. Messages go to the team that is working on your project, and Support answers you by email." },
];

export const FAQ = [
  { q: "Do I need to create an account?", a: "No. After you send a request you receive a private project reference. Customer Sign In works with that reference, or with the email or phone number and the suburb you gave us." },
  { q: "I lost my reference. What now?", a: "Open Customer Sign In, choose Email or Phone, and enter the same email or phone number you used for the request, plus the suburb or address you gave us. If that does not work, email Support." },
  { q: "Does sending a request commit me to anything?", a: "No. A request is an enquiry only. A written estimate and, where required, a contract must be agreed before any work begins." },
  { q: "What can I see in my portal?", a: "Updates the team has approved for customers: the stage of your project, scheduled work, documents and messages. Internal notes and private company information are never shown." },
  { q: "Who can see my information?", a: "Only the people working on your project, according to their role. We do not sell customer information." },
];
