"use client";

import { useState, useEffect, useRef } from "react";
import { DeclarationResult } from "@/lib/types";

interface FillPajemploiButtonProps {
  results: DeclarationResult[];
}

type Status = "idle" | "connecting" | "filling" | "done" | "error";

export default function FillPajemploiButton({
  results,
}: FillPajemploiButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<string[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<Status>("idle");

  // Keep statusRef in sync with status
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleClick = async () => {
    if (status === "connecting" || status === "filling") {
      return;
    }

    setStatus("connecting");
    setMessages([]);
    setShowMessages(true);

    // Connect WebSocket for status updates
    try {
      const ws = new WebSocket("ws://localhost:3001");
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "status") {
          setMessages((prev) => [...prev, data.message]);
          if (data.message.includes("Error")) {
            setStatus("error");
          } else if (data.message.includes("completed") || data.message.includes("review")) {
            setStatus("done");
          } else {
            setStatus("filling");
          }
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setMessages((prev) => [
          ...prev,
          "Could not connect to agent. Is it running on localhost:3001?",
        ]);
      };

      ws.onclose = () => {
        const currentStatus = statusRef.current;
        if (currentStatus === "connecting" || currentStatus === "filling") {
          setStatus("error");
          setMessages((prev) => [...prev, "Connection closed"]);
        }
      };

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("Connection failed"));
      });

      // Send the request
      const response = await fetch("http://localhost:3001/fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declarations: results }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Request failed");
      }

      setStatus("filling");
    } catch (error) {
      setStatus("error");
      setMessages((prev) => [
        ...prev,
        error instanceof Error ? error.message : "Unknown error",
      ]);
    }
  };

  const buttonText = {
    idle: "Fill Pajemploi",
    connecting: "Connecting...",
    filling: "Filling form...",
    done: "Done",
    error: "Retry",
  }[status];

  const buttonClass = {
    idle: "bg-blue-600 hover:bg-blue-700",
    connecting: "bg-gray-400 cursor-not-allowed",
    filling: "bg-yellow-500",
    done: "bg-green-600 hover:bg-green-700",
    error: "bg-red-600 hover:bg-red-700",
  }[status];

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={status === "connecting" || status === "filling"}
        className={`w-full px-4 py-3 text-white font-medium rounded-xl transition-colors cursor-pointer ${buttonClass}`}
      >
        {buttonText}
      </button>

      {showMessages && messages.length > 0 && (
        <div className="bg-gray-900 text-gray-100 rounded-xl p-4 text-sm font-mono max-h-48 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className="py-0.5">
              {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
