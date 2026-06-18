import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

import "./server/server-functions";
import { parseMemberSessionCookie } from "@/features/auth/server/member-session-cookie";
import { renderErrorPage } from "./lib/error-page";
import { resolveSiteOriginFromRequest } from "./lib/site-meta";
import { runWithRequestSiteOrigin } from "./lib/site-meta-request.server";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const siteOriginMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const origin = resolveSiteOriginFromRequest(request);
    return runWithRequestSiteOrigin(origin, () => next());
  },
);

const memberSessionMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const memberId = parseMemberSessionCookie(request.headers.get("cookie"));
    return next({ context: { memberId } });
  },
);

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, errorMiddleware, siteOriginMiddleware, memberSessionMiddleware],
}));
