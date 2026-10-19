import { LogoLoader } from "../brand/LogoLoader";

/** Fallback while a library page reads the session and its data. */
export function PageLoading() {
  return (
    <div className="grid flex-1 place-items-center py-24" role="status">
      <LogoLoader className="h-28 w-28 text-fg-2" />
    </div>
  );
}
