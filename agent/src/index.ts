import { loadEnvFile } from "node:process";
try { loadEnvFile(); } catch {}

import { startServer } from "./server.js";

console.log("=================================");
console.log("  Pajemploi Auto-Fill Agent");
console.log("=================================");
console.log("");

startServer();
