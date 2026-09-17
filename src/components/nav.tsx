"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "工作台", exact: true },
  { href: "/lessons", label: "教案与活动" },
  { href: "/research", label: "教研管理" },
  { href: "/observations", label: "观察记录" },
  { href: "/assessments", label: "ECERS 评估" },
  { href: "/family", label: "家园共育" },
  { href: "/resources", label: "资源库" },
  { href: "/classes", label: "班级与幼儿" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header
      className="no-print sticky top-0 z-10 border-b backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--surface) 85%, transparent)", borderColor: "var(--border)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-5 py-3">
        <Link href="/" className="mr-4 flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">研</span>
          <span className="text-[15px]">学前教研</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active ? "bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-brand-900/40"
                }`}
                style={active ? undefined : { color: "var(--muted)" }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
