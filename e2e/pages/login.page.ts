import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly memberHeading: Locator;
  readonly discordButton: Locator;
  readonly backToHomeLink: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly backToMemberAccessButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.memberHeading = page.getByRole("heading", { name: "Join Black Rose" });
    this.discordButton = page.getByRole("button", { name: "Continue with Discord" });
    this.backToHomeLink = page.getByRole("link", { name: "Back to home" });
    this.usernameInput = page.getByLabel("Username");
    this.passwordInput = page.getByLabel("Password");
    this.signInButton = page.getByRole("button", { name: "Sign In" });
    this.backToMemberAccessButton = page.getByRole("button", {
      name: /back to member access/i,
    });
  }

  async gotoMemberAccess() {
    await this.page.goto("/login");
  }

  async gotoAdminConsole() {
    await this.page.goto("/login?console=1");
  }

  async submitAdminCredentials(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
