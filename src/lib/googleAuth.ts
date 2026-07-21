/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Google Identity Services (GIS) — Google's own sign-in library, used
 * directly instead of Firebase Auth. This uses the Google Cloud OAuth
 * client you already have configured (VITE_GOOGLE_CLIENT_ID), and its
 * domain restriction is "Authorized JavaScript origins" in Google Cloud
 * Console — a single, standard list, not a separate Firebase project
 * setting that can drift out of sync with where you actually deploy.
 *
 * Produces a signed ID token ("credential") that the backend verifies
 * cryptographically in server/routes/auth.routes.ts before trusting
 * anything in it — the frontend never asserts an identity, it only
 * relays what Google signed.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

function getClientId(): string {
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured — Google sign-in is unavailable.');
  }
  return clientId;
}

/**
 * Renders Google's own sign-in button into the given container element.
 * `onCredential` receives the signed ID token JWT on successful sign-in —
 * pass it straight to authApi.oauthCallback({ credential }).
 */
export async function renderGoogleSignInButton(
  container: HTMLElement,
  onCredential: (credential: string) => void,
  options: { width?: number; text?: 'signin_with' | 'signup_with' | 'continue_with' } = {}
): Promise<void> {
  await loadGoogleScript();
  const clientId = getClientId();

  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onCredential(response.credential),
  });

  window.google!.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'rectangular',
    text: options.text ?? 'signin_with',
    logo_alignment: 'left',
    width: options.width ?? 260,
  });
}
