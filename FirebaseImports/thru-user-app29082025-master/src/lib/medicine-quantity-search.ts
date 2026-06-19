export interface MedicineQuantitySuggestion {
  quantity: number;
  unit: string;
  label: string;
  isPopular?: boolean;
}

export interface MedicineDosageSuggestion {
  label: string;
  value: string;
  isPopular?: boolean;
}

export interface MedicineSearchSuggestions {
  strengths: MedicineDosageSuggestion[];
  packSizes: MedicineQuantitySuggestion[];
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
};

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function packSuggestionKey(s: MedicineQuantitySuggestion): string {
  return `${s.quantity}|${s.unit}|${s.label}`.toLowerCase();
}

function addPackSuggestion(
  map: Map<string, MedicineQuantitySuggestion>,
  suggestion: MedicineQuantitySuggestion
) {
  const key = packSuggestionKey(suggestion);
  if (!map.has(key)) map.set(key, suggestion);
}

function addStrengthSuggestion(
  map: Map<string, MedicineDosageSuggestion>,
  suggestion: MedicineDosageSuggestion
) {
  const key = suggestion.value.toLowerCase();
  if (!map.has(key)) map.set(key, suggestion);
}

function isCommonMgStrength(value: number): boolean {
  return [5, 10, 20, 25, 50, 100, 250, 325, 500, 650, 1000].includes(value);
}

