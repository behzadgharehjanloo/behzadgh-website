import 'server-only';
import {normalizeSignupGeography, type SignupGeography} from './signup-geography';

const productionOrigin = 'https://www.behzadgh.com';
const previewHost = /^[a-z0-9-]+\.vercel\.app$/;

/** Server configuration attests reviewed ingress; it is not cryptographic proof.
 * Set the Production attestation only after the real-domain routing/header tests.
 * Request headers, forwarded hosts and SDK fields cannot establish provenance.
 * The legacy SIGNUP_GEOGRAPHY_ENABLED flag intentionally cannot enable collection.
 */
export function signupGeographyCollectionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
 if (env.SIGNUP_GEOGRAPHY_COLLECTION_ENABLED !== '1' || env.VERCEL !== '1') return false;
 if (env.VERCEL_ENV === 'production') return env.SIGNUP_GEOGRAPHY_INGRESS === 'reviewed-vercel-direct-production';
 return env.VERCEL_ENV === 'preview' && env.SIGNUP_GEOGRAPHY_INGRESS === 'reviewed-vercel-direct'
  && previewHost.test(env.VERCEL_URL ?? '');
}

export function signupRequestGeography(request: Request, env: NodeJS.ProcessEnv = process.env): SignupGeography | undefined {
 if (!signupGeographyCollectionEnabled(env)) return undefined;
 const expectedOrigin = env.VERCEL_ENV === 'production' ? productionOrigin : `https://${env.VERCEL_URL}`;
 try {
  const url = new URL(request.url);
  if (url.origin !== expectedOrigin || url.username || url.password) return undefined;
 } catch { return undefined; }
 return normalizeSignupGeography(request.headers.get('x-vercel-ip-country'), request.headers.get('x-vercel-ip-country-region'));
}
