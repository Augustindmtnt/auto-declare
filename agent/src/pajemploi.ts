import { chromium, Browser, Page } from "playwright";
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
    login: {
      url: string;
      email_field: string;
      password_field: string;
      submit_button: string;
    };
    declaration: {
      url: string;
      monthlySalary: string;
      majoredHoursCount: string;
      majoredHoursAmount: string;
      totalSalary: string;
      workedDays: string;
      maintenanceAllowance: string;
      mealAllowance: string;
      childSelector: string;
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

export async function fillPajemploiForm(
  declarations: DeclarationData[],
  onStatus: StatusCallback
): Promise<void> {
  const mapping = loadFormMapping();
  const config = mapping.pajemploi;

  // Validate mapping is configured
  const todoFields = Object.entries(config.login)
    .filter(([, v]) => v === "TODO")
    .map(([k]) => k);

  if (todoFields.length > 0) {
    throw new Error(
      `Form mapping not configured. Please update form-mapping.yaml. Missing: ${todoFields.join(", ")}`
    );
  }

  onStatus("Fetching credentials from 1Password...");
  const credentials = await getCredentials();

  onStatus("Launching browser...");
  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: 100, // Slow down actions so user can follow
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page: Page = await context.newPage();

  try {
    // Navigate to login page
    onStatus("Navigating to Pajemploi...");
    await page.goto(config.login.url);
    await page.waitForLoadState("networkidle");

    // Perform login
    onStatus("Logging in...");
    await page.fill(config.login.email_field, credentials.email);
    await page.fill(config.login.password_field, credentials.password);
    await page.click(config.login.submit_button);

    // Wait for login to complete
    await page.waitForLoadState("networkidle");
    onStatus("Logged in successfully");

    // Process each declaration
    for (const declaration of declarations) {
      onStatus(`Filling declaration for ${declaration.childName}...`);

      // Navigate to declaration page if URL is configured
      if (config.declaration.url && config.declaration.url !== "TODO") {
        await page.goto(config.declaration.url);
        await page.waitForLoadState("networkidle");
      }

      // Select child if selector is configured
      if (
        config.declaration.childSelector &&
        config.declaration.childSelector !== "TODO"
      ) {
        // This might be a dropdown, radio, or other selector
        // User will need to customize based on actual UI
        await page.click(config.declaration.childSelector);
      }

      // Fill form fields
      const fields: Array<{
        selector: string;
        value: string;
        label: string;
      }> = [
        {
          selector: config.declaration.monthlySalary,
          value: formatNumberForInput(declaration.monthlySalary),
          label: "Salaire mensuel",
        },
        {
          selector: config.declaration.majoredHoursCount,
          value: formatNumberForInput(declaration.majoredHoursCount),
          label: "Heures majorées (nombre)",
        },
        {
          selector: config.declaration.majoredHoursAmount,
          value: formatNumberForInput(declaration.majoredHoursAmount),
          label: "Heures majorées (montant)",
        },
        {
          selector: config.declaration.workedDays,
          value: declaration.workedDays.toString(),
          label: "Jours travaillés",
        },
        {
          selector: config.declaration.maintenanceAllowance,
          value: formatNumberForInput(declaration.maintenanceAllowance),
          label: "Indemnité d'entretien",
        },
        {
          selector: config.declaration.mealAllowance,
          value: formatNumberForInput(declaration.mealAllowance),
          label: "Indemnité de repas",
        },
      ];

      for (const field of fields) {
        if (field.selector && field.selector !== "TODO") {
          try {
            await page.fill(field.selector, field.value);
            onStatus(`  ✓ ${field.label}: ${field.value}`);
          } catch (error) {
            onStatus(`  ✗ ${field.label}: Could not fill (selector: ${field.selector})`);
          }
        }
      }

      // Total salary might be auto-calculated, but fill if field exists
      if (
        config.declaration.totalSalary &&
        config.declaration.totalSalary !== "TODO"
      ) {
        try {
          await page.fill(
            config.declaration.totalSalary,
            formatNumberForInput(declaration.totalSalary)
          );
          onStatus(`  ✓ Salaire total: ${formatNumberForInput(declaration.totalSalary)}`);
        } catch {
          // Might be read-only/auto-calculated
        }
      }
    }

    onStatus("✅ Form filled. Please review and submit manually.");
    onStatus("Browser will remain open for your review.");

    // Keep browser open - user will close it manually
    // We don't auto-submit for safety

    // Wait indefinitely (until user closes browser)
    await new Promise((resolve) => {
      page.on("close", resolve);
      context.on("close", resolve);
      browser.on("disconnected", resolve);
    });
  } catch (error) {
    onStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    // Keep browser open on error too for debugging
    await new Promise((resolve) => {
      browser.on("disconnected", resolve);
    });
    throw error;
  }
}
