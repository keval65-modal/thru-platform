/**
 * WhatsApp Cloud API (Meta WABA) — approved template messages only.
 * Do not send free-form text; use pre-approved templates from Business Manager.
 *
 * Env: META_ACCESS_TOKEN, META_PHONE_NUMBER_ID
 */

import { templateLanguageCandidates } from '@/services/whatsapp/waba-utils';

export const META_WHATSAPP_GRAPH_VERSION = 'v22.0';

/** Successful send shape from Graph `/{phone-number-id}/messages`. */
export type MetaWhatsAppMessagesSuccess = {
  messaging_product?: string;
  contacts?: { input?: string; wa_id?: string }[];
  messages?: { id: string; message_status?: string }[];
};

/** Error shape returned by Graph on non-2xx. */
export type MetaWhatsAppMessagesError = {
  error?: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    fbtrace_id?: string;
  };
};

export type MetaWhatsAppMessagesResponse = MetaWhatsAppMessagesSuccess & MetaWhatsAppMessagesError;

/** Single template variable for the `body` component (Graph `parameters` item). */
export type TemplateBodyParameter =
  | { type: 'text'; text: string }
  | { type: 'currency'; currency: { fallback_value: string; code: string; amount_1000: number } }
  | { type: 'date_time'; date_time: { fallback_value: string } }
  | { type: 'image'; image: { link: string } }
  | { type: 'document'; document: { link: string; filename?: string } }
  | { type: 'video'; video: { link: string } };

/** Pass strings for simple `{{1}}` style body vars, or full Graph parameter objects. */
export type TemplateBodyParameterInput = string | TemplateBodyParameter;

export type SendTemplateMessageInput = {
  to: string;
  templateName: string;
  languageCode: string;
  /** Dynamic body variables, in order. Omitted or empty if the template has no body placeholders. */
  parameters?: TemplateBodyParameterInput[];
};

export type SendTemplateMessageResult = {
  ok: boolean;
  status: number;
  /** Locale that succeeded, or the last locale attempted. */
  languageCode: string;
  /** Full parsed JSON from Graph (success or error payload). */
  data: MetaWhatsAppMessagesResponse | Record<string, unknown>;
};

function normalizeBodyParameters(
  parameters: TemplateBodyParameterInput[] | undefined
): TemplateBodyParameter[] | undefined {
  if (!parameters?.length) {
    return undefined;
  }
  return parameters.map((p) =>
    typeof p === 'string' ? ({ type: 'text', text: p } satisfies TemplateBodyParameter) : p
  );
}

function buildRequestPayload(
  input: SendTemplateMessageInput,
  languageCode: string
): Record<string, unknown> {
  const graphParameters = normalizeBodyParameters(input.parameters);
  const components =
    graphParameters && graphParameters.length > 0
      ? [{ type: 'body' as const, parameters: graphParameters }]
      : undefined;

  return {
    messaging_product: 'whatsapp',
    to: input.to.replace(/\D/g, ''),
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  };
}

function graphError(data: unknown): MetaWhatsAppMessagesError['error'] | undefined {
  if (!data || typeof data !== 'object' || !('error' in data)) return undefined;
  const err = (data as MetaWhatsAppMessagesError).error;
  return err && typeof err === 'object' ? err : undefined;
}

/** Retry with another locale when the template exists but this translation does not. */
export function isRetryableTemplateLocaleError(result: SendTemplateMessageResult): boolean {
  if (result.ok) return false;
  const err = graphError(result.data);
  const code = err?.code;
  const msg = (err?.message || '').toLowerCase();
  if (code === 132001 || code === 132005 || code === 132015) return true;
  if (msg.includes('template name does not exist in the translation')) return true;
  if (msg.includes('template does not exist in language')) return true;
  if (msg.includes('locale')) return true;
  return false;
}

