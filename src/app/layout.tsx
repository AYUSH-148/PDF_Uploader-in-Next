import type { Metadata } from "next";

import "./globals.css";
import 'dropzone/dist/dropzone.css';

export const metadata: Metadata = {
  title: "Xinterview Assignment (PDFEditor)",
  description: "Genereate blurr, erase and custom annotations on PDF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className='antialiased'
      >
        {children}
      </body>
    </html>
  );
}
