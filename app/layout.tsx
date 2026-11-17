import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booked Guard",
  description: "Agenda familiar por días y horarios para el cuidado de abue",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
