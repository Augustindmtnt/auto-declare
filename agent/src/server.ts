import express, { Request, Response } from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { fillPajemploiForm, DeclarationData } from "./pajemploi.js";

const PORT = 3001;

export function startServer(): void {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Track connected WebSocket clients
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("WebSocket client connected");

    ws.on("close", () => {
      clients.delete(ws);
      console.log("WebSocket client disconnected");
    });
  });

  // Broadcast status to all connected clients
  function broadcastStatus(message: string): void {
    const payload = JSON.stringify({ type: "status", message });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
    console.log(`[Status] ${message}`);
  }

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Main endpoint to trigger form filling
  app.post("/fill", async (req: Request, res: Response) => {
    const declarations: DeclarationData[] = req.body.declarations;

    if (!declarations || !Array.isArray(declarations) || declarations.length === 0) {
      res.status(400).json({ error: "Missing or empty declarations array" });
      return;
    }

    // Validate declaration structure
    for (const decl of declarations) {
      if (
        typeof decl.childName !== "string" ||
        typeof decl.monthlySalary !== "number" ||
        typeof decl.majoredHoursCount !== "number" ||
        typeof decl.majoredHoursAmount !== "number" ||
        typeof decl.totalSalary !== "number" ||
        typeof decl.workedDays !== "number" ||
        typeof decl.maintenanceAllowance !== "number" ||
        typeof decl.mealAllowance !== "number"
      ) {
        res.status(400).json({ error: "Invalid declaration structure" });
        return;
      }
    }

    // Respond immediately - actual work happens async
    res.json({ status: "started", message: "Form filling initiated" });

    // Run the automation in background
    try {
      await fillPajemploiForm(declarations, broadcastStatus);
      broadcastStatus("Process completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      broadcastStatus(`Error: ${message}`);
    }
  });

  server.listen(PORT, () => {
    console.log(`Pajemploi agent running on http://localhost:${PORT}`);
    console.log(`WebSocket available on ws://localhost:${PORT}`);
    console.log("");
    console.log("Endpoints:");
    console.log("  GET  /health  - Health check");
    console.log("  POST /fill    - Trigger form filling");
    console.log("");
    console.log("Waiting for requests...");
  });
}
