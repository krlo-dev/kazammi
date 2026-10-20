import { Grip } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/app/_components/brand/Logo";
import { NavMenu, ProfileMenu } from "@/app/_components/shell/AppMenus";
import { requireUser } from "@/modules/auth";

// Every page of the (app) group requires a valid session (AUTH-R9). With cacheComponents
// the session (request data) is read inside Suspense, so the shell can still be prerendered.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div aria-hidden className="app-field" />
      {/* On desktop the brand sits on the page's center axis, above the title. */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-10 lg:pt-6">
        <span aria-hidden className="hidden lg:block" />
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg text-fg"
          aria-label="Kazammi, ir a Identificar"
        >
          <Logo className="h-11 w-11 lg:h-12 lg:w-12" />
          <span className="text-xl font-semibold tracking-[-0.02em] lg:text-2xl">Kazammi</span>
        </Link>
        <div className="flex items-center gap-2.5 lg:justify-self-end">
          <Suspense fallback={<span className="h-11 w-11 rounded-full bg-glass" />}>
            <Profile />
          </Suspense>
          {/* usePathname() is request data: the shell prerenders with a static button. */}
          <Suspense
            fallback={
              <span aria-hidden className="btn-icon">
                <Grip className="h-5 w-5" strokeWidth={1.75} />
              </span>
            }
          >
            <NavMenu />
          </Suspense>
        </div>
      </header>
      <Suspense fallback={null}>
        <SignedIn>{children}</SignedIn>
      </Suspense>
    </div>
  );
}

/** The proxy only checks that a cookie exists; this validates the session itself. */
async function SignedIn({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}

async function Profile() {
  const user = await requireUser();
  return <ProfileMenu name={user.name} email={user.email} />;
}
