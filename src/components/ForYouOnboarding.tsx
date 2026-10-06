"use client";

import { useState } from "react";
import CategoryIcon from "@/components/CategoryIcon";
import {
  INTEREST_OPTIONS,
  setForYouInterests,
  type InterestId,
} from "@/lib/forYouInterests";

type Props = {
  open: boolean;
  onDone: (ids: InterestId[]) => void;
};

export default function ForYouOnboarding({ open, onDone }: Props) {
  const [selected, setSelected] = useState<InterestId[]>([]);

  if (!open) return null;

  function toggle(id: InterestId) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  function save() {
    const ids = selected.length ? selected : INTEREST_OPTIONS.map((o) => o.id);
    setForYouInterests(ids);
    onDone(ids);
  }

  return (
    <div className="savis-fy-modal" role="dialog" aria-label="Choose your interests">
      <div className="savis-fy-modal-backdrop" />
      <div className="savis-fy-modal-panel">
        <span className="savis-fy-modal-kicker">FOR YOU</span>
        <h2>What are you looking for?</h2>
        <p>Pick the categories you care about. We’ll personalise your feed. You can change this later.</p>
        <div className="savis-fy-modal-grid">
          {INTEREST_OPTIONS.map((opt) => {
            const active = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                className={active ? "is-active" : ""}
                onClick={() => toggle(opt.id)}
              >
                <CategoryIcon id={opt.icon} />
                <b>{opt.shortLabel}</b>
              </button>
            );
          })}
        </div>
        <button type="button" className="savis-fy-modal-save" onClick={save}>
          {selected.length ? `Continue (${selected.length})` : "Show me everything"}
        </button>
      </div>
    </div>
  );
}
