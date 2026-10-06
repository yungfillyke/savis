/** SAVIS category system — Tier 1 pillars + Tier 2 sub-categories */

export type SubCategory = {
  id: string;
  label: string;
  /** Maps to provider service_category / search tags */
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
  | "home"
  | "briefcase"
  | "car"
  | "box"
  | "plumbing"
  | "electrical"
  | "masonry"
  | "carpentry"
  | "welding"
  | "cleaning"
  | "painting"
  | "legal"
  | "finance"
  | "insurance"
  | "tech"
  | "realestate"
  | "mechanic"
  | "haulage"
  | "materials"
  | "supplies";

export const CATEGORY_PILLARS: CategoryPillar[] = [
  {
    id: "home-repairs",
    label: "Home & Repairs",
    shortLabel: "Home & Repairs",
    icon: "home",
    subs: [
      { id: "plumbing", label: "Plumbing & Water", tags: ["Plumbing", "Water", "Pipe", "Borehole", "Drainage"], icon: "plumbing" },
      { id: "electrical", label: "Electrical & Solar", tags: ["Electrical", "Solar", "Wiring", "Inverter", "Appliance"], icon: "electrical" },
      { id: "masonry", label: "Building & Masonry", tags: ["Masonry", "Tiling", "Roofing", "Plastering", "Concrete"], icon: "masonry" },
      { id: "carpentry", label: "Carpentry & Woodwork", tags: ["Carpentry", "Furniture", "Cabinetry", "Door", "Window"], icon: "carpentry" },
      { id: "welding", label: "Metalwork & Welding", tags: ["Welding", "Metal", "Gates", "Locksmith"], icon: "welding" },
      { id: "cleaning", label: "Cleaning & Housekeeping", tags: ["Cleaning", "Housekeeping", "Carpet", "Fumigation", "Laundry"], icon: "cleaning" },
      { id: "painting", label: "Painting & Decor", tags: ["Painting", "Decor", "Wallpaper", "Ceiling"], icon: "painting" },
    ],
  },
  {
    id: "professional",
    label: "Professional Services",
    shortLabel: "Professional",
    icon: "briefcase",
    subs: [
      { id: "legal", label: "Legal Services", tags: ["Legal", "Law", "Conveyancing", "Contracts"], icon: "legal" },
      { id: "finance", label: "Finance & Tax", tags: ["Finance", "Tax", "Accounting", "Bookkeeping", "Audit"], icon: "finance" },
      { id: "insurance", label: "Insurance & Risk", tags: ["Insurance", "Cover", "Risk"], icon: "insurance" },
      { id: "tech", label: "Tech & Digital", tags: ["Tech", "Web", "App", "Design", "CCTV", "IT"], icon: "tech" },
      { id: "realestate", label: "Real Estate & Surveying", tags: ["Real Estate", "Surveying", "Valuation", "Architecture"], icon: "realestate" },
    ],
  },
  {
    id: "auto",
    label: "Auto & Transport",
    shortLabel: "Auto",
    icon: "car",
    subs: [
      { id: "mechanic", label: "Mechanics & Maintenance", tags: ["Mechanics", "Auto", "Engine", "Panel", "Servicing"], icon: "mechanic" },
      { id: "haulage", label: "Haulage & Moving", tags: ["Moving", "Haulage", "Towing", "Pickup", "Lorry"], icon: "haulage" },
    ],
  },
  {
    id: "goods",
    label: "Goods & Suppliers",
    shortLabel: "Goods",
    icon: "box",
    subs: [
      { id: "materials", label: "Construction Materials", tags: ["Hardware", "Cement", "Timber", "Roofing", "Materials"], icon: "materials" },
      { id: "supplies", label: "Home & Business Supplies", tags: ["Supplies", "Wholesale", "Electronics", "Catering", "Office"], icon: "supplies" },
    ],
  },
];

/** Flat list for search / drawer */
export function allSubCategories(): (SubCategory & { pillarId: string; pillarLabel: string })[] {
  return CATEGORY_PILLARS.flatMap((p) =>
    p.subs.map((s) => ({ ...s, pillarId: p.id, pillarLabel: p.label }))
  );
}