export function extractDosageStrengths(texts: string[]): MedicineDosageSuggestion[] {
  const map = new Map<string, MedicineDosageSuggestion>();
  const combined = texts.join(' ');

  const patterns: Array<{
    regex: RegExp;
    unit: string;
    max: number;
    format: (value: string) => string;
  }> = [
    {
      regex: /(\d+(?:\.\d+)?)\s*mg\b/gi,
      unit: 'mg',
      max: 2000,
      format: (v) => `${v} mg`,
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*mcg\b/gi,
      unit: 'mcg',
      max: 1000,
      format: (v) => `${v} mcg`,
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*iu\b/gi,
      unit: 'IU',
      max: 100000,
      format: (v) => `${v} IU`,
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*%\s*(?:w\/w|w\/v)?/gi,
      unit: '%',
      max: 100,
      format: (v) => `${v}%`,
    },
  ];

  for (const { regex, unit, max, format } of patterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(regex.source, regex.flags);
    while ((match = re.exec(combined)) !== null) {
      const num = parseFloat(match[1]);
      if (num <= 0 || num > max) continue;
      const label = format(match[1]);
      const value = unit === '%' ? `${match[1]}%` : `${match[1]}${unit}`;
      addStrengthSuggestion(map, {
        label,
        value,
        isPopular: unit === 'mg' ? isCommonMgStrength(num) : false,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const pop = Number(b.isPopular) - Number(a.isPopular);
      if (pop !== 0) return pop;
      return parseFloat(a.value) - parseFloat(b.value);
    })
    .slice(0, 8);
}

export function extractMedicinePackSizes(texts: string[]): MedicineQuantitySuggestion[] {
  const map = new Map<string, MedicineQuantitySuggestion>();
  const combined = texts.join(' ');

  const patterns: Array<{
    regex: RegExp;
    build: (match: RegExpExecArray) => MedicineQuantitySuggestion | null;
  }> = [
    {
      regex: /(\d+)\s*['']?s?\s*strips?\s*(?:of\s+)?(\d+)\s*tabs?/gi,
      build: (m) => ({
        quantity: parseInt(m[1], 10),
        unit: 'strip',
        label: `${m[1]} strip${m[1] === '1' ? '' : 's'} (${m[2]} tablets each)`,
        isPopular: m[1] === '1',
      }),
    },
    {
      regex: /strip\s+of\s+(\d+)\s*tabs?/gi,
      build: (m) => ({
        quantity: 1,
        unit: 'strip',
        label: `1 strip (${m[1]} tablets)`,
        isPopular: true,
      }),
    },
    {
      regex: /(\d+)\s*tabs?(?:lets?)?(?:\s*strip)?/gi,
      build: (m) => {
        const count = parseInt(m[1], 10);
        if (count < 2 || count > 200) return null;
        return {
          quantity: 1,
          unit: 'strip',
          label: `${count} tablets strip`,
          isPopular: count === 10 || count === 15,
        };
      },
    },
    {
      regex: /(\d+)\s*caps?(?:ules?)?/gi,
      build: (m) => {
        const count = parseInt(m[1], 10);
        if (count < 2 || count > 200) return null;
        return {
          quantity: 1,
          unit: 'strip',
          label: `${count} capsules strip`,
        };
      },
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*ml\b/gi,
      build: (m) => ({
        quantity: 1,
        unit: 'bottle',
        label: `${m[1]} ml bottle`,
        isPopular: m[1] === '60' || m[1] === '100',
      }),
    },
    {
      regex: /(\d+)\s*gm?\b/gi,
      build: (m) => {
        const count = parseInt(m[1], 10);
        if (count < 5 || count > 1000) return null;
        return {
          quantity: 1,
          unit: 'pack',
          label: `${count} g pack`,
        };
      },
    },
    {
      regex: /pack\s+of\s+(\d+)/gi,
      build: (m) => ({
        quantity: 1,
        unit: 'pack',
        label: `Pack of ${m[1]}`,
      }),
    },
    {
      regex: /(\d+)\s*x\s*(\d+)\s*(?:tabs?|tablets?|caps?)/gi,
      build: (m) => ({
        quantity: 1,
        unit: 'box',
        label: `Box ${m[1]}×${m[2]} tablets`,
      }),
    },
  ];

  for (const { regex, build } of patterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(regex.source, regex.flags);
    while ((match = re.exec(combined)) !== null) {
      const suggestion = build(match);
      if (suggestion) addPackSuggestion(map, suggestion);
    }
  }

  const results = Array.from(map.values());
  results.sort((a, b) => Number(b.isPopular) - Number(a.isPopular));
  return results.slice(0, 6);
}

async function fetchGoogleShoppingTexts(medicineName: string): Promise<string[]> {
  const query = `${medicineName} medicine tablet strip syrup mg pharmacy India`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop&hl=en`;

  try {
    const response = await fetch(searchUrl, { headers: BROWSER_HEADERS });
    if (!response.ok) return [];

    const html = await response.text();
    const texts: string[] = [];

    const titleMatches = html.matchAll(/<h3[^>]*>([^<]{4,120})<\/h3>/gi);
    for (const match of titleMatches) {
      texts.push(decodeHtml(match[1]));
    }

    const spanMatches = html.matchAll(/<span[^>]*>([^<]{8,160})<\/span>/gi);
    for (const match of spanMatches) {
      const text = decodeHtml(match[1]);
      if (/\d+\s*(mg|mcg|ml|tab|cap|strip|gm?|pack)/i.test(text)) {
        texts.push(text);
      }
    }

    return texts;
  } catch {
    return [];
  }
}

async function fetchGoogleWebTexts(medicineName: string): Promise<string[]> {
  const query = `${medicineName} medicine dosage mg strip tablets ml 1mg pharmeasy`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;

  try {
    const response = await fetch(searchUrl, { headers: BROWSER_HEADERS });
    if (!response.ok) return [];

    const html = await response.text();
    const texts: string[] = [];

    const snippetMatches = html.matchAll(
      /<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>([^<]{10,200})<\/div>/gi
    );
    for (const match of snippetMatches) {
      texts.push(decodeHtml(match[1]));
    }

    const genericSpans = html.matchAll(/<span[^>]*>([^<]{10,200})<\/span>/gi);
    for (const match of genericSpans) {
      const text = decodeHtml(match[1]);
      if (/\d+\s*(mg|mcg|ml|tab|cap|strip|tablet|gm?|pack|bottle|iu)/i.test(text)) {
        texts.push(text);
      }
    }

    return texts;
  } catch {
    return [];
  }
}

export async function searchMedicineOptionsFromGoogle(
  medicineName: string
): Promise<MedicineSearchSuggestions> {
  const trimmed = medicineName.trim();
  if (!trimmed) return { strengths: [], packSizes: [] };

  const [shoppingTexts, webTexts] = await Promise.all([
    fetchGoogleShoppingTexts(trimmed),
    fetchGoogleWebTexts(trimmed),
  ]);

  const corpus = [trimmed, ...shoppingTexts, ...webTexts];
  const strengths = extractDosageStrengths(corpus);
  const packSizes = extractMedicinePackSizes(corpus);

  return {
    strengths,
    packSizes,
  };
}

/** @deprecated use searchMedicineOptionsFromGoogle */
export async function searchMedicineQuantitiesFromGoogle(
  medicineName: string
): Promise<MedicineQuantitySuggestion[]> {
  const result = await searchMedicineOptionsFromGoogle(medicineName);
  return result.packSizes;
}
