/** SAVIS category system — broad categories plus searchable local service aliases.
 * Keep the visible category list manageable; aliases help niche searches find the right service.
 */
export type SubCategory = {
  id: string;
  label: string;
  /** Search aliases and provider service-category terms. */
  tags: string[];
  icon: CategoryIconId;
};
export type CategoryPillar = {
  id: string;
  label: string;
  shortLabel: string;
  icon: CategoryIconId;
  subs: SubCategory[];
};
export type CategoryIconId =
  | "home" | "briefcase" | "car" | "box" | "plumbing" | "electrical"
  | "masonry" | "carpentry" | "welding" | "cleaning" | "painting"
  | "legal" | "finance" | "insurance" | "tech" | "realestate"
  | "mechanic" | "haulage" | "materials" | "supplies";

export const CATEGORY_PILLARS: CategoryPillar[] = [
  {
    id: "home-repairs", label: "Home & Repairs", shortLabel: "Home & Repairs", icon: "home",
    subs: [
      { id: "plumbing", label: "Plumbing & Water", tags: ["plumbing", "plumber", "water", "pipe", "leak", "drain unblocking", "drainage", "septic tank exhaustion", "borehole", "water tank installation", "water tank cleaning", "pump repair", "water delivery", "jerrican", "water tanker", "fundi bomba", "bomba linatoa maji", "sinki lililoharibika", "choo kinachovuja", "kurekebisha mabomba", "fundi wa maji", "mifereji imeziba", "choo kimeziba", "exhauster", "kufyonza choo", "tangi la maji", "kusafisha tanki la maji", "pampu ya maji", "kuleta maji", "maji ya kunywa"], icon: "plumbing" },
      { id: "electrical", label: "Electrical & Solar", tags: ["electrician", "electrical", "wiring", "power fault", "socket", "lighting", "solar", "solar panel installation", "inverter", "backup power", "appliance", "fridge repair", "washing machine repair", "microwave repair", "tv repair", "fundi wa umeme", "hitilafu ya umeme", "taa haiwaki", "kufunga waya za umeme", "switch ya umeme", "socket mbovu", "sola", "paneli za sola", "umeme wa jua", "kutengeneza friji", "mashine ya kufua nguo", "tv imeharibika"], icon: "electrical" },
      { id: "building", label: "Building, Masonry & Roofing", tags: ["mason", "masonry", "building", "construction", "tiling", "tile laying", "roofing", "roof leak", "gutter cleaning", "plastering", "concrete", "ceiling", "renovation", "quantity surveyor", "architectural drafter", "mwashi", "kufunga vigae", "kujenga ukuta", "kuweka sakafu ya tiles", "matofali", "paa linavuja", "bati limevuja", "maji ya mvua yanavuja", "fundi wa mapaa", "kazi za ujenzi"], icon: "masonry" },
      { id: "carpentry", label: "Carpentry & Furniture", tags: ["carpenter", "carpentry", "woodwork", "furniture repair", "cabinetry", "door repair", "window repair", "furniture assembly", "furniture dismantling", "custom furniture", "seremala", "kutengeneza samani", "kabati limeharibika", "kitanda kilichovunjika", "kazi za mbao", "fundi wa mbao", "kufunga samani", "kuunganisha meza"], icon: "carpentry" },
      { id: "metalwork", label: "Welding, Gates & Locksmiths", tags: ["welding", "welder", "metal fabrication", "metalwork", "gate automation", "gate repair", "locksmith", "car key cutting", "door lock", "door repair", "security grille", "fundi wa chuma", "lango la chuma limeharibika", "grili za madirisha", "kuchomeka geti", "kufuli limeharibika", "fundi wa kufuli", "kufungua mlango"], icon: "welding" },
      { id: "painting-decor", label: "Painting & Interior Decor", tags: ["painter", "painting", "interior decoration", "decor", "wallpaper", "curtains", "blinds", "curtain installation", "stitching", "ceiling design", "mpiga rangi wa nyumba", "kupaka rangi", "kupamba nyumba", "rangi ya kuta", "urembo wa ndani", "fundi wa rangi", "kushona mapazia", "kufunga mapazia"], icon: "painting" },
      { id: "security", label: "Security & Smart Home", tags: ["cctv", "security system", "alarm installation", "smart home", "access control", "electric fence", "solar security lights", "wifi camera", "kamera za usalama", "uzio wa umeme", "kufunga cctv", "ulinzi wa nyumba", "sensor za mwendo", "geti la stima", "motor ya geti", "geti halifunguki"], icon: "tech" },
      { id: "glass", label: "Glass & Windows", tags: ["glass repair", "glass replacement", "glazier", "window repair", "window installation", "shower screen", "mirror fitting", "kioo cha dirisha", "kioo kilichovunjika", "kurekebisha dirisha", "glazia", "dirisha la aluminium", "fundi wa vioo"], icon: "home" },
    ],
  },
  {
    id: "cleaning", label: "Cleaning & Property Care", shortLabel: "Cleaning", icon: "cleaning",
    subs: [
      { id: "cleaning", label: "Home & Office Cleaning", tags: ["cleaner", "cleaning", "housekeeping", "deep cleaning", "office cleaning", "post construction cleaning", "move in cleaning", "move out cleaning", "usafi wa nyumba", "dada wa kazi", "kufagia na kupanguza", "kusafisha nyumba", "usafi wa kila siku", "kazi za nyumbani", "usafi mkubwa wa nyumba", "usafi baada ya ujenzi", "kusafisha vumbi la ujenzi", "usafi wa ofisi", "kutoa taka"], icon: "cleaning" },
      { id: "laundry", label: "Laundry & Fabric Care", tags: ["laundry", "dry cleaning", "ironing", "laundry pickup", "laundry delivery", "carpet cleaning", "sofa cleaning", "upholstery shampooing", "kufua nguo", "kupiga pasi", "kuchukua nguo chafu na kuletea", "kufua suti", "huduma ya kufulia", "kukunja nguo", "kufua nguo za nyumbani"], icon: "cleaning" },
      { id: "pest-control", label: "Fumigation & Waste", tags: ["fumigation", "pest control", "exterminator", "termite treatment", "garbage collection", "waste removal", "septic tank exhaustion", "tank cleaning", "kupuliza dawa ya wadudu", "kudhibiti wadudu", "kunguni", "mende", "mchwa", "mbu", "panya", "dawa ya mende", "kuchukua takataka"], icon: "cleaning" },
      { id: "gardening", label: "Gardening & Landscaping", tags: ["gardener", "lawn mowing", "tree trimming", "tree cutting", "landscaping", "garden design", "compound clearing", "fence clearing", "pool cleaning", "pool maintenance", "kukata nyasi", "bustani", "kupalilia bustani", "kutunza maua", "kukata miti", "kupunguza matawi ya miti", "usanifu wa bustani", "kusafisha swimming pool", "kusafisha kiwanja"], icon: "home" },
    ],
  },
  {
    id: "auto", label: "Auto & Transport", shortLabel: "Auto", icon: "car",
    subs: [
      { id: "mechanic", label: "Mechanics & Vehicle Repair", tags: ["mechanic", "auto mechanic", "mobile mechanic", "car repair", "engine", "vehicle inspection", "pre purchase check", "oil change", "brake repair", "windshield repair", "windshield replacement", "fundi gari", "kutengeneza gari", "fundi wa enjini", "gari imekataa kuwaka", "matengenezo ya gari", "shida ya gari", "kurekebisha breki", "fundi wa dharura", "ukaguzi wa gari", "kubadilisha mafuta ya enjini"], icon: "mechanic" },
      { id: "emergency-auto", label: "Roadside & Emergency Help", tags: ["fuel delivery", "emergency fueling", "petrol delivery", "diesel delivery", "stranded", "jumpstart", "car battery", "battery replacement", "puncture repair", "mobile vulcanizer", "towing", "breakdown recovery", "mafuta ya gari", "letewa mafuta", "imeisha mafuta", "petroli", "diseli", "gari imekwama", "huduma ya dharura gari", "betri imekufa", "kuwasha gari kwa kamba", "taia ya gari", "kutoboka gurudumu", "lori la kuvuta gari", "msaada wa barabarani"], icon: "car" },
      { id: "car-care", label: "Car Wash & Detailing", tags: ["car wash", "mobile car wash", "auto detailing", "interior detailing", "vehicle cleaning", "polishing", "kuosha gari", "safisha gari", "kung'arisha gari", "kuosha enjini", "kusafisha viti vya gari", "usafi wa gari"], icon: "cleaning" },
      { id: "transport", label: "Drivers, Couriers & Moving", tags: ["driver for hire", "chauffeur", "designated driver", "bodaboda", "motorcycle courier", "parcel courier", "runner", "towing", "house movers", "office movers", "haulage", "pickup", "lorry", "dereva wa kukodi", "dereva wa muda", "tafuta dereva", "dereva binafsi", "pikipiki ya mizigo", "mjumbe wa pikipiki", "kutuma kitu kwa pikipiki", "mjumbe wa vifurushi"], icon: "haulage" },
    ],
  },
  {
    id: "errands", label: "Errands & Delivery", shortLabel: "Errands", icon: "box",
    subs: [
      { id: "delivery", label: "Shopping & Deliveries", tags: ["personal shopper", "grocery delivery", "document pickup", "document delivery", "parcel delivery", "courier", "same day delivery", "errand runner", "kununulia vitu sokoni", "mnunuzi binafsi", "kuleta vyakula vya sokoni", "kununua supermarket", "kusimama kwenye foleni", "kupeleka nyaraka", "kuleta maji", "maji ya kunywa"], icon: "haulage" },
      { id: "home-delivery", label: "Gas & Essential Supplies", tags: ["gas cylinder delivery", "lpg refill", "cooking gas", "water delivery", "jerrican delivery", "water tanker", "home supplies", "ujazaji wa gesi", "kuleta gesi", "mitungi ya gesi", "gesi ya kupikia", "gesi imeisha", "kuleta silinda ya gesi", "lori la maji"], icon: "supplies" },
      { id: "moving", label: "Moving & Furniture Assembly", tags: ["house moving", "office relocation", "movers", "packing", "unpacking", "furniture assembly", "furniture dismantling", "queue standing", "line holding", "kuhama nyumba", "kuhamisha ofisi", "malori ya kuhama", "kubeba mizigo ya nyumba", "kusafirisha samani", "kufunga samani", "kufunga kabati"], icon: "haulage" },
      { id: "pet-care", label: "Pet Care", tags: ["pet sitting", "dog walking", "pet grooming", "veterinarian", "vet home visit", "animal care", "kuchunga mbwa", "kutembea na mbwa", "kutunza kipenzi", "kuchunga paka", "daktari wa wanyama wa nyumbani", "chanjo ya mbwa"], icon: "home" },
    ],
  },
  {
    id: "personal-care", label: "Personal Care", shortLabel: "Personal", icon: "briefcase",
    subs: [
      { id: "hair", label: "Barbers, Hair & Braiding", tags: ["barber", "mobile barber", "hairdresser", "hair styling", "braider", "braiding", "locs", "wig installation", "kinyozi wa nyumbani", "kunyoa nywele", "kukata ndevu", "kusuka nywele", "msusi wa nyumbani", "kutengeneza rasta", "kufunga wigi"], icon: "supplies" },
      { id: "beauty", label: "Makeup, Nails & Styling", tags: ["makeup artist", "mua", "nail technician", "manicure", "pedicure", "stylist", "wardrobe consultant", "tattoo", "piercing", "makeup ya harusi", "makeup ya sherehe", "kutengeneza kucha", "manicure ya nyumbani", "ushauri wa mavazi"], icon: "supplies" },
      { id: "wellness", label: "Fitness & Wellness", tags: ["massage therapist", "massage", "personal trainer", "fitness coach", "yoga instructor", "wellness", "masaji ya mwili", "fundi wa masaji", "masaji ya nyumbani", "mkufunzi wa mazoezi", "kocha wa gym", "mazoezi ya nyumbani"], icon: "briefcase" },
    ],
  },
  {
    id: "events", label: "Events & Creative", shortLabel: "Events", icon: "briefcase",
    subs: [
      { id: "events", label: "Event Planning & Decor", tags: ["event planner", "event setup", "event decoration", "party planner", "tent hire", "chair hire", "table hire", "event rentals", "kupamba sherehe", "mapambo ya harusi", "kupamba ukumbi", "kukodi mahema", "viti na meza za sherehe", "ulinzi wa sherehe", "burudani ya watoto"], icon: "supplies" },
      { id: "food", label: "Catering, Chefs & Cakes", tags: ["catering", "caterer", "private chef", "cook for hire", "baker", "cake baker", "pastry chef", "meal prep", "mpishi wa sherehe", "mpishi wa kukodi", "upishi wa harusi", "chakula cha sherehe", "huduma ya upishi", "keki ya harusi", "keki ya birthday", "kupika keki"], icon: "supplies" },
      { id: "entertainment", label: "Music & Entertainment", tags: ["dj", "sound system rental", "mc", "event host", "bouncer", "event security", "face painting", "kids entertainment", "DJ wa sherehe", "kukodi spika", "sound system", "muziki wa sherehe", "MC wa sherehe", "mwenyeji wa sherehe"], icon: "briefcase" },
      { id: "photo-video", label: "Photography & Video", tags: ["photographer", "photography", "videographer", "videography", "event photography", "product photography", "video editing", "mpiga picha", "video ya sherehe", "picha za harusi", "mpiga picha wa hafla", "drone ya picha", "picha za birthday"], icon: "tech" },
    ],
  },
  {
    id: "technology", label: "Technology & Digital", shortLabel: "Technology", icon: "tech",
    subs: [
      { id: "computer", label: "Computer & Phone Repair", tags: ["computer repair", "laptop repair", "phone repair", "tablet repair", "screen replacement", "battery replacement", "data recovery", "os installation", "kutengeneza kompyuta", "laptop imeharibika", "fundi wa kompyuta", "matengenezo ya pc", "kutengeneza simu", "kioo cha simu kimepasuka", "betri ya simu", "simu haichaji", "fundi wa simu", "simu imeingia maji"], icon: "tech" },
      { id: "networking", label: "Wi-Fi, TV & Networking", tags: ["wifi setup", "router setup", "home networking", "smart tv installation", "sound system installation", "printer repair", "copier maintenance", "software troubleshooting", "kufunga wifi", "router ya mtandao", "wifi inasumbua", "kufunga intaneti", "fundi wa intaneti", "kufunga tv ukutani", "kutundika tv"], icon: "tech" },
      { id: "design", label: "Design, Web & Digital Work", tags: ["graphic design", "flyer design", "printing", "web design", "website development", "app development", "digital marketing", "social media management", "mbunifu wa picha", "grafiki", "kutengeneza vipeperushi", "logo", "bango", "mkalimani", "kutafsiri lugha", "tafsiri ya nyaraka"], icon: "tech" },
    ],
  },
  {
    id: "education", label: "Education & Lessons", shortLabel: "Education", icon: "briefcase",
    subs: [
      { id: "tutoring", label: "Tutors & Academic Support", tags: ["home tutor", "tutoring", "remedial classes", "primary tutor", "high school tutor", "exam preparation", "mwalimu wa nyumbani", "masomo ya ziada", "mwalimu wa hesabu", "mwalimu wa sayansi", "kujiandaa na mitihani", "kufundisha nyumbani"], icon: "briefcase" },
      { id: "lessons", label: "Skills & Driving Lessons", tags: ["music lessons", "piano teacher", "guitar lessons", "vocal coach", "driving instructor", "language tutor", "swimming coach", "cooking classes", "baking classes", "masomo ya udereva", "kujifunza kuendesha", "mwalimu wa lugha", "kujifunza kiingereza", "masomo ya kiswahili", "kocha wa kuogelea", "masomo ya kupika"], icon: "briefcase" },
    ],
  },
  {
    id: "care", label: "Care & Health", shortLabel: "Care", icon: "briefcase",
    subs: [
      { id: "home-care", label: "Nannies & Home Care", tags: ["babysitter", "babysitting", "nanny", "caregiver", "elderly care", "home care assistant", "dada wa watoto", "kulea watoto", "mwangalizi wa watoto", "nanny wa nyumbani", "mwangalizi wa wazee", "huduma kwa wazee"], icon: "briefcase" },
      { id: "health", label: "Qualified Health Professionals", tags: ["nurse", "in home nurse", "physiotherapy", "physiotherapist", "mobile lab", "blood sample collection", "home health visit", "muuguzi wa nyumbani", "mwangalizi wa wagonjwa", "huduma ya uuguzi nyumbani", "huduma ya afya nyumbani", "fiziotherapia ya nyumbani", "kupima damu nyumbani", "daktari wa mifugo"], icon: "briefcase" },
    ],
  },
  {
    id: "fashion", label: "Fashion & Crafts", shortLabel: "Fashion", icon: "supplies",
    subs: [
      { id: "tailoring", label: "Tailoring & Alterations", tags: ["tailor", "tailoring", "dressmaker", "custom tailoring", "clothes alteration", "clothes repair", "uniforms", "mshonaji nguo", "kushona nguo", "kushona suti", "nguo za kitenge", "kushona magauni", "fundi cherehani", "kupunguza nguo", "kufupisha suruali"], icon: "supplies" },
      { id: "shoe-leather", label: "Shoes, Bags & Leatherwork", tags: ["cobbler", "shoe repair", "shoe maker", "bag repair", "leatherwork", "leather repair", "fundi wa viatu", "kutengeneza viatu", "soli ya viatu", "kutengeneza mifuko", "mkoba wa ngozi", "kurejesha begi"], icon: "supplies" },
    ],
  },
  {
    id: "professional", label: "Professional Services", shortLabel: "Professional", icon: "briefcase",
    subs: [
      { id: "legal", label: "Legal Services", tags: ["lawyer", "law firm", "legal services", "advocate", "notary public", "commissioner for oaths", "conveyancing", "contract review", "kamishna wa viapo", "kusaini kiapo", "affidavit", "mwanasheria wa viapo"], icon: "legal" },
      { id: "finance", label: "Finance, Tax & Admin", tags: ["accountant", "accounting", "bookkeeping", "audit", "tax", "kra assistance", "business registration", "document printing", "photocopying", "scanning", "KRA", "kujaza tax returns", "PIN ya KRA", "msaada wa kodi", "mhasibu wa kodi"], icon: "finance" },
      { id: "government-docs", label: "Applications & Documentation", tags: ["passport application help", "id application help", "visa application help", "document assistance", "translation", "interpretation", "pasipoti", "eCitizen", "kujaza fomu ya pasipoti", "usaidizi wa visa", "kadi ya kitambulisho", "kujaza fomu za serikali"], icon: "legal" },
      { id: "realestate", label: "Property & Built-Environment Pros", tags: ["architect", "architectural drafter", "quantity surveyor", "land surveyor", "property valuer", "real estate agent", "property manager", "interior designer"], icon: "realestate" },
      { id: "insurance", label: "Insurance & Risk", tags: ["insurance", "insurance broker", "risk assessment", "business cover"], icon: "insurance" },
    ],
  },
  {
    id: "goods", label: "Goods & Suppliers", shortLabel: "Goods", icon: "box",
    subs: [
      { id: "materials", label: "Construction Materials", tags: ["hardware", "cement", "timber", "roofing materials", "sand", "ballast", "tiles", "construction materials supplier", "vifaa vya ujenzi", "saruji", "mbao", "mchanga", "muuzaji wa vifaa vya ujenzi"], icon: "materials" },
      { id: "supplies", label: "Home & Business Supplies", tags: ["wholesale", "retail", "electronics", "office supplies", "catering supplies", "furniture supplier", "appliance supplier", "vifaa vya ofisi", "vifaa vya biashara", "muuzaji wa samani", "vifaa vya upishi"], icon: "supplies" },
    ],
  },
];

/** Flat list for search / drawer */
export function allSubCategories(): (SubCategory & { pillarId: string; pillarLabel: string })[] {
  return CATEGORY_PILLARS.flatMap((p) =>
    p.subs.map((s) => ({ ...s, pillarId: p.id, pillarLabel: p.label }))
  );
}

/** Search categories and their aliases, including phrases like "emergency fuel". */
export function searchCategories(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return allSubCategories();
  const words = q.split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
  return allSubCategories().filter((category) => {
    const terms = [category.label, category.pillarLabel, ...category.tags].map((value) => value.toLowerCase());
    if (terms.some((value) => value.includes(q) || q.includes(value))) return true;
    return words.some((word) =>
      terms.some((value) =>
        value.split(/[^a-z0-9]+/).some((term) =>
          term === word || (word.length >= 5 && term.length >= 5 && (term.includes(word) || word.includes(term)))
        )
      )
    );
  });
}
