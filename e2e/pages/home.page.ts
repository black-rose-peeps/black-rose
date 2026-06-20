import type { Locator, Page } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly heroHeading: Locator;
  readonly getStartedLink: Locator;
  readonly joinUsLink: Locator;
  readonly mobileMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroHeading = page.getByRole("heading", { name: /fight as one/i });
    this.getStartedLink = page.getByRole("link", { name: /get started/i });
    this.joinUsLink = page.getByRole("link", { name: /join us/i });
    this.mobileMenuButton = page.getByRole("button", { name: /open navigation menu/i });
  }

  async goto() {
    await this.page.goto("/");
  }

  async navigateFromHeader(label: "Tournaments" | "Champions" | "Community") {
    if (await this.mobileMenuButton.isVisible()) {
      await this.mobileMenuButton.click();
      await this.page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: label, exact: true })
        .click();
      return;
    }

    await this.page
      .locator("header nav")
      .getByRole("link", { name: label, exact: true })
      .click();
  }
}
