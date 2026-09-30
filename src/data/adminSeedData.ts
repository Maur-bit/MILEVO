// src/data/adminSeedData.ts
// Demo data for the admin portal only.

export const PLATFORM_STATS = {
  totalUsers: 4820,
  activeMerchants: 4,
  products: 6,
  offers: 15,
  clicks30d: 2140,
  pendingMatches: 3,
  pendingReviews: 2,
};

export const PENDING_MATCHES = [
  {
    id: 'match-1',
    candidates: ['Apple iPhone 15 128GB Black — Store A feed', 'iPhone 15 Black 128 GB — Store B feed', 'Apple Iphone15 128GB Black — Store C feed'],
    suggested: 'iPhone 15 128GB Black',
    confidence: 0.94,
  },
  {
    id: 'match-2',
    candidates: ['Samsung Galaxy S24 Ultra 512GB Titanium — Store B feed', 'Galaxy S24 Ultra 512GB Titanium Gray — Store D feed'],
    suggested: 'Galaxy S24 Ultra 512GB Titanium',
    confidence: 0.81,
  },
  {
    id: 'match-3',
    candidates: ['Sony WH-1000XM5 Black — Store A feed', 'Sony WH1000XM5 — Store C feed'],
    suggested: null,
    confidence: 0.42,
  },
];

export const MERCHANT_FEED_STATUS = [
  { store: 'Jumia Ghana', lastRun: '2026-09-26T22:04:00Z', status: 'success', errors: 0 },
  { store: 'Telefonika', lastRun: '2026-09-26T22:04:00Z', status: 'partial', errors: 23 },
  { store: 'Franko Trading', lastRun: '2026-09-26T18:00:00Z', status: 'success', errors: 2 },
  { store: 'CompuGhana', lastRun: '2026-09-25T09:00:00Z', status: 'failed', errors: 1 },
];

export const PENDING_REVIEWS = [
  { type: 'product', target: 'iPhone 15 128GB Black', rating: 1, title: 'Terrible!!!', body: 'This store is a scam dont buy garbage phone', flagged: 'possible fake / abusive language' },
  { type: 'store', target: 'Franko Trading', rating: 5, title: 'Best store ever', body: 'Best store ever best store ever best store ever', flagged: 'possible spam (repetitive text)' },
];

export const CLICKS_BY_STORE = [
  { store: 'Jumia Ghana', clicks: 890 },
  { store: 'Telefonika', clicks: 640 },
  { store: 'Franko Trading', clicks: 410 },
  { store: 'CompuGhana', clicks: 200 },
];
