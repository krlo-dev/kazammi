import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSession, safeNextPath } from "@/modules/auth";

import { LoginForms } from "./login-forms";

// Public page (AUTH-R12). Query params and the session are request data, read inside Suspense.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={null}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const next = safeNextPath((await searchParams).next);
  // A signed-in user goes straight to the app (AUTH-R10).
  if (await getSession()) redirect(next);
  return <LoginForms next={next} />;
}
