"use client";

import { useState, useCallback } from "react";

interface CopyButtonProps {
  value: string;
}

export default function CopyButton({ value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
      aria-label={`Copier ${value}`}
      title="Copier"
    >
      {copied ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-500"
        >
          <polyline points="3 8 6 11 13 4" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="5" width="9" height="9" rx="1.5" />
          <path d="M3 11V3a1.5 1.5 0 0 1 1.5-1.5H11" />
        </svg>
      )}
    </button>
  );
}
