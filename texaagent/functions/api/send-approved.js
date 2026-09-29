// POST /api/send-approved  { botId, leadIds: [id,...] }  ->  { sent, failed, email_credits }
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...CORS } }); }

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const botId = String(body.botId || "");
  const leadIds = Array.isArray(body.leadIds) ? body.leadIds.slice(0, 50) : [];
  if (!botId || leadIds.length === 0) return json({ error: "Missing botId or leadIds" }, 400);

  const bot = await env.DB.prepare("SELECT name, email_credits FROM bots WHERE id = ?").bind(botId).first();
  if (!bot) return json({ error: "Bot not found" }, 404);
  if (!env.BREVO_API_KEY) return json({ error: "Server missing BREVO_API_KEY — add it to send real emails." }, 500);
  if (!env.SENDER_EMAIL) return json({ error: "Server missing SENDER_EMAIL env var." }, 500);
  if (bot.email_credits < leadIds.length) return json({ error: "Not enough email credits for this batch." }, 402);

  let sent = 0, failed = 0;
  for (const id of leadIds) {
    const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ? AND bot_id = ? AND status = 'drafted'").bind(id, botId).first();
    if (!lead) { failed++; continue; }
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": env.BREVO_API_KEY },
        body: JSON.stringify({
          sender: { email: env.SENDER_EMAIL, name: bot.name },
          to: [{ email: lead.email, name: lead.name || undefined }],
          subject: `Quick question for ${lead.company || "you"}`,
          textContent: lead.draft
        })
      });
      if (res.ok) {
        await env.DB.prepare("UPDATE leads SET status = 'sent' WHERE id = ?").bind(id).run();
        await env.DB.prepare("UPDATE bots SET email_credits = email_credits - 1 WHERE id = ?").bind(botId).run();
        sent++;
      } else { failed++; }
    } catch { failed++; }
  }
  const fresh = await env.DB.prepare("SELECT email_credits FROM bots WHERE id = ?").bind(botId).first();
  return json({ sent, failed, email_credits: fresh.email_credits });
}
