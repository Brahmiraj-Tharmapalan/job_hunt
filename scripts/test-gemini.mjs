/**
 * Gemini key diagnostic: bypasses our app + the AI SDK and calls Google's
 * REST API directly, so we can see exactly what your key can do.
 *
 * Usage:
 *   node scripts/test-gemini.mjs YOUR_GEMINI_KEY
 *
 * It (1) lists the models your key can access, then (2) tries a tiny
 * generateContent call on several Flash models and prints the raw status.
 */
const key = process.argv[2] || process.env.GEMINI_TEST_KEY;
if (!key) {
  console.error("Usage: node scripts/test-gemini.mjs YOUR_GEMINI_KEY");
  process.exit(1);
}

const BASE = "https://generativelanguage.googleapis.com/v1beta";

async function listModels() {
  console.log("\n=== Models your key can access (that support generateContent) ===");
  const res = await fetch(`${BASE}/models?key=${key}`);
  if (!res.ok) {
    console.log("listModels failed:", res.status, (await res.text()).slice(0, 300));
    return;
  }
  const json = await res.json();
  for (const m of json.models ?? []) {
    if ((m.supportedGenerationMethods ?? []).includes("generateContent")) {
      console.log("  •", m.name.replace("models/", ""));
    }
  }
}

async function tryModel(model) {
  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the word OK." }] }] }),
  });
  const text = await res.text();
  const short = text.replace(/\s+/g, " ").slice(0, 160);
  console.log(`  ${model.padEnd(24)} → ${res.status}  ${short}`);
}

const MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-2.5-flash",
];

await listModels();
console.log("\n=== generateContent test per model ===");
for (const m of MODELS) {
  await tryModel(m);
}
console.log("\nDone. 200 = works. 429 = quota/billing. 404 = model not available to this key.");
