import { test, expect } from "../fixtures/app.fixture";

test.describe("Black Rose public landing page", () => {
  test("@smoke displays the main community call to action", async ({ page, homePage }) => {
    await homePage.goto();

    await expect(page).toHaveTitle(/Black Rose.*FIGHT AS ONE/i);
    await expect(homePage.heroHeading).toBeVisible();
    await expect(homePage.getStartedLink).toBeVisible();
    await expect(homePage.joinUsLink).toBeVisible();
  });

  test("@smoke guest can open member access", async ({ page, homePage, loginPage }) => {
    await homePage.goto();
    await homePage.getStartedLink.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.memberHeading).toBeVisible();
  });

  test("guest can navigate to tournaments on desktop and mobile", async ({ page, homePage }) => {
    await homePage.goto();
    await homePage.navigateFromHeader("Tournaments");

    await expect(page).toHaveURL(/\/tournaments\/?$/);
    await expect(page.getByRole("heading", { name: "All Tournaments" })).toBeVisible();
  });
});
