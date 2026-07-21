/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Express 4 does not forward a rejected Promise from an async route
 * handler to `next(err)` automatically — an unhandled rejection inside an
 * `async (req, res) => {...}` handler becomes an unhandledRejection event
 * at the process level, which (as of Node 15+) terminates the entire
 * process by default. That means a single bad request — a database
 * constraint violation, a network blip, anything — could take down the
 * server for every connected user, not just fail the one request.
 *
 * This wraps every HTTP-method registration on a Router so any thrown
 * error or rejected Promise in a handler is caught and routed to
 * `next(err)`, where server.ts's existing error-handling middleware turns
 * it into a proper JSON 500 response instead of an outage.
 *
 * Usage: `const router = wrapAsyncRouter(Router());` — every route
 * defined on it afterwards is automatically covered, including handlers
 * that come after other middleware (e.g. requireAuth).
 */

import type { Router, RequestHandler } from 'express';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

export function wrapAsyncRouter(router: Router): Router {
  for (const method of HTTP_METHODS) {
    const original = (router as any)[method].bind(router);
    (router as any)[method] = (path: string, ...handlers: RequestHandler[]) => {
      const wrapped = handlers.map((handler) => {
        if (typeof handler !== 'function') return handler;
        return (req: any, res: any, next: any) => {
          try {
            const result: any = handler(req, res, next);
            if (result && typeof result.catch === 'function') {
              result.catch(next);
            }
          } catch (err) {
            next(err);
          }
        };
      });
      return original(path, ...wrapped);
    };
  }
  return router;
}
