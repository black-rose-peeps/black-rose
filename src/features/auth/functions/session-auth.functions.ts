import { createServerFn } from "@tanstack/react-start";

export const loginAdminSession = createServerFn({ method: "POST" })
  .validator((data: { username: string; password: string }) => {
    if (typeof data?.username !== "string" || typeof data?.password !== "string") {
      throw new Error("Username and password are required.");
    }
    return { username: data.username, password: data.password };
  })
  .handler(async ({ data }) => {
    const { sessionAuth } = await import("../server/session-auth.server");
    return sessionAuth.loginAdminSession(data);
  });

export const validateAdminSession = createServerFn({ method: "POST" }).handler(async () => {
  const { sessionAuth } = await import("../server/session-auth.server");
  return sessionAuth.validateAdminSession();
});

export const logoutAdminSession = createServerFn({ method: "POST" }).handler(async () => {
  const { sessionAuth } = await import("../server/session-auth.server");
  await sessionAuth.logoutAdminSession();
});

export const logoutMemberSession = createServerFn({ method: "POST" }).handler(async () => {
  const { sessionAuth } = await import("../server/session-auth.server");
  await sessionAuth.logoutMemberSession();
});
