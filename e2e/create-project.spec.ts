import { test, expect, type Page } from "@playwright/test";

/**
 * Ouroboros — Create New Project E2E Flow
 *
 * Replays the full project-creation wizard:
 *   Home → Name → Template → Chat → (optional) wait for agent response
 *
 * Selectors sourced from:
 *   ouroboros-backend/.claude/flows/create-project-flow.json
 *
 * Run:
 *   npx playwright test e2e/create-project.spec.ts --headed
 */

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const BASE_URL = "http://localhost:3000";

/**
 * API key must be set via OUROBOROS_API_KEY env var.
 * Run: OUROBOROS_API_KEY=sk-ant-... npx playwright test
 */
const API_KEY = process.env.OUROBOROS_API_KEY ?? "";

interface ProjectConfig {
  name: string;
  template: "entropy" | "price" | "custom";
  messages: string[];
}

const DEFAULT_PROJECT: ProjectConfig = {
  name: `E2E Test ${Date.now()}`,
  template: "entropy",
  messages: [
    "Let's build a Coin Flip game!",
    "ETH with variable amounts. Double the bet if you win. Keep it simple and just build it!",
  ],
};

/* ------------------------------------------------------------------ */
/*  Selectors (xpath + css fallbacks)                                  */
/* ------------------------------------------------------------------ */

const SEL = {
  // Step 1 — Home
  createProjectBtn: 'button:has-text("Create new project")',

  // Step 2 — Name
  nameInput: 'input[placeholder="My Pyth Game"]',
  nextBtn: 'button:has-text("Next")',

  // Step 3 — Template
  templateCard: (t: string) => {
    const labels: Record<string, string> = {
      entropy: "Entropy Game",
      price: "Price Game",
      custom: "Custom Game",
    };
    return `button:has-text("${labels[t]}")`;
  },

  // Step 4 — Chat
  chatInput: 'textarea[placeholder="Describe what you want to build or fix..."]',
  sendBtn: 'button[type="submit"]:has-text("Send")',
  stopBtn: 'button:has-text("Stop")',

  // Tabs
  activityTab: 'button:has-text("Activity")',
  fileTab: 'button:has-text("File")',
  contractTab: 'button:has-text("Contract")',

  // Header
  connectionStatus: 'text=/Connected|Disconnected/',
  projectSelector: (name: string) => `header button:has-text("${name}")`,

  // Step 5 — Deploy result
  deployBtn: 'button:has-text("Deploy")',
  basescanLink: 'a[href*="basescan"]',
  deployedContract: 'text="Deployed Contract"',
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function sendChatMessage(page: Page, message: string) {
  const input = page.locator(SEL.chatInput);
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await input.fill(message);
  await page.locator(SEL.sendBtn).click();
}

async function waitForAgentResponse(page: Page, timeout = 30_000) {
  // Wait until the stop button disappears (agent finished responding)
  // or timeout — whichever comes first
  try {
    await page.locator(SEL.stopBtn).waitFor({ state: "visible", timeout: 5_000 });
    await page.locator(SEL.stopBtn).waitFor({ state: "hidden", timeout });
  } catch {
    // Stop button may never appear if agent responds instantly
  }
}

/* ------------------------------------------------------------------ */
/*  Test                                                               */
/* ------------------------------------------------------------------ */

test.describe("Create New Project Flow", () => {
  test.setTimeout(120_000); // agent can take a while

  let config: ProjectConfig;

  test.beforeEach(async ({ page }) => {
    config = { ...DEFAULT_PROJECT, name: `E2E Test ${Date.now()}` };

    // Inject API key into localStorage before any navigation.
    // Playwright requires a page load first to set storage on the right origin.
    await page.goto(BASE_URL);
    if (API_KEY) {
      await page.evaluate((key) => {
        localStorage.setItem("ouroboros_api_key", key);
      }, API_KEY);
    }
    // Reload so the app picks up the key
    await page.reload();
    // Wait for DOM to be ready (don't use networkidle — WebSocket keeps network busy)
    await page.waitForLoadState("domcontentloaded");
  });

  test("Step 1 → Home page shows Create New Project button", async ({ page }) => {
    const btn = page.locator(SEL.createProjectBtn);
    await expect(btn).toBeVisible();
  });

  test("Full flow: create project, pick template, chat with agent", async ({ page }) => {
    // ---- Step 1: Home → click Create New Project ----
    await page.locator(SEL.createProjectBtn).click();

    // ---- Step 2: Name the project ----
    const nameInput = page.locator(SEL.nameInput);
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill(config.name);
    await page.locator(SEL.nextBtn).click();

    // ---- Step 3: Choose template ----
    const templateBtn = page.locator(SEL.templateCard(config.template));
    await expect(templateBtn).toBeVisible({ timeout: 5_000 });
    await templateBtn.click();

    // ---- Step 4: Chat page loaded ----
    const chatInput = page.locator(SEL.chatInput);
    await expect(chatInput).toBeVisible({ timeout: 15_000 });

    // Verify we're on the chat page
    await expect(page).toHaveURL(/\/chat\?project=/);

    // Verify project name appears in header
    await expect(page.locator(SEL.projectSelector(config.name))).toBeVisible();

    // Wait for WebSocket connection
    await expect(page.locator("text=Connected")).toBeVisible({ timeout: 10_000 });

    // Wait for initial agent message
    await waitForAgentResponse(page);

    // ---- Send first message ----
    await sendChatMessage(page, config.messages[0]);
    await waitForAgentResponse(page);

    // ---- Send second message (build instructions) ----
    await sendChatMessage(page, config.messages[1]);

    // ---- Step 5: Wait for agent to build & check Activity tab ----
    const activityTab = page.locator(SEL.activityTab);
    await expect(activityTab).toBeVisible();

    // Wait for agent to finish (longer timeout since it's building)
    await waitForAgentResponse(page, 90_000);

    // Take a screenshot of the final state
    await page.screenshot({ path: "e2e/screenshots/create-project-final.png" });
  });

  test("Verify template options are displayed", async ({ page }) => {
    await page.locator(SEL.createProjectBtn).click();

    const nameInput = page.locator(SEL.nameInput);
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Template Check " + Date.now());
    await page.locator(SEL.nextBtn).click();

    // All three templates should be visible
    await expect(page.locator(SEL.templateCard("entropy"))).toBeVisible();
    await expect(page.locator(SEL.templateCard("price"))).toBeVisible();
    await expect(page.locator(SEL.templateCard("custom"))).toBeVisible();
  });

  test("Cancel returns to home", async ({ page }) => {
    await page.locator(SEL.createProjectBtn).click();
    await expect(page.locator(SEL.nameInput)).toBeVisible();

    // Click Cancel
    await page.locator('text="Cancel"').click();

    // Should be back on home with project list
    await expect(page.locator(SEL.createProjectBtn)).toBeVisible();
  });
});
