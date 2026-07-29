import { getReputationInfo, TIERS } from '../src/utils/reputation.js';

console.log("=========================================");
console.log("       DASHY FRONTEND TEST SUITE");
console.log("=========================================");

const testCases = [
  {
    name: "Test Case 1: RPT = 0 (Sprout Level)",
    run: () => {
      const info = getReputationInfo(0);
      if (info.currentTier.label !== 'Sprout') throw new Error(`Expected Sprout, got ${info.currentTier.label}`);
      if (info.currentTier.level !== 0) throw new Error(`Expected level 0, got ${info.currentTier.level}`);
      if (info.progress !== 0) throw new Error(`Expected progress 0%, got ${info.progress}%`);
      console.log("✓ Test Case 1 Passed!");
    }
  },
  {
    name: "Test Case 2: RPT = 2 (Seedling Level)",
    run: () => {
      const info = getReputationInfo(2);
      if (info.currentTier.label !== 'Seedling') throw new Error(`Expected Seedling, got ${info.currentTier.label}`);
      if (info.currentTier.level !== 1) throw new Error(`Expected level 1, got ${info.currentTier.level}`);
      if (info.progress !== 0) throw new Error(`Expected progress 0% at start of Seedling, got ${info.progress}%`);
      console.log("✓ Test Case 2 Passed!");
    }
  },
  {
    name: "Test Case 3: RPT = 3 (Seedling progress check)",
    run: () => {
      const info = getReputationInfo(3);
      // Next tier is Sapling (minRpt: 4). Range from Seedling (minRpt 2) to Sapling (minRpt 4) is 2. Progress is (3-2)/2 = 50%
      if (info.currentTier.label !== 'Seedling') throw new Error(`Expected Seedling, got ${info.currentTier.label}`);
      if (info.progress !== 50) throw new Error(`Expected progress 50%, got ${info.progress}%`);
      console.log("✓ Test Case 3 Passed!");
    }
  },
  {
    name: "Test Case 4: RPT = 5 (Sapling progress check)",
    run: () => {
      const info = getReputationInfo(5);
      // Sapling is minRpt: 4. Next is Pine (minRpt: 8). Range: 4. Progress is (5-4)/4 = 25%
      if (info.currentTier.label !== 'Sapling') throw new Error(`Expected Sapling, got ${info.currentTier.label}`);
      if (info.progress !== 25) throw new Error(`Expected progress 25%, got ${info.progress}%`);
      console.log("✓ Test Case 4 Passed!");
    }
  },
  {
    name: "Test Case 5: RPT = 1024 (Ancient Arbiter max level)",
    run: () => {
      const info = getReputationInfo(1024);
      if (info.currentTier.label !== 'Ancient Arbiter') throw new Error(`Expected Ancient Arbiter, got ${info.currentTier.label}`);
      if (info.currentTier.level !== 10) throw new Error(`Expected level 10, got ${info.currentTier.level}`);
      if (info.progress !== 100) throw new Error(`Expected max progress 100%, got ${info.progress}%`);
      console.log("✓ Test Case 5 Passed!");
    }
  },
  {
    name: "Test Case 6: RPT = 2000 (Past max level bound check)",
    run: () => {
      const info = getReputationInfo(2000);
      if (info.currentTier.label !== 'Ancient Arbiter') throw new Error(`Expected Ancient Arbiter, got ${info.currentTier.label}`);
      if (info.progress !== 100) throw new Error(`Expected max progress 100%, got ${info.progress}%`);
      console.log("✓ Test Case 6 Passed!");
    }
  }
];

let failed = 0;
for (const tc of testCases) {
  console.log(`Running ${tc.name}...`);
  try {
    tc.run();
  } catch (error) {
    console.error(`❌ ${tc.name} Failed: ${error.message}`);
    failed++;
  }
}

console.log("=========================================");
if (failed === 0) {
  console.log("🎉 ALL 6 FRONTEND TEST CASES PASSED!");
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST CASE(S) FAILED.`);
  process.exit(1);
}
