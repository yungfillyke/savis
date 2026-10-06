/**
 * App feature flags — toggle without a full redesign.
 * Later these can be driven by admin/remote config.
 */
export const FEATURE_FLAGS = {
  /** "COMING SOON: Short videos from local businesses" on For You */
  shortVideosBanner: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
