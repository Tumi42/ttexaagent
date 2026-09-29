// POST /api/create-bot  { name, url?, content?, plan }  ->  { id }
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const MAX_CONTENT = 30000;
const PLAN_CREDITS = {
  starter:  { chat: 500,   email: 20  },
  pro:      { chat: 2000,  email: 100 },
  business: { chat: 10000, email: 400 }
};

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...CORS } }); }
function htmlToText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const name = String(body.name || "").trim().slice(0, 100);
  let content = String(body.content || "").trim();
  const url = String(body.url || "").trim();
  const plan = PLAN_CREDITS[body.plan] ? body.plan : "starter";
  if (!name) return json({ error: "Business name is required" }, 400);

  if (url) {
    if (!/^https?:\/\//i.test(url)) return json({ error: "URL must start with http:// or https://" }, 400);
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Texaagent/1.0)" } });
      if (!res.ok) return json({ error: `Could not read that website (status ${res.status})` }, 400);
      content = (content + "\n\n" + htmlToText(await res.text())).trim();
    } catch { return json({ error: "Could not reach that website. Paste business info as text instead." }, 400); }
  }
  content = content.slice(0, MAX_CONTENT);
  if (content.length < 40) return json({ error: "Not enough business info. Add a URL or paste more text." }, 400);

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const c = PLAN_CREDITS[plan];
  await env.DB.prepare("INSERT INTO bots (id, name, content, plan, chat_credits, email_credits) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, name, content, plan, c.chat, c.email).run();
  return json({ id, plan, chat_credits: c.chat, email_credits: c.email });
}
