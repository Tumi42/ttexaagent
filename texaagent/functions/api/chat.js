// POST /api/chat  { botId, message, history? }  ->  { reply, chat_credits }
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...CORS } }); }

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const botId = String(body.botId || "");
  const message = String(body.message || "").trim().slice(0, 500);
  if (!botId || !message) return json({ error: "Missing botId or message" }, 400);

  const bot = await env.DB.prepare("SELECT name, content, chat_credits FROM bots WHERE id = ?").bind(botId).first();
  if (!bot) return json({ error: "Bot not found" }, 404);
  if (bot.chat_credits <= 0) return json({ error: "This business has used its monthly chat credits. Ask them to upgrade." }, 402);
  if (!env.GEMINI_API_KEY) return json({ error: "Server missing GEMINI_API_KEY" }, 500);
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";

  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const contents = history.filter(h => h && (h.role === "user" || h.role === "model") && typeof h.text === "string")
    .map(h => ({ role: h.role, parts: [{ text: h.text.slice(0, 500) }] }));
  contents.push({ role: "user", parts: [{ text: message }] });

  const system = `You are the friendly customer support assistant for "${bot.name}". Answer using ONLY the business information below. If the answer is not in it, say you're not sure and suggest contacting the business directly. Keep replies short (2-4 sentences), warm and clear. Never make up prices, hours or policies.\n\nBUSINESS INFO:\n${bot.content}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents }) });
    if (!res.ok) { const t = await res.text().catch(() => ""); return json({ error: `Gemini error ${res.status}: ${t.slice(0,200)}` }, 502); }
    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return json({ error: "No reply generated" }, 502);
    await env.DB.prepare("UPDATE bots SET chat_credits = chat_credits - 1 WHERE id = ?").bind(botId).run();
    return json({ reply: reply.trim(), chat_credits: bot.chat_credits - 1 });
  } catch { return json({ error: "Could not reach Gemini" }, 502); }
}
