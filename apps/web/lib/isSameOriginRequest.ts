import { WEBAPP_URL } from "@calcom/lib/constants";

/**
 * Guards state-changing route handlers against cross-site request forgery.
 *
 * Route handlers do not get the origin check Next.js applies to server actions, and the
 * session cookie is issued with SameSite=None in production (so widgets can authenticate
 * inside iframes), which means the browser attaches it to cross-site form posts too.
 * Without this check, a page on any origin could submit a form that performs an action as
 * the signed-in user.
 *
 * Requests with no Origin header are rejected: browsers send it on every form post, so an
 * absent header means the request did not come from the app's own UI.
 */
export const isSameOriginRequest = (request: Request, appUrl: string = WEBAPP_URL): boolean => {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
};
