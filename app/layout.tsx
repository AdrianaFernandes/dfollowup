import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delivery Follow-up | Thomson Reuters",
  description: "Relatório de entregas Azure DevOps (tr-ggo)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="trBrandStrip" aria-hidden />
        {children}
      </body>
    </html>
  );
}
