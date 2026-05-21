# 📱 WhatsApp Messaging Setup

This guide explains how to configure WhatsApp messaging for vendor registration welcome messages.

## Overview

When a vendor registers through the signup form, they automatically receive a WhatsApp welcome message with the following content:

```
Dear <Owner Name> ji, thank you for enrolling your <Shop Category> <Shop Name> With Thru! We are excited to have you on board as part of the Thru Vendors Program. We are launching soon and we will update you as soon as we're up and running. In case of any queries or suggestions, please reach out to us on this same number. Thank you again!
```

## Supported Providers

The WhatsApp service supports multiple providers:

1. **OpenClaw Bot** (Default - Recommended)
2. **Twilio WhatsApp API** (Alternative)
3. **WhatsApp Business API (Meta)** (Alternative)

## Option 1: OpenClaw Bot Setup (Recommended)

### Step 1: Configure OpenClaw Bot

1. Ensure your OpenClaw bot is set up and linked to your WhatsApp number
2. Get your OpenClaw API endpoint URL
3. Get your API key or authentication token (if required)
4. Get your Bot ID (if required)

### Step 2: Configure Environment Variables

Add these to your `.env.local` or production environment:

```bash
# WhatsApp Provider
WHATSAPP_PROVIDER=openclaw

# OpenClaw Bot Configuration
OPENCLAW_API_URL=https://your-openclaw-api-endpoint.com/api/send-message
OPENCLAW_API_KEY=your_api_key_here  # Optional, if authentication is required
OPENCLAW_BOT_ID=your_bot_id_here    # Optional, if bot ID is required
```

### Step 3: API Request Format

The service will send a POST request to your OpenClaw API endpoint with the following format:

```json
{
  "to": "+919876543210",
  "message": "Dear John ji, thank you for enrolling...",
  "botId": "your_bot_id"  // Only if OPENCLAW_BOT_ID is set
}
```

### Step 4: Expected Response Format

OpenClaw API should return a JSON response indicating success:

```json
{
  "success": true,
  "id": "message_id_123",
  "message": "Message sent successfully"
}
```

Or in case of error:

```json
{
  "error": "Error message",
  "message": "Error description"
}
```

### Step 5: Test

1. Register a new vendor through the signup form
2. Check the vendor's WhatsApp number for the welcome message
3. Check server logs for confirmation: `✅ WhatsApp message sent via OpenClaw bot`

## Option 2: Twilio Setup (Alternative)

### Step 1: Install Twilio Package

```bash
npm install twilio
```

### Step 2: Get Twilio Credentials

1. Sign up for a Twilio account at https://www.twilio.com/
2. Go to the Twilio Console Dashboard
3. Get your **Account SID** and **Auth Token**
4. Enable WhatsApp in your Twilio account:
   - Go to Messaging → Try it out → Send a WhatsApp message
   - Follow the setup wizard to get a WhatsApp-enabled phone number

### Step 3: Configure Environment Variables

Add these to your `.env.local` or production environment:

```bash
# WhatsApp Provider (use 'twilio' or 'whatsapp-api')
WHATSAPP_PROVIDER=twilio

# Twilio Credentials
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Your Twilio WhatsApp number (format: whatsapp:+1234567890)
```

### Step 4: Test

1. Register a new vendor through the signup form
2. Check the vendor's WhatsApp number for the welcome message
3. Check server logs for confirmation: `✅ WhatsApp welcome message sent to +919876543210`

## Option 2: WhatsApp Business API (Meta) Setup

### Step 1: Get Meta Business Account

1. Create a Meta Business account at https://business.facebook.com/
2. Set up a WhatsApp Business Account
3. Get your **Phone Number ID** and **Access Token**

### Step 2: Configure Environment Variables

Add these to your `.env.local` or production environment:

```bash
# WhatsApp Provider
WHATSAPP_PROVIDER=whatsapp-api

# WhatsApp Business API Credentials
WHATSAPP_API_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_API_VERSION=v21.0  # Optional, defaults to v21.0
```

## Environment Variables Summary

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `WHATSAPP_PROVIDER` | No | Provider to use: `openclaw`, `twilio`, or `whatsapp-api` | `openclaw` |
| `OPENCLAW_API_URL` | Yes (if OpenClaw) | OpenClaw bot API endpoint URL | `https://api.openclaw.com/send` |
| `OPENCLAW_API_KEY` | No (if OpenClaw) | OpenClaw API key for authentication | `your_api_key` |
| `OPENCLAW_BOT_ID` | No (if OpenClaw) | OpenClaw bot ID | `bot_123456` |
| `TWILIO_ACCOUNT_SID` | Yes (if Twilio) | Twilio Account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Yes (if Twilio) | Twilio Auth Token | `your_auth_token` |
| `TWILIO_WHATSAPP_FROM` | Yes (if Twilio) | Twilio WhatsApp number | `whatsapp:+14155238886` |
| `WHATSAPP_API_TOKEN` | Yes (if Meta) | Meta WhatsApp API Access Token | `your_access_token` |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes (if Meta) | Meta Phone Number ID | `123456789012345` |
| `WHATSAPP_API_VERSION` | No | Meta API version | `v21.0` |

## How It Works

1. Vendor fills out the registration form at `/signup`
2. Form data is validated and vendor account is created
3. Vendor is saved to Firebase and Supabase
4. **WhatsApp welcome message is sent automatically** (non-blocking - signup succeeds even if message fails)
5. Vendor is redirected to the dashboard

## Error Handling

- If WhatsApp messaging fails, the vendor signup **still succeeds**
- Errors are logged to the console for debugging
- The vendor can still use the platform even if the welcome message wasn't sent

## Troubleshooting

### Error: "WhatsApp service not configured"
- **Cause**: Missing environment variables
- **Fix**: Add all required environment variables for your chosen provider

### Error: "Twilio package not installed"
- **Cause**: `twilio` package not installed
- **Fix**: Run `npm install twilio`

### Error: "Invalid phone number format"
- **Cause**: Phone number not in E.164 format
- **Fix**: Ensure phone numbers include country code with `+` prefix (e.g., `+919876543210`)

### Messages not being received
- Check Twilio/Meta dashboard for message status
- Verify phone number format is correct
- Check server logs for detailed error messages
- Ensure WhatsApp is enabled in your provider account

## Cost Considerations

### Twilio
- **WhatsApp pricing**: Varies by country
- **India**: ~₹0.50-1.00 per message
- **Free tier**: Limited test messages available

### WhatsApp Business API
- **Free tier**: 1,000 conversations/month
- **Paid**: Varies by conversation type
- Check Meta's pricing page for current rates

## Testing

To test without sending real messages:

1. Use Twilio's test credentials (if available)
2. Use a test phone number in development
3. Check server logs for message send confirmations
4. Verify message format using the `formatVendorWelcomeMessage` function

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify environment variables are set correctly
- Test with a known working phone number
- Contact your WhatsApp provider's support if needed
