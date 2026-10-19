import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Geist: the open face closest to the light geometric grotesque of the references, with
// 300 to 600 weights for the two-tone titles and tabular numerals for durations.
const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Kazammi", template: "%s · Kazammi" },
  description: "Identifica canciones con la transformada de Fourier.",
};

export const viewport: Viewport = {
  themeColor: "#050609",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
