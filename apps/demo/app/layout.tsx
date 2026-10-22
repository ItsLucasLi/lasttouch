import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nightjar Live (demo)",
  description: "A fictional ticket seller that demonstrates LastTouch.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="demo-banner" role="note">
          Demo — not a real ticket seller.
        </div>
        {children}
      </body>
    </html>
  );
}
