const fs = require("fs");
const path = require("path");

const FAQ_PATH = path.join(__dirname, "..", "data", "faq.json");
let FAQ = [];
try { FAQ = JSON.parse(fs.readFileSync(FAQ_PATH, "utf8")); } catch { FAQ = []; }

const tokenize = (s) =>
  (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
const termFreq = (toks) => toks.reduce((m, t) => (m.set(t, (m.get(t) || 0) + 1), m), new Map());
const dot = (a, b) => { let s = 0; for (const [k, v] of a) if (b.has(k)) s += v * (b.get(k) || 0); return s; };
const mag = (m) => Math.sqrt([...m.values()].reduce((s, v) => s + v * v, 0));
const cosine = (a, b) => { const d = mag(a) * mag(b); return d ? dot(a, b) / d : 0; };

const INDEX = FAQ.map((item, i) => {
  const tf = termFreq(tokenize(`${item.q} ${item.a} ${item.category || ""}`));
  return { i, tf };
});

function topK(query, k = 3) {
  if (!FAQ.length) return [];
  const qTF = termFreq(tokenize(query));
  return INDEX.map(({ i, tf }) => ({ ...FAQ[i], score: cosine(qTF, tf) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

module.exports = { topK };
