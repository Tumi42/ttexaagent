// POST /api/draft-outreach  { botId, leads: [{name, email, company, notes}] }  ->  { drafts: [{id,...,draft}] }
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...CORS } }); }

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const botId = String(body.botId || "");
  const leads = Array.isArray(body.leads) ? body.leads.slice(0, 50) : [];
  if (!botId || leads.length === 0) return json({ error: "Missing botId or leads" }, 400);

  const bot = await env.DB.prepare("SELECT name, content, email_credits FROM bots WHERE id = ?").bind(botId).first();
  if (!bot) return json({ error: "Bot not found" }, 404);
  if (bot.email_credits < leads.length) return json({ error: `Not enough email credits (${bot.email_credits} left, ${leads.length} requested).` }, 402);
  if (!env.GEMINI_API_KEY) return json({ error: "Server missing GEMINI_API_KEY" }, 500);
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";

  const system = `You write short, personalized cold outreach emails for "${bot.name}". Use ONLY these facts about the business:\n${bot.content}\n\nRules: under 90 words, no generic flattery, one clear reason this specific prospect would care, one soft call to action (reply or a quick call). Sign off with the business name. Output ONLY the email body, no subject line, no commentary.`;

  const results = [];
  for (const lead of leads) {
    const email = String(lead.email || "").trim();
    if (!email || !email.includes("@")) continue;
    const prompt = `Prospect name: ${lead.name || "there"}\nProspect company: ${lead.company || "unknown"}\nNotes: ${lead.notes || "none"}\n\nWrite the email.`;
    let draftText = "";
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] }) });
      if (res.ok) {
        const data = await res.json();
        draftText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      }
    } catch {}
    if (!draftText) draftText = "(Draft failed to generate — you can write this one manually or retry.)";

    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await env.DB.prepare("INSERT INTO leads (id, bot_id, name, email, company, notes, draft, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'drafted')")
      .bind(id, botId, lead.name || "", email, lead.company || "", lead.notes || "", draftText).run();
    results.push({ id, name: lead.name || "", email, company: lead.company || "", draft: draftText });
  }
  return json({ drafts: results });
}