function logTemplateFailure(
  context: { templateName: string; toDigits: string; status: number; locale: string },
  data: unknown
): void {
  const err = graphError(data);

  console.error('[whatsapp-cloud] Template message failed', {
    template: context.templateName,
    locale: context.locale,
    toSuffix: context.toDigits.slice(-4),
    httpStatus: context.status,
    graphMessage: err?.message,
    graphCode: err?.code,
    graphSubcode: err?.error_subcode,
    fbtrace_id: err?.fbtrace_id,
    error_user_msg: err?.error_user_msg,
    raw: data,
  });
}

function logConfigOrValidationFailure(message: string, extra?: Record<string, unknown>): void {
  console.error('[whatsapp-cloud] ' + message, extra ?? {});
}

async function sendTemplateMessageOnce(
  input: SendTemplateMessageInput,
  languageCode: string,
  token: string,
  phoneNumberId: string,
  toDigits: string
): Promise<SendTemplateMessageResult> {
  const url = `https://graph.facebook.com/${META_WHATSAPP_GRAPH_VERSION}/${phoneNumberId}/messages`;
  const payload = buildRequestPayload(input, languageCode);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let data: MetaWhatsAppMessagesResponse | Record<string, unknown>;
  try {
    data = rawText ? (JSON.parse(rawText) as MetaWhatsAppMessagesResponse) : {};
  } catch {
    logTemplateFailure(
      { templateName: input.templateName, toDigits, status: res.status, locale: languageCode },
      { parseError: true, bodySnippet: rawText.slice(0, 500) }
    );
    return {
      ok: false,
      status: res.status,
      languageCode,
      data: {
        error: {
          message: 'Failed to parse JSON response from WhatsApp Cloud API',
          bodySnippet: rawText.slice(0, 500),
        },
      },
    };
  }

  if (!res.ok) {
    logTemplateFailure(
      { templateName: input.templateName, toDigits, status: res.status, locale: languageCode },
      data
    );
    return { ok: false, status: res.status, languageCode, data };
  }

  return { ok: true, status: res.status, languageCode, data };
}

/**
 * Send a pre-approved WhatsApp template via Meta Cloud API.
 * Tries fallback locales when Meta reports a missing translation.
 */
export async function sendTemplateMessage(
  input: SendTemplateMessageInput
): Promise<SendTemplateMessageResult> {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    const msg =
      'Missing META_ACCESS_TOKEN or META_PHONE_NUMBER_ID. Configure these in the deployment environment.';
    logConfigOrValidationFailure(msg);
    return {
      ok: false,
      status: 0,
      languageCode: input.languageCode,
      data: { error: { message: msg } },
    };
  }

  const toDigits = input.to.replace(/\D/g, '');
  if (!toDigits || toDigits.length < 8) {
    const msg = 'Invalid recipient phone: expected E.164 or enough digits for WhatsApp.';
    logConfigOrValidationFailure(msg, { template: input.templateName });
    return {
      ok: false,
      status: 0,
      languageCode: input.languageCode,
      data: { error: { message: msg } },
    };
  }

  const locales = templateLanguageCandidates(input.languageCode);
  console.log('[whatsapp-cloud] Sending template', {
    template: input.templateName,
    locales,
    paramCount: input.parameters?.length ?? 0,
    toSuffix: toDigits.slice(-4),
  });

  let lastResult: SendTemplateMessageResult | null = null;

  try {
    for (const locale of locales) {
      const result = await sendTemplateMessageOnce(input, locale, token, phoneNumberId, toDigits);
      if (result.ok) {
        if (locale !== input.languageCode) {
          console.log('[whatsapp-cloud] Sent using fallback locale', {
            template: input.templateName,
            requested: input.languageCode,
            used: locale,
          });
        }
        return result;
      }
      lastResult = result;
      if (!isRetryableTemplateLocaleError(result)) {
        return result;
      }
    }
    return lastResult!;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[whatsapp-cloud] Network or runtime error sending template', {
      template: input.templateName,
      toSuffix: toDigits.slice(-4),
      error: message,
    });
    return {
      ok: false,
      status: 0,
      languageCode: input.languageCode,
      data: { error: { message } },
    };
  }
}
