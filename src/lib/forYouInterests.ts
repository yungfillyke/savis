import { CATEGORY_PILLARS } from "@/lib/categories";

const STORAGE_KEY = "savis_for_you_interests_v1";
const SEEN_KEY = "savis_for_you_onboarded_v1";

export type InterestId = string;

/** Same pillars as homepage categories */
export const INTEREST_OPTIONS = CATEGORY_PILLARS.map((p) => ({
  id: p.id,
  label: p.label,
  shortLabel: p.shortLabel,
  icon: p.icon,
  tags: p.subs.flatMap((s) => s.tags),
}));

export function hasCompletedForYouOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SEEN_KEY) === "1";
}

export function markForYouOnboardingDone() {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_KEY, "1");
}

export function getForYouInterests(): InterestId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setForYouInterests(ids: InterestId[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  localStorage.setItem(SEEN_KEY, "1");
}

/** Tags for filtering providers from selected interest pillar ids */
export function tagsForInterests(ids: InterestId[]): string[] {
  const set = new Set<string>();
  for (const opt of INTEREST_OPTIONS) {
    if (ids.includes(opt.id)) {
      opt.tags.forEach((t) => set.add(t.toLowerCase()));
    }
  }
  return [...set];
}
