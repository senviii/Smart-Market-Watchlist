import axios from "axios";

async function generateDigestNarrative(flaggedItems) {
  if (!flaggedItems || flaggedItems.length === 0) {
    return "Nothing significant right now — your watchlist is quiet.";
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackNarrative(flaggedItems);
  }

  try {
    const summaryInput = flaggedItems
      .map((i) => `${i.symbol} (${i.sector}): ${i.pctChange > 0 ? "+" : ""}${i.pctChange}%, ${i.reason}`)
      .join("; ");

    const { data } = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-5-haiku-20241022",
        max_tokens: 80,
        messages: [
          {
            role: "user",
            content: `Write ONE short plain-English sentence (under 25 words, no markdown) summarizing these flagged stock movements for a watchlist app, in the tone of a financial news ticker: ${summaryInput}`
          }
        ]
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        timeout: 6000
      }
    );
    const text = data?.content?.[0]?.text?.trim();
    return text || fallbackNarrative(flaggedItems);
  } catch (err) {
    console.error("[narrative] LLM call failed, using fallback:", err.message);
    return fallbackNarrative(flaggedItems);
  }
}

function fallbackNarrative(flaggedItems) {
  const top = [...flaggedItems].sort((a, b) => b.score - a.score)[0];
  const count = flaggedItems.length;
  const direction = top.pctChange >= 0 ? "up" : "down";
  return `${count} stock${count > 1 ? "s" : ""} flagged — ${top.symbol} leads, ${direction} ${Math.abs(top.pctChange)}% (${top.reason}).`;
}

export { generateDigestNarrative };