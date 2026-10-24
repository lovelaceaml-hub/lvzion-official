/**
 * Script-side copies of the few base tokens that code needs outside CSS
 * (web manifest, theme-color meta). Source of truth: styles/lvz-tokens.css;
 * tests/design-tokens.test.ts keeps the two in step.
 */
export const designTokens={
 ground:'#ecefff',
 surface:'#f8f9ff',
 ink:'#25234f',
 accent:'#6146c9',
 darkGround:'#111027',
} as const;

/** Swipe thresholds shared by every tabbed screen (see lib/use-swipe-tabs.ts). */
export const swipeTabs={minDistance:60,dominance:1.5,maxDurationMs:600} as const;
