import "./globals.css";
import type { Metadata } from "next";
import { ToastHub } from "../components/ToastHub";

export const metadata: Metadata = {
  title: "Mouse Lotto",
  description: "Mouse Lotto live draw experience",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastHub />
        {children}
      </body>
    </html>
  );
}
