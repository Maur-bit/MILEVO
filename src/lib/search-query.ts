export interface ParsedSearchQuery {
  terms: string[];
  minimumPrice?: number;
  maximumPrice?: number;
  variantTokens: string[];
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  let remaining = query;
  let minimumPrice: number | undefined;
  let maximumPrice: number | undefined;

  const maximum = remaining.match(/\b(?:under|below|less than|at most|max(?:imum)?)\s*(?:ghs|gh₵|₵)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (maximum) {
    maximumPrice = Number(maximum[1].replaceAll(',', ''));
    remaining = remaining.replace(maximum[0], ' ');
  }
  const minimum = remaining.match(/\b(?:over|above|more than|at least|min(?:imum)?)\s*(?:ghs|gh₵|₵)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (minimum) {
    minimumPrice = Number(minimum[1].replaceAll(',', ''));
    remaining = remaining.replace(minimum[0], ' ');
  }

  const variantTokens = [...query.matchAll(/\b\d+(?:\.\d+)?\s?(?:gb|tb|inch(?:es)?|in|cm|mm|kg|g|ml|l)\b/gi)]
    .map(([token]) => normalizeSearchText(token).replaceAll(' ', ''));
  const terms = normalizeSearchText(remaining).split(/\s+/).filter(Boolean);
  return {
    terms,
    variantTokens,
    ...(minimumPrice === undefined ? {} : { minimumPrice }),
    ...(maximumPrice === undefined ? {} : { maximumPrice }),
  };
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function matchesSearchTerms(text: string, terms: string[]): boolean {
  const normalized = normalizeSearchText(text);
  return terms.every((term) => normalized.includes(term));
}

export function matchingVariantIndexes(labels: string[], tokens: string[]): number[] {
  if (tokens.length === 0) return labels.map((_, index) => index);
  return labels.flatMap((label, index) => {
    const normalized = normalizeSearchText(label).replaceAll(' ', '');
    return tokens.every((token) => normalized.includes(token)) ? [index] : [];
  });
}
