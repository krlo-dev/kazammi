import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Empty states, no_match and errors: what happened, then what to do (UI-R14, UI-R20). */
export function StateMessage({
  icon: Icon,
  title,
  children,
  actions,
  tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 text-center">
      <span
        className={`grid h-14 w-14 place-items-center rounded-full border border-hairline bg-glass ${
          tone === "danger" ? "text-danger" : "text-fg-2"
        }`}
      >
        <Icon aria-hidden className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <h2 className="mt-5 text-2xl font-light tracking-[-0.02em] text-balance">{title}</h2>
      {children && <div className="mt-3 text-pretty text-fg-2">{children}</div>}
      {actions && <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
