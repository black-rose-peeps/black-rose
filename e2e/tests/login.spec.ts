import { test, expect } from "../fixtures/app.fixture";

test.describe("Black Rose authentication entry points", () => {
  test("@smoke member access explains Discord authentication", async ({ loginPage }) => {
    await loginPage.gotoMemberAccess();

    await expect(loginPage.memberHeading).toBeVisible();
    await expect(loginPage.discordButton).toBeVisible();
    await expect(loginPage.backToHomeLink).toBeVisible();
  });

  test("legacy registration URL redirects to member access", async ({ page, loginPage }) => {
    await page.goto("/register");

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.memberHeading).toBeVisible();
  });

  test("admin console validates required credentials without calling the backend", async ({
    page,
    loginPage,
  }) => {
    await loginPage.gotoAdminConsole();

    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await loginPage.signInButton.click();

    await expect(page.getByText("Enter your username and password.", { exact: true })).toBeVisible();
  });

  test("admin can return to Discord member access", async ({ page, loginPage }) => {
    await loginPage.gotoAdminConsole();
    await loginPage.backToMemberAccessButton.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.memberHeading).toBeVisible();
  });
});
