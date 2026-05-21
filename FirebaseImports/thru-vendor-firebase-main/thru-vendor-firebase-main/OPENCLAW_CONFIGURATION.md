# 🤖 OpenClaw Bot Configuration Guide

## Quick Setup

To configure OpenClaw bot for sending WhatsApp messages to vendors:

### 1. Environment Variables

Add these to your `.env.local` or production environment:

```bash
# Set OpenClaw as the provider
WHATSAPP_PROVIDER=openclaw

# Your OpenClaw API endpoint URL
OPENCLAW_API_URL=https://your-openclaw-endpoint.com/api/send-message

# Optional: API key if authentication is required
OPENCLAW_API_KEY=your_api_key_here

# Optional: Bot ID if your OpenClaw setup requires it
OPENCLAW_BOT_ID=your_bot_id_here
```

### 2. API Endpoint Requirements

Your OpenClaw API endpoint should accept POST requests with this format:

**Request:**
```json
POST /api/send-message
Content-Type: application/json
Authorization: Bearer {OPENCLAW_API_KEY}  // If API key is set

{
  "to": "+919876543210",
  "message": "Dear John ji, thank you for enrolling your Grocery My Shop With Thru!...",
  "botId": "your_bot_id"  // Only included if OPENCLAW_BOT_ID is set
}
```

**Expected Response (Success):**
```json
{
  "success": true,
  "id": "message_id_123",
  "message": "Message sent successfully"
}
```

**Expected Response (Error):**
```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

### 3. Message Format

The welcome message sent to vendors will be:

```
Dear {Owner Name} ji, thank you for enrolling your {Shop Category} {Shop Name} With Thru! We are excited to have you on board as part of the Thru Vendors Program. We are launching soon and we will update you as soon as we're up and running. In case of any queries or suggestions, please reach out to us on this same number. Thank you again!
```

### 4. Testing

1. Set up your environment variables
2. Register a new vendor through the signup form at `/signup`
3. Check the vendor's WhatsApp number for the welcome message
4. Check server logs for:
   - `✅ WhatsApp message sent via OpenClaw bot` (success)
   - `❌ OpenClaw API error:` (if there's an issue)

### 5. Troubleshooting

**Error: "OpenClaw API URL not configured"**
- Make sure `OPENCLAW_API_URL` is set in your environment variables

**Error: "HTTP 401: Unauthorized"**
- Check if `OPENCLAW_API_KEY` is set correctly
- Verify the API key format matches what OpenClaw expects

**Error: "HTTP 404: Not Found"**
- Verify the `OPENCLAW_API_URL` endpoint is correct
- Check if the endpoint path is correct

**Messages not being received**
- Verify the phone number format is correct (E.164 format: +919876543210)
- Check OpenClaw bot dashboard for message status
- Verify your OpenClaw bot is properly linked to your WhatsApp number
- Check server logs for detailed error messages

### 6. Customization

If your OpenClaw API requires a different request format, you can modify the `sendViaOpenClaw` function in:
```
src/lib/whatsapp-service.ts
```

Look for the `sendViaOpenClaw` function and adjust the request body format to match your OpenClaw API requirements.
