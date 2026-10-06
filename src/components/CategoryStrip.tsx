"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_PILLARS,
  allSubCategories,
  type CategoryPillar,
  type SubCategory,
} from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";

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
    const all = allSubCategories();
    if (!q) return all;
    return all.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.pillarLabel.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
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
            <span className="savis-cat-circle">
              <CategoryIcon id={sub.icon} />
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
                          <span className="savis-cat-circle">
                            <CategoryIcon id={sub.icon} />
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
