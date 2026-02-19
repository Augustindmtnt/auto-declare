import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full h-12 flex items-center px-6" style={{ backgroundColor: "#FF5F00" }}>
      <Link href="/" className="text-white font-semibold text-lg tracking-tight">
        autodeclare
      </Link>
    </nav>
  );
}
