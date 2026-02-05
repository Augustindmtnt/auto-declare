import { chromium, Browser, Page, Locator } from "playwright";
import { readFileSync } from "fs";
import { parse } from "yaml";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getCredentials } from "./credentials.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DeclarationData {
  childName: string;
  monthlySalary: number;
  majoredHoursCount: number;
  majoredHoursAmount: number;
  totalSalary: number;
  workedDays: number;
  maintenanceAllowance: number;
  mealAllowance: number;
}

interface FormMapping {
  pajemploi: {
    urls: {
      home: string;
      declaration: string;
    };
    login: {
      email_label: string;
      password_label: string;
      submit_text: string;
    };
    declaration: {
      monthlySalary_label: string;
      majoredHoursCount_label: string;
      majoredHoursAmount_label: string;
      workedDays_label: string;
      maintenanceAllowance_label: string;
      mealAllowance_label: string;
      submit_text: string;
    };
  };
}

type StatusCallback = (status: string) => void;

function loadFormMapping(): FormMapping {
  const mappingPath = join(__dirname, "form-mapping.yaml");
  const content = readFileSync(mappingPath, "utf-8");
  return parse(content) as FormMapping;
}

function formatNumberForInput(value: number): string {
  // French format: comma as decimal separator
  return value.toFixed(2).replace(".", ",");
}

/**
 * Try multiple strategies to find and fill a field by its label.
 * Playwright's semantic locators are resilient to HTML structure changes.
 */
async function fillFieldByLabel(
  page: Page,
  label: string,
  value: string,
  onStatus: StatusCallback
): Promise<boolean> {
  const strategies: Array<{ name: string; locator: () => Locator }> = [
    // Strategy 1: Standard label association
    { name: "getByLabel", locator: () => page.getByLabel(label, { exact: false }) },
    // Strategy 2: Label contains the text (partial match)
    { name: "label contains", locator: () => page.locator(`label:has-text("${label}") + input, label:has-text("${label}") input`) },
    // Strategy 3: Placeholder text
    { name: "placeholder", locator: () => page.getByPlaceholder(label, { exact: false }) },
    // Strategy 4: Aria-label
    { name: "aria-label", locator: () => page.locator(`[aria-label*="${label}" i]`) },
  ];

  for (const strategy of strategies) {
    try {
      const locator = strategy.locator();
      // Check if element exists and is visible (with short timeout)
      const count = await locator.count();
      if (count > 0) {
        const element = locator.first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.fill(value);
          onStatus(`  ✓ ${label}: ${value}`);
          return true;
        }
      }
    } catch {
      // Try next strategy
    }
  }

  onStatus(`  ⚠ ${label}: Field not found (tried multiple strategies)`);
  return false;
}

/**
 * Find and click a button by its text content.
 */
async function clickButtonByText(
  page: Page,
  text: string,
  onStatus: StatusCallback
): Promise<boolean> {
  const strategies: Array<{ name: string; locator: () => Locator }> = [
    { name: "role button", locator: () => page.getByRole("button", { name: text, exact: false }) },
    { name: "role link", locator: () => page.getByRole("link", { name: text, exact: false }) },
    { name: "text", locator: () => page.getByText(text, { exact: false }) },
    { name: "input submit", locator: () => page.locator(`input[type="submit"][value*="${text}" i]`) },
  ];

  for (const strategy of strategies) {
    try {
      const locator = strategy.locator();
      if (await locator.first().isVisible({ timeout: 2000 })) {
        await locator.first().click();
        return true;
      }
    } catch {
      // Try next strategy
    }
  }

  onStatus(`  ⚠ Button "${text}" not found`);
  return false;
}

export async function fillPajemploiForm(
  declarations: DeclarationData[],
  onStatus: StatusCallback
): Promise<void> {
  const mapping = loadFormMapping();
  const config = mapping.pajemploi;

  onStatus("Fetching credentials from 1Password...");
  const credentials = await getCredentials();

  onStatus("Launching browser...");
  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: 150, // Slow down actions so user can follow
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "fr-FR",
  });

  const page: Page = await context.newPage();

  try {
    // Navigate to home page
    onStatus("Navigating to Pajemploi...");
    await page.goto(config.urls.home);
    await page.waitForLoadState("networkidle");

    // Perform login using label-based locators
    onStatus("Logging in...");

    await fillFieldByLabel(page, config.login.email_label, credentials.email, onStatus);
    await fillFieldByLabel(page, config.login.password_label, credentials.password, onStatus);

    if (!await clickButtonByText(page, config.login.submit_text, onStatus)) {
      // Fallback: try pressing Enter
      await page.keyboard.press("Enter");
    }

    // Wait for login to complete
    await page.waitForLoadState("networkidle");
    // Give extra time for any redirects
    await page.waitForTimeout(2000);
    onStatus("Logged in successfully");

    // Navigate to declaration page if URL provided
    if (config.urls.declaration) {
      await page.goto(config.urls.declaration);
      await page.waitForLoadState("networkidle");
    }

    // Process each declaration
    for (const declaration of declarations) {
      onStatus(`\nFilling declaration for ${declaration.childName}...`);

      // Fill form fields using semantic locators
      const fields = [
        { label: config.declaration.monthlySalary_label, value: formatNumberForInput(declaration.monthlySalary) },
        { label: config.declaration.majoredHoursCount_label, value: formatNumberForInput(declaration.majoredHoursCount) },
        { label: config.declaration.majoredHoursAmount_label, value: formatNumberForInput(declaration.majoredHoursAmount) },
        { label: config.declaration.workedDays_label, value: declaration.workedDays.toString() },
        { label: config.declaration.maintenanceAllowance_label, value: formatNumberForInput(declaration.maintenanceAllowance) },
        { label: config.declaration.mealAllowance_label, value: formatNumberForInput(declaration.mealAllowance) },
      ];

      for (const field of fields) {
        if (field.label) {
          await fillFieldByLabel(page, field.label, field.value, onStatus);
        }
      }
    }

    onStatus("\n✅ Form filled. Please review and submit manually.");
    onStatus("Browser will remain open for your review.");

    // Keep browser open - user will close it manually
    // We don't auto-submit for safety
    await new Promise((resolve) => {
      page.on("close", resolve);
      context.on("close", resolve);
      browser.on("disconnected", resolve);
    });
  } catch (error) {
    onStatus(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    // Keep browser open on error too for debugging
    await new Promise((resolve) => {
      browser.on("disconnected", resolve);
    });
    throw error;
  }
}
