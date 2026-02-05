import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface PajemploiCredentials {
  email: string;
  password: string;
}

/**
 * Fetches Pajemploi credentials from 1Password using the CLI.
 * Requires 1Password CLI (op) to be installed and authenticated.
 */
export async function getCredentials(): Promise<PajemploiCredentials> {
  try {
    // Get the full item from 1Password
    const { stdout } = await execAsync(
      'op item get "Pajemploi" --format json'
    );

    const item = JSON.parse(stdout);

    // Extract email and password from fields
    let email = "";
    let password = "";

    for (const field of item.fields || []) {
      if (field.id === "username" || field.label?.toLowerCase() === "email" || field.label?.toLowerCase() === "username") {
        email = field.value;
      }
      if (field.id === "password" || field.type === "CONCEALED") {
        password = field.value;
      }
    }

    if (!email || !password) {
      throw new Error("Could not find email or password in 1Password item");
    }

    return { email, password };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not signed in")) {
        throw new Error(
          "1Password CLI not authenticated. Please run 'eval $(op signin)' first."
        );
      }
      if (error.message.includes("command not found") || error.message.includes("op:")) {
        throw new Error(
          "1Password CLI (op) not found. Please install it from https://1password.com/downloads/command-line/"
        );
      }
      if (error.message.includes("isn't an item")) {
        throw new Error(
          'Item "Pajemploi" not found in 1Password. Please create an item named "Pajemploi" with your credentials.'
        );
      }
    }
    throw error;
  }
}
