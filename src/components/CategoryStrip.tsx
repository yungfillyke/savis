"use client";

import { useMemo, useState } from "react";
import CategoryIcon from "@/components/CategoryIcon";
import {
  CATEGORY_PILLARS,
  allSubCategories,
  searchCategories,
  type CategoryPillar,
  type SubCategory,
} from "@/lib/categories";
const CATEGORY_PHOTOS: Record<string, string> = {
  "plumbing": "photo-1607472586893-edb57bdc0e39",
  "electrical": "photo-1621905251918-48416bd8575a",
  "building": "photo-1504307651254-35680f356dfd",
  "carpentry": "photo-1505798577917-a65157d3320a",
  "metalwork": "photo-1504917595217-d4dc5ebe6122",
  "painting-decor": "photo-1562259949-e8e7689d7828",
  "security": "photo-1558002038-1055907df827",
  "glass": "photo-1558618666-fcd25c85cd64",
  "cleaning": "photo-1581578731548-c64695cc6952",
  "laundry": "photo-1517677208171-0bc6725a3e60",
  "pest-control": "photo-1632923057155-6d6a1f2d3d12",
  "gardening": "photo-1416879595882-3373a0480b5b",
  "mechanic": "photo-1486262715619-67b85e0b08d3",
  "emergency-auto": "photo-1486262715619-67b85e0b08d3",
  "car-care": "photo-1607860108855-64acea3a2e8c",
  "transport": "photo-1449965408869-eaa3f722e40d",
  "delivery": "photo-1607082349566-187342175e2f",
  "home-delivery": "photo-1604908176997-125f25cc6f3d",
  "moving": "photo-1600518464441-9154a4dee21b",
  "pet-care": "photo-1548199973-03cce0bbc87b",
  "hair": "photo-1560066984-138dadb4c035",
  "beauty": "photo-1487412720507-e7ab37603c6f",
  "wellness": "photo-1517836357463-d25dfeac3438",
  "events": "photo-1511795409834-ef04bbd61622",
  "food": "photo-1556911220-e15b29be8c8f",
  "entertainment": "photo-1501386761578-eac5c94b800a",
  "photo-video": "photo-1516035069371-29a1b244cc32",
  "computer": "photo-1587829741301-dc798b83add3",
  "networking": "photo-1558494949-ef010cbdcc31",
  "design": "photo-1460925895917-afdab827c52f",
  "tutoring": "photo-1503676260728-1c00da094a0b",
  "lessons": "photo-1434030216411-0b793f4b4173",
  "home-care": "photo-1581578731548-c64695cc6952",
  "health": "photo-1576091160399-112ba8d25d1d",
  "tailoring": "photo-1590736969955-71cc94901144",
  "shoe-leather": "photo-1542291026-7eec264c27ff",
  "legal": "photo-1589829545856-d10d557cf95f",
  "finance": "photo-1554224155-6726b3ff858f",
  "government-docs": "photo-1450101499163-c8848c66ca85",
  "realestate": "photo-1560518883-ce09059eeffa",
  "insurance": "photo-1450101499163-c8848c66ca85",
  "materials": "photo-1504307651254-35680f356dfd",
  "supplies": "photo-1602143407151-7111542de6e8"
};

function categoryPhoto(id: string) {
  const photo = CATEGORY_PHOTOS[id] || "photo-1600585154340-be6161a56a0c";
  return "https://images.unsplash.com/" + photo + "?auto=format&fit=crop&w=240&h=240&q=80";
}


type Props = {
  /** Called when user picks a sub-category (filters providers) */
  onSelectSub?: (sub: SubCategory) => void;
  /** Optional controlled active sub id */
  activeSubId?: string;
};

export default function CategoryStrip({ onSelectSub, activeSubId }: Props) {
  const [pillarId, setPillarId] = useState(CATEGORY_PILLARS[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState("");

  const pillar: CategoryPillar =
    CATEGORY_PILLARS.find((p) => p.id === pillarId) || CATEGORY_PILLARS[0];

  const drawerItems = useMemo(() => {
    const q = drawerQuery.trim().toLowerCase();
    return q ? searchCategories(q) : allSubCategories();
  }, [drawerQuery]);

  return (
    <div className="savis-cat-wrap">
      {/* Tier 1 pillars */}
      <div className="savis-cat-pillars" role="tablist" aria-label="Category groups">
        {CATEGORY_PILLARS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pillarId === p.id}
            className={pillarId === p.id ? "is-active" : ""}
            onClick={() => setPillarId(p.id)}
          >
            <CategoryIcon id={p.icon} />
            <span>{p.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Tier 2 icon strip for active pillar */}
      <div className="savis-category-strip" role="list" aria-label={`${pillar.label} categories`}>
        {pillar.subs.map((sub) => (
          <button
            key={sub.id}
            type="button"
            role="listitem"
            className={activeSubId === sub.id ? "is-active" : ""}
            onClick={() => onSelectSub?.(sub)}
          >
            <span className="savis-cat-circle savis-cat-photo">
              <img src={categoryPhoto(sub.id)} alt="" loading="lazy" />
            </span>
            <b>{sub.label}</b>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="savis-load-more"
        onClick={() => setDrawerOpen(true)}
      >
        LOAD MORE <span>→</span>
      </button>

      {/* All categories drawer */}
      {drawerOpen && (
        <div className="savis-cat-drawer" role="dialog" aria-label="All categories">
          <div className="savis-cat-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <div className="savis-cat-drawer-panel">
            <div className="savis-cat-drawer-head">
              <div>
                <span>ALL CATEGORIES</span>
                <h2>Browse by service</h2>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <input
              className="savis-cat-drawer-search"
              value={drawerQuery}
              onChange={(e) => setDrawerQuery(e.target.value)}
              placeholder="Search plumbing, legal, moving…"
              aria-label="Filter categories"
            />
            <div className="savis-cat-drawer-body">
              {CATEGORY_PILLARS.map((p) => {
                const items = drawerItems.filter((s) => s.pillarId === p.id);
                if (!items.length) return null;
                return (
                  <section key={p.id}>
                    <h3>
                      <CategoryIcon id={p.icon} /> {p.label}
                    </h3>
                    <div className="savis-cat-drawer-grid">
                      {items.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setPillarId(p.id);
                            onSelectSub?.(sub);
                            setDrawerOpen(false);
                          }}
                        >
                          <span className="savis-cat-circle savis-cat-photo">
                            <img src={categoryPhoto(sub.id)} alt="" loading="lazy" />
                          </span>
                          <b>{sub.label}</b>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
              {drawerItems.length === 0 && (
                <p className="savis-cat-drawer-empty">No categories match that search.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
