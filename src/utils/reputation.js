/**
 * Reputation Utility for Dashy
 * Handles 10-tier trust badge logic and RPT calculations.
 */

export const TIERS = [
  { level: 0, minRpt: 0, label: 'Sprout', color: '#a7f3d0', description: 'A fresh seedling in the ecosystem.' },
  { level: 1, minRpt: 2, label: 'Seedling', color: '#86efac', description: 'Beginning to root in the protocol.' },
  { level: 2, minRpt: 4, label: 'Sapling', color: '#4ade80', description: 'Growing branches and building trust.' },
  { level: 3, minRpt: 8, label: 'Pine', color: '#10b981', description: 'Standing tall with a proven track record.' },
  { level: 4, minRpt: 16, label: 'Birch', color: '#059669', description: 'High-tier resilient professional.' },
  { level: 5, minRpt: 32, label: 'Oak', color: '#047857', description: 'Deep roots and expert contributions.' },
  { level: 6, minRpt: 64, label: 'Cedar', color: '#065f46', description: 'Elite contributor sheltering the canopy.' },
  { level: 7, minRpt: 128, label: 'Redwood', color: '#b91c1c', description: 'Colossus of the pacts.' },
  { level: 8, minRpt: 256, label: 'Grove', color: '#f59e0b', description: 'An entire ecosystem of trust.' },
  { level: 9, minRpt: 512, label: 'Forest Lord', color: '#d97706', description: 'Top 1% guardian of the woodland.' },
  { level: 10, minRpt: 1024, label: 'Ancient Arbiter', color: '#fbbf24', description: 'A legendary force of nature.' },
];

export const getReputationInfo = (rpt) => {
  let currentTier = TIERS[0];
  let nextTier = TIERS[1];

  for (let i = 0; i < TIERS.length; i++) {
    if (rpt >= TIERS[i].minRpt) {
      currentTier = TIERS[i];
      nextTier = TIERS[i + 1] || null;
    } else {
      break;
    }
  }

  let progress = 0;
  if (nextTier) {
    const range = nextTier.minRpt - currentTier.minRpt;
    const currentProgress = rpt - currentTier.minRpt;
    progress = (currentProgress / range) * 100;
  } else {
    progress = 100; // Max tier reached
  }

  return {
    currentTier,
    nextTier,
    progress: Math.min(100, Math.max(0, progress)),
    totalRpt: rpt
  };
};
