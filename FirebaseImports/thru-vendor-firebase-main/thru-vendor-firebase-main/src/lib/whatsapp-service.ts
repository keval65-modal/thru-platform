/**
 * WhatsApp Messaging Service
 * 
 * Sends WhatsApp messages to vendors after registration.
 * Supports multiple providers (Twilio, WhatsApp Business API, etc.)
 */

interface WhatsAppMessageOptions {
  to: string; // Phone number in E.164 format (e.g., +919876543210)
  message: string;
}

interface WhatsAppServiceResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send WhatsApp message using configured provider
 */
export async function sendWhatsAppMessage(
  options: WhatsAppMessageOptions
): Promise<WhatsAppServiceResponse> {
  const { to, message } = options;

  // Validate phone number format
  if (!to || !to.startsWith('+')) {
    return {
      success: false,
      error: 'Phone number must be in E.164 format (e.g., +919876543210)',
    };
  }

  // Check which provider is configured
  const provider = process.env.WHATSAPP_PROVIDER || 'openclaw';

  try {
    switch (provider.toLowerCase()) {
      case 'openclaw':
        return await sendViaOpenClaw(to, message);
      case 'twilio':
        return await sendViaTwilio(to, message);
      case 'whatsapp-api':
      case 'meta':
        return await sendViaWhatsAppAPI(to, message);
      default:
        return await sendViaOpenClaw(to, message); // Default to OpenClaw
    }
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
    };
  }
}

/**
 * Send WhatsApp message via OpenClaw bot
 */
async function sendViaOpenClaw(
  to: string,
  message: string
): Promise<WhatsAppServiceResponse> {
  const apiUrl = process.env.OPENCLAW_API_URL;
  const apiKey = process.env.OPENCLAW_API_KEY;
  const botId = process.env.OPENCLAW_BOT_ID;

  if (!apiUrl) {
    console.error('❌ OpenClaw API URL not configured');
    return {
      success: false,
      error: 'WhatsApp service not configured. Please set OPENCLAW_API_URL environment variable.',
    };
  }

  try {
    // Prepare the request body - adjust based on OpenClaw's API format
    const requestBody: any = {
      to: to,
      message: message,
    };

    // Add bot ID if provided
    if (botId) {
      requestBody.botId = botId;
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if provided
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['X-API-Key'] = apiKey;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('❌ OpenClaw API error:', data);
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}: Failed to send WhatsApp message`,
      };
    }

    console.log(`✅ WhatsApp message sent via OpenClaw bot. Response:`, data);
    return {
      success: true,
      messageId: data.id || data.messageId || data.message_id,
    };
  } catch (error: any) {
    console.error('❌ OpenClaw API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message via OpenClaw bot',
    };
  }
}

/**
 * Send WhatsApp message via Twilio
 */
async function sendViaTwilio(
  to: string,
  message: string
): Promise<WhatsAppServiceResponse> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('❌ Twilio credentials not configured');
    return {
      success: false,
      error: 'WhatsApp service not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM environment variables.',
    };
  }

  try {
    // Dynamic import to avoid bundling Twilio in client code
    let twilio;
    try {
      twilio = await import('twilio');
    } catch (importError) {
      console.error('❌ Twilio package not installed. Run: npm install twilio');
      return {
        success: false,
        error: 'Twilio package not installed. Please install it with: npm install twilio',
      };
    }
    const client = twilio.default(accountSid, authToken);

    const result = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${to}`,
      body: message,
    });

    console.log(`✅ WhatsApp message sent via Twilio. SID: ${result.sid}`);
    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    console.error('❌ Twilio WhatsApp error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message via Twilio',
    };
  }
}

/**
 * Send WhatsApp message via WhatsApp Business API (Meta)
 */
async function sendViaWhatsAppAPI(
  to: string,
  message: string
): Promise<WhatsAppServiceResponse> {
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

  if (!apiToken || !phoneNumberId) {
    console.error('❌ WhatsApp Business API credentials not configured');
    return {
      success: false,
      error: 'WhatsApp service not configured. Please set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables.',
    };
  }

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace('+', ''), // Remove + for WhatsApp API
        type: 'text',
        text: {
          body: message,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp API error:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to send WhatsApp message',
      };
    }

    console.log(`✅ WhatsApp message sent via WhatsApp Business API. ID: ${data.messages?.[0]?.id}`);
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error: any) {
    console.error('❌ WhatsApp API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message via WhatsApp Business API',
    };
  }
}

/**
 * Format welcome message for vendor registration
 */
export function formatVendorWelcomeMessage(
  ownerName: string,
  shopCategory: string,
  shopName: string
): string {
  return `Dear ${ownerName} ji, thank you for enrolling your ${shopCategory} ${shopName} With Thru! We are excited to have you on board as part of the Thru Vendors Program. We are launching soon and we will update you as soon as we're up and running. In case of any queries or suggestions, please reach out to us on this same number. Thank you again!`;
}
