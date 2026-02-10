import { chromium, Browser, Page, Locator } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import { getCredentials } from "./credentials.js";

const client = new Anthropic();

const MAX_ITERATIONS = 30;

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

type StatusCallback = (status: string) => void;

function formatNumberForInput(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

// --- Accessibility snapshot helper ---

async function getPageState(page: Page): Promise<string> {
  const snapshot = await page.locator(":root").ariaSnapshot();
  const url = page.url();
  return `Current URL: ${url}\n\nAccessibility tree:\n${snapshot}`;
}

// --- Playwright action helpers ---

async function fillFieldByLabel(
  page: Page,
  label: string,
  value: string
): Promise<string> {
  const strategies: Array<{ name: string; locator: () => Locator }> = [
    {
      name: "getByLabel",
      locator: () => page.getByLabel(label, { exact: false }),
    },
    {
      name: "label contains",
      locator: () =>
        page.locator(
          `label:has-text("${label}") + input, label:has-text("${label}") input`
        ),
    },
    {
      name: "placeholder",
      locator: () => page.getByPlaceholder(label, { exact: false }),
    },
    {
      name: "aria-label",
      locator: () => page.locator(`[aria-label*="${label}" i]`),
    },
  ];

  for (const strategy of strategies) {
    try {
      const locator = strategy.locator();
      const count = await locator.count();
      if (count > 0) {
        const element = locator.first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.fill(value);
          return `Filled "${label}" with "${value}" (via ${strategy.name})`;
        }
      }
    } catch {
      // Try next strategy
    }
  }

  return `Could not find field "${label}" — tried all strategies`;
}

async function clickElement(
  page: Page,
  description: string
): Promise<string> {
  const strategies: Array<{ name: string; locator: () => Locator }> = [
    {
      name: "role button",
      locator: () =>
        page.getByRole("button", { name: description, exact: false }),
    },
    {
      name: "role link",
      locator: () =>
        page.getByRole("link", { name: description, exact: false }),
    },
    {
      name: "role checkbox",
      locator: () =>
        page.getByRole("checkbox", { name: description, exact: false }),
    },
    {
      name: "text",
      locator: () => page.getByText(description, { exact: false }),
    },
    {
      name: "input submit",
      locator: () =>
        page.locator(`input[type="submit"][value*="${description}" i]`),
    },
  ];

  for (const strategy of strategies) {
    try {
      const locator = strategy.locator();
      if (await locator.first().isVisible({ timeout: 2000 })) {
        await locator.first().click();
        return `Clicked "${description}" (via ${strategy.name})`;
      }
    } catch {
      // Try next strategy
    }
  }

  return `Could not find clickable element "${description}" — tried all strategies`;
}

// --- Tool definitions for Claude ---

const tools: Anthropic.Tool[] = [
  {
    name: "fill_field",
    description:
      "Fill a form input field identified by its label text. The label should match what you see in the accessibility tree.",
    input_schema: {
      type: "object" as const,
      properties: {
        label: {
          type: "string",
          description: "The label text of the field to fill",
        },
        value: {
          type: "string",
          description: "The value to enter in the field",
        },
      },
      required: ["label", "value"],
    },
  },
  {
    name: "click",
    description:
      "Click on a button, link, or other interactive element identified by its visible text or accessible name.",
    input_schema: {
      type: "object" as const,
      properties: {
        element_description: {
          type: "string",
          description:
            "The text or accessible name of the element to click",
        },
      },
      required: ["element_description"],
    },
  },
  {
    name: "navigate",
    description: "Navigate the browser to a specific URL.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL to navigate to",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "wait",
    description:
      "Wait for the page to settle after a navigation or action. Use after clicking links or submitting forms.",
    input_schema: {
      type: "object" as const,
      properties: {
        seconds: {
          type: "number",
          description: "Number of seconds to wait (1-10)",
        },
      },
      required: ["seconds"],
    },
  },
  {
    name: "done",
    description:
      "Signal that the task is complete. Call this when all declarations have been filled.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: {
          type: "string",
          description: "A brief summary of what was accomplished",
        },
      },
      required: ["summary"],
    },
  },
];

// --- Tool execution ---

