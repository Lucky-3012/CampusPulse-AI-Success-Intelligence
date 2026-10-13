import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell";
import { AuthProvider } from "@/components/auth-context";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["500", "600", "700", "800"],
});
const body = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: "CampusPulse — Campus Success Intelligence",
  description:
    "A realistic, enterprise-grade campus analytics platform: dual Student & Teacher portals, Branch × Section directory, explainable Student Success Scores, and a tracked intervention workflow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="noise">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-grid" />
          <div
            className="absolute -top-48 left-1/3 h-[480px] w-[760px] rounded-full opacity-[0.16]"
            style={{ background: "radial-gradient(closest-side, #a5b4fc, transparent 70%)" }}
          />
          <div
            className="absolute top-1/3 -right-48 h-[420px] w-[520px] rounded-full opacity-[0.1]"
            style={{ background: "radial-gradient(closest-side, #5eead4, transparent 70%)" }}
          />
        </div>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
