"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ unseen }: { unseen: number }) {
  const pathname = usePathname();

  const links: Array<{ href: string; label: string; badge?: number }> = [
    { href: "/", label: "Feed", badge: unseen },
    { href: "/undated", label: "Undated" },
    { href: "/starred", label: "Starred" },
    { href: "/archive", label: "Archive" },
    { href: "/watchlist", label: "Watchlist" },
  ];

  return (
    <nav className="nav">
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "active" : undefined}
          >
            {link.label}
            {link.badge && link.badge > 0 ? (
              <span className="badge">{link.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
