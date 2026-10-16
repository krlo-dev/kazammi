import { Suspense } from "react";

import { requireUser } from "@/modules/auth";

import { SignOutButton } from "./sign-out-button";

// Every page of the (app) group requires a valid session (AUTH-R9). With cacheComponents
// the session (request data) is read inside Suspense, so the shell can still be prerendered.
// Minimal header; the final design arrives with specs/08-ui.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={null}>
      <SignedIn>{children}</SignedIn>
    </Suspense>
  );
}

async function SignedIn({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <header className="flex items-center justify-between gap-4 p-4">
        <span>
          {user.name} ({user.email})
        </span>
        <SignOutButton />
      </header>
      {children}
    </>
  );
}
