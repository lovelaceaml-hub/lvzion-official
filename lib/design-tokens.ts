/**
 * Script-side copies of the few Day Sheet tokens that code needs outside CSS
 * (web manifest, theme-color meta). Source of truth: styles/lvz-tokens.css;
 * tests/design-tokens.test.ts keeps the two in step.
 */
export const designTokens={
 ground:'#f2f4f1',
 surface:'#ffffff',
 ink:'#132e28',
 accent:'#1f5c4d',
} as const;

/** Swipe thresholds shared by every tabbed screen (see lib/use-swipe-tabs.ts). */
export const swipeTabs={minDistance:60,dominance:1.5,maxDurationMs:600} as const;
