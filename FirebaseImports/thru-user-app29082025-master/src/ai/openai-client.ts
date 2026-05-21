import { Buffer, File } from 'node:buffer';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('[OpenAI] OPENAI_API_KEY is not configured. Menu extraction will fail.');
}

export const openAiMenuModel = process.env.OPENAI_MENU_MODEL ?? 'gpt-4o-mini';

export const openaiClient = apiKey
  ? new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  : null;

export async function uploadMenuPdfToOpenAI(buffer: Buffer, fileName: string, mimeType: string) {
  if (!openaiClient) {
    throw new Error('OPENAI_API_KEY is not configured. Unable to upload menu PDF.');
  }

  const file = await openaiClient.files.create({
    file: new File([buffer], fileName, { type: mimeType }),
    purpose: 'vision',
  });

  return file.id;
}

export async function deleteMenuPdfFromOpenAI(fileId: string) {
  if (!openaiClient) {
    return;
  }

  try {
    await openaiClient.files.del(fileId);
  } catch (error) {
    console.warn('[OpenAI] Failed to delete uploaded file:', (error as Error)?.message);
  }
}
import { Buffer, File } from 'node:buffer';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('[OpenAI] OPENAI_API_KEY is not configured. Menu extraction will fail.');
}

export const openAiMenuModel = process.env.OPENAI_MENU_MODEL ?? 'gpt-4o-mini';

export const openaiClient = apiKey
  ? new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  : null;

export async function uploadMenuPdfToOpenAI(buffer: Buffer, fileName: string, mimeType: string) {
  if (!openaiClient) {
    throw new Error('OPENAI_API_KEY is not configured. Unable to upload menu PDF.');
  }

  const file = await openaiClient.files.create({
    file: new File([buffer], fileName, { type: mimeType }),
    purpose: 'vision',
  });

  return file.id;
}

export async function deleteOpenAIFile(fileId: string) {
  if (!openaiClient) {
    return;
  }

  try {
    await openaiClient.files.del(fileId);
  } catch (error) {
    console.warn('[OpenAI] Failed to delete uploaded file:', (error as Error)?.message);
  }
}

