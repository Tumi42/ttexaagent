# Texaagent — chatbot + outreach, merged (free Cloudflare deploy)

## Deploy (same pattern as Botly)
1. GitHub: new repo, upload this whole folder (keep public/ and functions/ as folders).
2. Cloudflare Pages: Create > Pages > Connect to Git > this repo.
   Framework: None. Build command: blank. Build output directory: public
3. D1: Storage & Databases > D1 > Create database "texaagent-db".
   Console tab > paste schema.sql > Execute.
4. Bindings: Pages project > Settings > Bindings > Add > D1 database.
   Variable name: DB (exactly) > pick texaagent-db > Save.
5. Secrets: Settings > Variables and Secrets > Add:
   - GEMINI_API_KEY  (from aistudio.google.com/apikey)
   - BREVO_API_KEY   (free at brevo.com — 300 emails/day free, needed to actually send)
   - SENDER_EMAIL    (an email address verified in your Brevo account)
   Optional: GEMINI_MODEL if the default gemini-2.5-flash gets retired.
6. Deployments > latest > Retry deployment (bindings/secrets apply on next deploy).

## What's real vs. what's next
- Real: chatbot, credit tracking per plan, CSV-based outreach drafting, approval-gated
  sending via Brevo, pricing display.
- Not built yet: automatic company/lead discovery (needs a paid data provider like
  Apollo's API), and automatic Paystack billing (for now, sell plans manually via a
  Paystack payment link and update a bot's credits by hand in D1's console until
  you're ready to wire up subscription webhooks).
