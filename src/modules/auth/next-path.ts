/**
 * Where to go after signing in. Only internal paths are accepted ("/saved", "/playlists/3?x=1"):
 * anything else, including protocol-relative "//evil.com" and "/\evil.com", falls back to "/"
 * so the login page cannot be used as an open redirect.
 */
export function safeNextPath(next: string | string[] | null | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  // Control characters (tabs, newlines) are stripped by URL parsers and could hide a "//".
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/";
  if (value === "/login" || value.startsWith("/login?") || value.startsWith("/login/")) return "/";
  return value;
}
