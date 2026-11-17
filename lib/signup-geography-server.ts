import 'server-only';
import { normalizeSignupGeography, type SignupGeography } from './signup-geography';

// Only Vercel's reviewed production ingress on these exact domains may provide
// location estimates. Never trust a user-supplied host or redirect as provenance.
const productionOrigins = new Set(['https://www.behzadgh.com', 'https://behzadgh.com']);
const previewHost = /^[a-z0-9-]+\.vercel\.app$/;

/** Server configuration attests reviewed ingress; it is not cryptographic proof.
 * The legacy SIGNUP_GEOGRAPHY_ENABLED flag cannot enable collection.
 */
export function signupGeographyCollectionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SIGNUP_GEOGRAPHY_COLLECTION_ENABLED !== '1' || env.VERCEL !== '1') return false;
  if (env.VERCEL_ENV === 'production') {
    return env.SIGNUP_GEOGRAPHY_INGRESS === 'reviewed-vercel-direct-production';
  }
  return env.VERCEL_ENV === 'preview'
    && env.SIGNUP_GEOGRAPHY_INGRESS === 'reviewed-vercel-direct'
    && previewHost.test(env.VERCEL_URL ?? '');
}

export function signupRequestGeography(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): SignupGeography | undefined {
  if (!signupGeographyCollectionEnabled(env)) return undefined;

  try {
    const url = new URL(request.url);
    if (url.username || url.password || url.protocol !== 'https:') return undefined;
    if (env.VERCEL_ENV === 'production') {
      if (!productionOrigins.has(url.origin)) return undefined;
    } else if (url.origin !== `https://${env.VERCEL_URL}`) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return normalizeSignupGeography(
    request.headers.get('x-vercel-ip-country'),
    request.headers.get('x-vercel-ip-country-region')
  );
}
