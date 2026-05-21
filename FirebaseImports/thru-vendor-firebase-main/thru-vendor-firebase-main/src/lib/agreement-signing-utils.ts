export function normalizeName(s: string) {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u0fff\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Typed signature must closely match the merchant legal (owner) name.
 */
export function signatureMatchesLegalName(legalName: string, typed: string): boolean {
  const a = normalizeName(legalName);
  const b = normalizeName(typed);
  if (!b || b.length < 2) return false;
  if (a === b) return true;

  const atokens = a.split(' ').filter((t) => t.length > 0);
  const btokens = b.split(' ').filter((t) => t.length > 0);
  if (atokens.length >= 2 && btokens.length >= 2) {
    const first = atokens[0];
    const last = atokens[atokens.length - 1];
    const hasFirst = btokens.some((t) => t === first || first.startsWith(t) || t.startsWith(first));
    const hasLast = btokens.some(
      (t) => t === last || last.startsWith(t) || t.startsWith(last)
    );
    if (hasFirst && hasLast && b.includes(first) && b.includes(last)) {
      return true;
    }
  }

  const dist = levenshtein(a, b);
  const threshold = Math.max(2, Math.floor(a.length * 0.12));
  return dist <= threshold;
}
