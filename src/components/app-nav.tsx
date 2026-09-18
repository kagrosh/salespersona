"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [{ href: "/", label: "Overview" }, { href: "/opportunities", label: "Opportunities" }, { href: "/customers", label: "Customers" }, { href: "/projects", label: "Projects" }, { href: "/tasks", label: "Tasks" }];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="app-nav col-span-2 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
      {NAV.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} className="nav-link" aria-current={active ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
  );
}
