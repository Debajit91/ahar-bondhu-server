const express = require("express");
// If Node <18, uncomment the next line and `npm i node-fetch`
// const fetch = require("node-fetch");

const router = express.Router();

const SYSTEM_PROMPT = `
You are a concise, friendly support assistant for our web app.
Provide step-by-step fixes. If info is missing, ask one clear question.
If it looks like a bug, collect repro steps (URL, browser, steps, expected vs actual).
`;

router.post("/chat", async (req, res) => {
  try {
    const { messages, userId } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages[] required" });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY" });
    }

    // Build messages with a system prompt and optional userId context
    const upstreamMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(userId ? [{ role: "system", content: `User ID: ${userId}` }] : []),
      ...messages,
    ];

    // Hit Groq's OpenAI-compatible endpoint
    const upstream = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // solid default; you can switch models later
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

    // Stream plain text to the client by parsing SSE frames
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

      // Groq sends Server-Sent Events: lines starting with "data:"
      let lines = buffer.split("\n");
      buffer = lines.pop() || ""; // keep last partial line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim(); // strip "data:"
        if (data === "[DONE]") {
          res.end();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) res.write(delta);
        } catch {
          // ignore partial / non-JSON keep-alives
        }
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
