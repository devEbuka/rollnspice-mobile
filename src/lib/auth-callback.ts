export const MOBILE_AUTH_REDIRECT = 'rollnspicemobile://explore';

export function parseAuthCallback(raw: string) {
  if (raw.length > 8192) throw new Error('Invalid sign-in response.');
  const url = new URL(raw);
  const expected = new URL(MOBILE_AUTH_REDIRECT);
  if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname) {
    throw new Error('Invalid sign-in destination.');
  }
  if (url.searchParams.has('error') || url.hash) throw new Error('Google sign-in was not completed.');
  const code = url.searchParams.get('code');
  const flowId = url.searchParams.get('sb_flow_id');
  if (!code || code.length > 2048 || url.searchParams.getAll('code').length !== 1 ||
      !flowId || url.searchParams.getAll('sb_flow_id').length !== 1 || !/^[a-zA-Z0-9_-]{8,64}$/.test(flowId)) {
    throw new Error('Sign-in expired. Please try again.');
  }
  return { code, flowId };
}
