const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://milevo.com';

export const SITE_URL = new URL(configuredSiteUrl);
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;
