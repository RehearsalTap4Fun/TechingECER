import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "submit",
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "ghost";
  type?: "submit" | "button" | "reset";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-brand-600 text-white hover:bg-brand-700"
      : "border hover:bg-brand-50 dark:hover:bg-brand-900/30";
  return (
    <button
      type={type}
      className={`${base} ${styles} ${className}`}
      style={variant === "ghost" ? { borderColor: "var(--border)" } : undefined}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const base = "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition";
  const styles =
    variant === "primary"
      ? "bg-brand-600 text-white hover:bg-brand-700"
      : "border hover:bg-brand-50 dark:hover:bg-brand-900/30";
  return (
    <Link
      href={href}
      className={`${base} ${styles}`}
      style={variant === "ghost" ? { borderColor: "var(--border)" } : undefined}
    >
      {children}
    </Link>
  );
}

export function Tag({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={
        color
          ? { background: `${color}1a`, color }
          : { background: "var(--bg)", color: "var(--muted)" }
      }
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div
      className="rounded-xl border border-dashed px-6 py-14 text-center"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-sm font-medium">{title}</p>
      {hint && (
        <p className="mx-auto mt-1.5 max-w-md text-xs" style={{ color: "var(--muted)" }}>
          {hint}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
