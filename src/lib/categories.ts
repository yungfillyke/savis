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
      { id: "plumbing", label: "Plumbing & Water", tags: ["plumbing", "plumber", "water", "pipe", "leak", "drain unblocking", "drainage", "septic tank exhaustion", "borehole", "water tank installation", "water tank cleaning", "pump repair", "water delivery", "jerrican", "water tanker"], icon: "plumbing" },
      { id: "electrical", label: "Electrical & Solar", tags: ["electrician", "electrical", "wiring", "power fault", "socket", "lighting", "solar", "solar panel installation", "inverter", "backup power", "appliance", "fridge repair", "washing machine repair", "microwave repair", "tv repair"], icon: "electrical" },
      { id: "building", label: "Building, Masonry & Roofing", tags: ["mason", "masonry", "building", "construction", "tiling", "tile laying", "roofing", "roof leak", "gutter cleaning", "plastering", "concrete", "ceiling", "renovation", "quantity surveyor", "architectural drafter"], icon: "masonry" },
      { id: "carpentry", label: "Carpentry & Furniture", tags: ["carpenter", "carpentry", "woodwork", "furniture repair", "cabinetry", "door repair", "window repair", "furniture assembly", "furniture dismantling", "custom furniture"], icon: "carpentry" },
      { id: "metalwork", label: "Welding, Gates & Locksmiths", tags: ["welding", "welder", "metal fabrication", "metalwork", "gate automation", "gate repair", "locksmith", "car key cutting", "door lock", "door repair", "security grille"], icon: "welding" },
      { id: "painting-decor", label: "Painting & Interior Decor", tags: ["painter", "painting", "interior decoration", "decor", "wallpaper", "curtains", "blinds", "curtain installation", "stitching", "ceiling design"], icon: "painting" },
      { id: "security", label: "Security & Smart Home", tags: ["cctv", "security system", "alarm installation", "smart home", "access control", "electric fence", "solar security lights", "wifi camera"], icon: "tech" },
      { id: "glass", label: "Glass & Windows", tags: ["glass repair", "glass replacement", "glazier", "window repair", "window installation", "shower screen", "mirror fitting"], icon: "home" },
    ],
  },
  {
    id: "cleaning", label: "Cleaning & Property Care", shortLabel: "Cleaning", icon: "cleaning",
    subs: [
      { id: "cleaning", label: "Home & Office Cleaning", tags: ["cleaner", "cleaning", "housekeeping", "deep cleaning", "office cleaning", "post construction cleaning", "move in cleaning", "move out cleaning"], icon: "cleaning" },
      { id: "laundry", label: "Laundry & Fabric Care", tags: ["laundry", "dry cleaning", "ironing", "laundry pickup", "laundry delivery", "carpet cleaning", "sofa cleaning", "upholstery shampooing"], icon: "cleaning" },
      { id: "pest-control", label: "Fumigation & Waste", tags: ["fumigation", "pest control", "exterminator", "termite treatment", "garbage collection", "waste removal", "septic tank exhaustion", "tank cleaning"], icon: "cleaning" },
      { id: "gardening", label: "Gardening & Landscaping", tags: ["gardener", "lawn mowing", "tree trimming", "tree cutting", "landscaping", "garden design", "compound clearing", "fence clearing", "pool cleaning", "pool maintenance"], icon: "home" },
    ],
  },
  {
    id: "auto", label: "Auto & Transport", shortLabel: "Auto", icon: "car",
    subs: [
      { id: "mechanic", label: "Mechanics & Vehicle Repair", tags: ["mechanic", "auto mechanic", "mobile mechanic", "car repair", "engine", "vehicle inspection", "pre purchase check", "oil change", "brake repair", "windshield repair", "windshield replacement"], icon: "mechanic" },
      { id: "emergency-auto", label: "Roadside & Emergency Help", tags: ["fuel delivery", "emergency fueling", "petrol delivery", "diesel delivery", "stranded", "jumpstart", "car battery", "battery replacement", "puncture repair", "mobile vulcanizer", "towing", "breakdown recovery"], icon: "car" },
      { id: "car-care", label: "Car Wash & Detailing", tags: ["car wash", "mobile car wash", "auto detailing", "interior detailing", "vehicle cleaning", "polishing"], icon: "cleaning" },
      { id: "transport", label: "Drivers, Couriers & Moving", tags: ["driver for hire", "chauffeur", "designated driver", "bodaboda", "motorcycle courier", "parcel courier", "runner", "towing", "house movers", "office movers", "haulage", "pickup", "lorry"], icon: "haulage" },
    ],
  },
  {
    id: "errands", label: "Errands & Delivery", shortLabel: "Errands", icon: "box",
    subs: [
      { id: "delivery", label: "Shopping & Deliveries", tags: ["personal shopper", "grocery delivery", "document pickup", "document delivery", "parcel delivery", "courier", "same day delivery", "errand runner"], icon: "haulage" },
      { id: "home-delivery", label: "Gas & Essential Supplies", tags: ["gas cylinder delivery", "lpg refill", "cooking gas", "water delivery", "jerrican delivery", "water tanker", "home supplies"], icon: "supplies" },
      { id: "moving", label: "Moving & Furniture Assembly", tags: ["house moving", "office relocation", "movers", "packing", "unpacking", "furniture assembly", "furniture dismantling", "queue standing", "line holding"], icon: "haulage" },
      { id: "pet-care", label: "Pet Care", tags: ["pet sitting", "dog walking", "pet grooming", "veterinarian", "vet home visit", "animal care"], icon: "home" },
    ],
  },
  {
    id: "personal-care", label: "Personal Care", shortLabel: "Personal", icon: "briefcase",
    subs: [
      { id: "hair", label: "Barbers, Hair & Braiding", tags: ["barber", "mobile barber", "hairdresser", "hair styling", "braider", "braiding", "locs", "wig installation"], icon: "supplies" },
      { id: "beauty", label: "Makeup, Nails & Styling", tags: ["makeup artist", "mua", "nail technician", "manicure", "pedicure", "stylist", "wardrobe consultant", "tattoo", "piercing"], icon: "supplies" },
      { id: "wellness", label: "Fitness & Wellness", tags: ["massage therapist", "massage", "personal trainer", "fitness coach", "yoga instructor", "wellness"], icon: "briefcase" },
    ],
  },
  {
    id: "events", label: "Events & Creative", shortLabel: "Events", icon: "briefcase",
    subs: [
      { id: "events", label: "Event Planning & Decor", tags: ["event planner", "event setup", "event decoration", "party planner", "tent hire", "chair hire", "table hire", "event rentals"], icon: "supplies" },
      { id: "food", label: "Catering, Chefs & Cakes", tags: ["catering", "caterer", "private chef", "cook for hire", "baker", "cake baker", "pastry chef", "meal prep"], icon: "supplies" },
      { id: "entertainment", label: "Music & Entertainment", tags: ["dj", "sound system rental", "mc", "event host", "bouncer", "event security", "face painting", "kids entertainment"], icon: "briefcase" },
      { id: "photo-video", label: "Photography & Video", tags: ["photographer", "photography", "videographer", "videography", "event photography", "product photography", "video editing"], icon: "tech" },
    ],
  },
  {
    id: "technology", label: "Technology & Digital", shortLabel: "Technology", icon: "tech",
    subs: [
      { id: "computer", label: "Computer & Phone Repair", tags: ["computer repair", "laptop repair", "phone repair", "tablet repair", "screen replacement", "battery replacement", "data recovery", "os installation"], icon: "tech" },
      { id: "networking", label: "Wi-Fi, TV & Networking", tags: ["wifi setup", "router setup", "home networking", "smart tv installation", "sound system installation", "printer repair", "copier maintenance", "software troubleshooting"], icon: "tech" },
      { id: "design", label: "Design, Web & Digital Work", tags: ["graphic design", "flyer design", "printing", "web design", "website development", "app development", "digital marketing", "social media management"], icon: "tech" },
    ],
  },
  {
    id: "education", label: "Education & Lessons", shortLabel: "Education", icon: "briefcase",
    subs: [
      { id: "tutoring", label: "Tutors & Academic Support", tags: ["home tutor", "tutoring", "remedial classes", "primary tutor", "high school tutor", "exam preparation"], icon: "briefcase" },
      { id: "lessons", label: "Skills & Driving Lessons", tags: ["music lessons", "piano teacher", "guitar lessons", "vocal coach", "driving instructor", "language tutor", "swimming coach", "cooking classes", "baking classes"], icon: "briefcase" },
    ],
  },
  {
    id: "care", label: "Care & Health", shortLabel: "Care", icon: "briefcase",
    subs: [
      { id: "home-care", label: "Nannies & Home Care", tags: ["babysitter", "babysitting", "nanny", "caregiver", "elderly care", "home care assistant"], icon: "briefcase" },
      { id: "health", label: "Qualified Health Professionals", tags: ["nurse", "in home nurse", "physiotherapy", "physiotherapist", "mobile lab", "blood sample collection", "home health visit"], icon: "briefcase" },
    ],
  },
  {
    id: "fashion", label: "Fashion & Crafts", shortLabel: "Fashion", icon: "supplies",
    subs: [
      { id: "tailoring", label: "Tailoring & Alterations", tags: ["tailor", "tailoring", "dressmaker", "custom tailoring", "clothes alteration", "clothes repair", "uniforms"], icon: "supplies" },
      { id: "shoe-leather", label: "Shoes, Bags & Leatherwork", tags: ["cobbler", "shoe repair", "shoe maker", "bag repair", "leatherwork", "leather repair"], icon: "supplies" },
    ],
  },
  {
    id: "professional", label: "Professional Services", shortLabel: "Professional", icon: "briefcase",
    subs: [
      { id: "legal", label: "Legal Services", tags: ["lawyer", "law firm", "legal services", "advocate", "notary public", "commissioner for oaths", "conveyancing", "contract review"], icon: "legal" },
      { id: "finance", label: "Finance, Tax & Admin", tags: ["accountant", "accounting", "bookkeeping", "audit", "tax", "kra assistance", "business registration", "document printing", "photocopying", "scanning"], icon: "finance" },
      { id: "government-docs", label: "Applications & Documentation", tags: ["passport application help", "id application help", "visa application help", "document assistance", "translation", "interpretation"], icon: "legal" },
      { id: "realestate", label: "Property & Built-Environment Pros", tags: ["architect", "architectural drafter", "quantity surveyor", "land surveyor", "property valuer", "real estate agent", "property manager", "interior designer"], icon: "realestate" },
      { id: "insurance", label: "Insurance & Risk", tags: ["insurance", "insurance broker", "risk assessment", "business cover"], icon: "insurance" },
    ],
  },
  {
    id: "goods", label: "Goods & Suppliers", shortLabel: "Goods", icon: "box",
    subs: [
      { id: "materials", label: "Construction Materials", tags: ["hardware", "cement", "timber", "roofing materials", "sand", "ballast", "tiles", "construction materials supplier"], icon: "materials" },
      { id: "supplies", label: "Home & Business Supplies", tags: ["wholesale", "retail", "electronics", "office supplies", "catering supplies", "furniture supplier", "appliance supplier"], icon: "supplies" },
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
    return terms.some((value) => value.includes(q) || q.includes(value)) ||
      words.some((word) => terms.some((value) => value.split(/[^a-z0-9]+/).some((term) => term === word || (word.length >= 5 && term.length >= 5 && (term.includes(word) || word.includes(term)))));
  });
}
