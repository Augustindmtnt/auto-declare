"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Déclaration", href: "/" },
  { label: "Contrats", href: "/contrats" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="w-full h-14 flex items-center px-6 bg-white border-b border-gray-200">
      <Link href="/" className="text-gray-900 font-semibold text-base tracking-tight shrink-0">
        autodeclare
      </Link>

      <div className="flex items-center gap-6 ml-12">
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                isActive
                  ? "text-blue-500 border-b-2 border-blue-500 pb-0.5"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
