/* global process */
import { triageInput } from '../src/services/ai.js';

// Wait for window.ai or fallback immediately. In Node environment, fallback runs instantly.
// We must mock window just in case, but ai.js handles it gracefully via typeof window check.

const dataset = [
  // Financial
  { input: "I paid Aliyu 500k for rent", expectedCat: "FINANCIAL_LOG", expectedAmt: 500000 },
  { input: "spent 50 dollars on lunch", expectedCat: "FINANCIAL_LOG", expectedAmt: 50 },
  { input: "bought a new laptop for 1.5m naira", expectedCat: "FINANCIAL_LOG", expectedAmt: 1500000 },
  { input: "charged 20k to the corporate card", expectedCat: "FINANCIAL_LOG", expectedAmt: 20000 },
  { input: "cost me 2.5b", expectedCat: "FINANCIAL_LOG", expectedAmt: 2500000000 },
  // Calendar
  { input: "meeting with sarah tomorrow at 2 pm", expectedCat: "CALENDAR_EVENT" },
  { input: "call john today at 9:30 am", expectedCat: "CALENDAR_EVENT" },
  { input: "dinner reservation at 8 pm", expectedCat: "CALENDAR_EVENT" },
  { input: "schedule a flight for next week", expectedCat: "CALENDAR_EVENT" },
  { input: "lunch appointment at 12:00 pm", expectedCat: "CALENDAR_EVENT" },
  // Action Items
  { input: "remind me to call mom", expectedCat: "ACTION_ITEM" },
  { input: "urgent need to fix the bug", expectedCat: "ACTION_ITEM" },
  { input: "email the pitch deck to investors", expectedCat: "ACTION_ITEM" },
  { input: "todo: buy groceries", expectedCat: "ACTION_ITEM" },
  { input: "must send out the invitations", expectedCat: "ACTION_ITEM" },
  // Static Intel
  { input: "the hotel room is 402", expectedCat: "STATIC_INTEL" },
  { input: "wifi password is password123", expectedCat: "STATIC_INTEL" },
  { input: "the car is parked in section B", expectedCat: "STATIC_INTEL" },
  { input: "gate code is 1234", expectedCat: "STATIC_INTEL" },
  { input: "flight number is BA123", expectedCat: "STATIC_INTEL" },
];

async function runEval() {
  console.log("Starting AI Triage Eval Suite...\n");
  let passed = 0;
  let total = dataset.length;

  for (const item of dataset) {
    const result = await triageInput(item.input);
    let isPass = result.category === item.expectedCat;
    
    if (isPass && item.expectedAmt !== undefined) {
      const meta = JSON.parse(result.metadata_json);
      if (meta.amount !== item.expectedAmt) {
        isPass = false;
        console.log(`❌ FAILED (Amount mismatch): "${item.input}" - Expected ${item.expectedAmt}, got ${meta.amount}`);
      }
    }

    if (isPass) {
      passed++;
      console.log(`✅ PASSED: "${item.input}" -> ${result.category}`);
    } else {
      console.log(`❌ FAILED: "${item.input}" - Expected ${item.expectedCat}, got ${result.category}`);
    }
  }

  const accuracy = (passed / total) * 100;
  console.log(`\nEval Results: ${passed}/${total} passed (${accuracy}%)`);
  
  if (accuracy < 90) {
    console.error("🔥 Eval failed: Accuracy below 90% KPI.");
    process.exit(1);
  } else {
    console.log("🚀 Eval passed successfully.");
    process.exit(0);
  }
}

runEval();
