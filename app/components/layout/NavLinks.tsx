"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface ItemLink {
  href: string;
  label: string;
}

export function NavLinks({ links }: { links: ItemLink[] }) {
  const pathname = usePathname();

  return (
    <>
      {links.map(({ href, label }) => {
        const activo =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 font-medium transition-colors ${
              activo
                ? "bg-emerald-500 text-zinc-950"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}