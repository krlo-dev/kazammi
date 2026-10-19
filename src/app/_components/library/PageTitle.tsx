import type { ReactNode } from "react";

/** Light two-tone page title of the library screens, with an optional line and actions. */
export function PageTitle({
  first,
  second,
  lead,
  actions,
}: {
  first: string;
  second?: string;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:mb-10">
      <div className="min-w-0">
        <h1 className="display text-[clamp(2.5rem,8vw,4.75rem)] [overflow-wrap:anywhere]">
          {first}
          {second && (
            <>
              {" "}
              <span className="text-fg-2">{second}</span>
            </>
          )}
        </h1>
        {lead && <p className="mt-3 text-fg-2">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
