const express = require("express");
const router = express.Router();
const { topK } = require("../utils/fastFaq"); // NEW: import fast retriever

router.post("/chat", async (req, res) => {
  try {
    const { messages = [], userId } = req.body || {};
    const userMessage = [...messages].reverse().find((m) => m.role === "user");
    const userQuestion = userMessage?.content || "";
    if (!Array.isArray(messages))
      return res.status(400).json({ error: "messages[] required" });

    const hits = userQuestion ? topK(userQuestion, 3) : [];

    const BEST = hits[0];
    const HAS_CONFIDENT_MATCH = BEST && BEST.score >= 0.2;
    const context = HAS_CONFIDENT_MATCH
      ? "FAQ CONTEXT (use verbatim when answering):\n" +
        hits
          .map(
            (h, i) =>
              `[#${i + 1}] (${h.category || "FAQ"}) Q: ${h.q}\nA: ${h.a}`
          )
          .join("\n\n")
      : "No confident FAQ match. Ask a short clarifying question, don't guess.";

    const isBangla = /[\u0980-\u09FF]/.test(userQuestion);

    const SYSTEM_PROMPT = `
You are the support assistant for Ahar Bondhu.

RULES:
- If FAQ CONTEXT is provided and confidence is high, answer USING THAT CONTEXT. Do not invent details.

- If there is NO confident match, do NOT guess: ask ONE short clarifying question.
- Keep answers concise and actionable.
- Reply in the user's language: ${isBangla ? "Bangla" : "English"}.
`;

    const upstreamMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: context },
      ...(userId ? [{ role: "system", content: `User ID: ${userId}` }] : []),
      ...messages,
    ];

    // --- call Groq (same as you have now) ---
    const upstream = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          stream: true,
          messages: upstreamMessages,
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      let message = "Upstream error";
      try {
        message = JSON.parse(text)?.error?.message || message;
      } catch {}
      const status =
        upstream.status === 429 || /quota|rate/i.test(message) ? 402 : 502;
      return res.status(status).json({ error: message });
    }

    // stream back (unchanged)
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          res.end();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) res.write(delta);
        } catch {}
      }
    }
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Server error" });
    else
      try {
        res.end();
      } catch {}
  }
});

module.exports = router;