async function executeTool(
  page: Page,
  toolName: string,
  toolInput: Record<string, unknown>,
  onStatus: StatusCallback
): Promise<string> {
  switch (toolName) {
    case "fill_field": {
      const label = toolInput.label as string;
      const value = toolInput.value as string;
      const result = await fillFieldByLabel(page, label, value);
      onStatus(`  ✓ fill: ${label} = "${value}"`);
      return result;
    }
    case "click": {
      const desc = toolInput.element_description as string;
      const result = await clickElement(page, desc);
      onStatus(`  ✓ click: ${desc}`);
      return result;
    }
    case "navigate": {
      const url = toolInput.url as string;
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      onStatus(`  ✓ navigate: ${url}`);
      return `Navigated to ${url}`;
    }
    case "wait": {
      const seconds = Math.min(
        Math.max(toolInput.seconds as number, 1),
        10
      );
      await page.waitForTimeout(seconds * 1000);
      await page.waitForLoadState("networkidle").catch(() => {});
      return `Waited ${seconds} seconds`;
    }
    case "done": {
      return toolInput.summary as string;
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}

// --- Build the system prompt ---

function buildSystemPrompt(
  credentials: { email: string; password: string },
  declarations: DeclarationData[]
): string {
  const declSummary = declarations
    .map(
      (d) =>
        `- ${d.childName}:
    Salaire net total: ${formatNumberForInput(d.totalSalary)}
    Salaire net mensuel: ${formatNumberForInput(d.monthlySalary)}
    Heures majorées (nombre): ${formatNumberForInput(d.majoredHoursCount)}
    Heures majorées (montant): ${formatNumberForInput(d.majoredHoursAmount)}
    Jours d'activité: ${d.workedDays}
    Indemnités d'entretien: ${formatNumberForInput(d.maintenanceAllowance)}
    Indemnités de repas: ${formatNumberForInput(d.mealAllowance)}`
    )
    .join("\n");

  return `You are a browser automation agent. Your job is to fill a Pajemploi declaration form on pajemploi.urssaf.fr.

## Credentials
- Email: ${credentials.email}
- Password: ${credentials.password}

## Declaration data to fill
${declSummary}

## Instructions
1. You are already on the Pajemploi home page. Log in using the credentials above.
2. After logging in, navigate to the declaration form for the current month. Look for links or buttons related to declarations ("Déclarer", "Volet social", etc.).
3. For each child, fill in the salary, hours, worked days, and allowance fields with the values above.
4. Use French number formatting (comma as decimal separator, e.g. "658,13") — the values above are already formatted correctly.
5. IMPORTANT: Do NOT click any final submit/validate button. Stop after filling all fields.
6. Call the "done" tool when all fields have been filled.

## Tips
- After each action, you will receive an updated accessibility tree of the page.
- If a field is not found, try alternative descriptions or look at the accessibility tree for the correct label.
- If you encounter unexpected pages (cookie banners, popups), handle them and continue.
- Take your time — use "wait" after navigations to let the page load.`;
}

// --- Main agentic loop ---

async function runAgentLoop(
  page: Page,
  systemPrompt: string,
  onStatus: StatusCallback
): Promise<void> {
  const messages: Anthropic.MessageParam[] = [];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Get current page state
    const pageState = await getPageState(page);

    // Add the page state as a user message
    messages.push({
      role: "user",
      content: `Here is the current page state:\n\n${pageState}\n\nWhat action should I take next?`,
    });

    onStatus(`[Step ${iteration + 1}] Thinking...`);

    // Call Claude
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    // Process the response
    const assistantContent = response.content;
    messages.push({ role: "assistant", content: assistantContent });

    // Find tool use blocks
    const toolUseBlocks = assistantContent.filter(
      (block): block is Anthropic.ContentBlockParam & { type: "tool_use" } =>
        block.type === "tool_use"
    );

    // If no tool calls, Claude is just talking — check if it's done
    if (toolUseBlocks.length === 0) {
      const textBlock = assistantContent.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        onStatus(`  Agent: ${textBlock.text}`);
      }
      break;
    }

    // Execute each tool call
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let isDone = false;

    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(
        page,
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        onStatus
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });

      if (toolUse.name === "done") {
        isDone = true;
        onStatus(`\n✅ ${result}`);
      }
    }

    // Add tool results to conversation
    messages.push({ role: "user", content: toolResults });

    if (isDone) return;
  }

  onStatus(
    `\n⚠ Agent reached maximum iterations (${MAX_ITERATIONS}). Please review the current state.`
  );
}

// --- Entry point ---

export async function fillPajemploiForm(
  declarations: DeclarationData[],
  onStatus: StatusCallback
): Promise<void> {
  onStatus("Fetching credentials from 1Password...");
  const credentials = await getCredentials();

  onStatus("Launching browser...");
  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: 150,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "fr-FR",
  });

  const page: Page = await context.newPage();

  try {
    onStatus("Navigating to Pajemploi...");
    await page.goto("https://www.pajemploi.urssaf.fr/");
    await page.waitForLoadState("networkidle");

    const systemPrompt = buildSystemPrompt(credentials, declarations);

    onStatus("Starting LLM agent...\n");
    await runAgentLoop(page, systemPrompt, onStatus);

    onStatus("\nBrowser will remain open for your review.");

    // Keep browser open for user review
    await new Promise((resolve) => {
      page.on("close", resolve);
      context.on("close", resolve);
      browser.on("disconnected", resolve);
    });
  } catch (error) {
    onStatus(
      `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`
    );
    await new Promise((resolve) => {
      browser.on("disconnected", resolve);
    });
    throw error;
  }
}
