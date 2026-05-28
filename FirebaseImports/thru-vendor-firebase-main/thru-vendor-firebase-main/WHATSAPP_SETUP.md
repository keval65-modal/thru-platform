# WhatsApp (Meta WABA) setup

All vendor WhatsApp messages are sent through the **WhatsApp Business Account (WABA)** via the **Meta Cloud API**, using **pre-approved message templates** only. Free-form session messages are not used for onboarding.

Legacy providers (OpenClaw, Twilio) have been removed from this app.

## Approved templates in use

| Template name | When it is sent | Body variables (in order) |
|---------------|-----------------|---------------------------|
| `merchant_welcome` | After signup (phone OTP verified + vendor profile created). **Retried** on agreement sign if still `pending`/`failed` | 1. Merchant first name 2. Agreement URL (`{NEXT_PUBLIC_APP_URL}/merchant/agreement`) — omit URL if `META_WHATSAPP_WELCOME_INCLUDE_URL=false` |
| `merchant_onboarding_complete` | After merchant signs the partner agreement (v1) | 1. Merchant first name (default). Optional 2nd: dashboard URL — see env below |

Create and **approve** both templates in [Meta Business Manager](https://business.facebook.com/) → WhatsApp → Message templates. The locale must match `META_WHATSAPP_DEFAULT_LOCALE` (default `en_US`).

## Environment variables (Vercel / `.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `META_ACCESS_TOKEN` | Yes | Permanent or system user token with `whatsapp_business_messaging` |
| `META_PHONE_NUMBER_ID` | Yes | Phone number ID from WhatsApp → API setup |
| `NEXT_PUBLIC_APP_URL` | Yes (prod) | e.g. `https://merchant.kiptech.in` — used in template URLs |
| `META_WHATSAPP_DEFAULT_LOCALE` | No | Template language code (default `en_US`; app retries `en`, `en_IN` on locale errors) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Required for `whatsapp_messages` logging (anon key cannot write with RLS) |
| `META_WHATSAPP_WELCOME_INCLUDE_URL` | No | Set to `false` if `merchant_welcome` has only **one** body variable (name). Default sends name + agreement URL |
| `META_WHATSAPP_ONBOARDING_COMPLETE_TEMPLATE` | No | Override template name (default `merchant_onboarding_complete`) |
| `META_WHATSAPP_ONBOARDING_COMPLETE_INCLUDE_URL` | No | Set to `true` if the onboarding-complete template has **two** body variables (name + dashboard URL) |

## Code layout

| File | Role |
|------|------|
| `src/services/whatsapp/sendTemplateMessage.ts` | Low-level Meta Graph API template send |
| `src/services/whatsapp/sendMerchantWelcomeAfterVerification.ts` | Signup → `merchant_welcome` |
| `src/services/whatsapp/sendMerchantOnboardingComplete.ts` | Agreement sign → `merchant_onboarding_complete` |
| `src/lib/supabase/whatsapp-messages-schema.sql` | Outbound log + dedupe per merchant per template |

## Database

Run in Supabase SQL editor (as needed):

- `src/lib/supabase/vendor-images-schema.sql` — shop images at signup
- `src/lib/supabase/whatsapp-messages-schema.sql` — outbound message log

Check sends:

```sql
select merchant_id, template_name, status, meta_message_id, api_response, created_at
from whatsapp_messages
order by created_at desc
limit 20;
```

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Row stuck at `pending`, null `api_response` | Serverless timed out before Meta returned — redeploy; signup page now uses `maxDuration = 60` |
| No row in `whatsapp_messages` | `SUPABASE_SERVICE_ROLE_KEY` missing on Vercel, or table not created |
| Row `failed`, Graph code `132000` / parameter error | Template body variable count does not match code — set `META_WHATSAPP_WELCOME_INCLUDE_URL` / `META_WHATSAPP_ONBOARDING_COMPLETE_INCLUDE_URL` |
| Row `sent` but no WhatsApp on phone | WABA still in **development** mode — add recipient as test number in Meta |
| Logs show `Skip: phone_verified is false` | Run `whatsapp-messages-schema.sql` and ensure signup sets `phone_verified` |

## Testing

1. Configure env vars on **Production** in [thru-vendor-dashboard](https://vercel.com/keval65-modals-projects/thru-vendor-dashboard) — especially `META_*`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.
2. Add test phone numbers in Meta if the WABA is still in development mode.
3. **Welcome:** complete a new signup at `/signup` → expect `merchant_welcome` and a row in `whatsapp_messages` with `status = sent`.
4. **Onboarding complete:** sign `/merchant/agreement` → expect `merchant_onboarding_complete` and a second row (different `template_name`).

## Direct API test (optional)

```bash
curl -X POST "https://graph.facebook.com/v22.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "919876543210",
    "type": "template",
    "template": {
      "name": "merchant_welcome",
      "language": { "code": "en_US" },
      "components": [{
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Ravi" },
          { "type": "text", "text": "https://merchant.kiptech.in/merchant/agreement" }
        ]
      }]
    }
  }'
```

## Logs (Vercel)

WhatsApp runs inside the **signup server action** (not a separate `/api/...` route). In Vercel → Logs:

1. Set time range to when you submitted signup.
2. Search for **`merchant-welcome`**, **`whatsapp-cloud`**, or **`signup`** (not only the path `/signup`).
3. Open the **`POST`** request for `/signup` (or the page that hosts the form) and expand **Function** / stdout — server-action logs appear there.

After deploy, signup **awaits** the send so logs and DB updates should appear on the same request.

Filter strings:

- `[whatsapp-cloud]` — Graph API call
- `[merchant-welcome]` — welcome template
- `[signup] Sending merchant_welcome` — signup wired the send
- `[merchant-onboarding-complete]` — post-agreement template
