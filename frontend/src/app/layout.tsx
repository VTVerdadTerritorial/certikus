import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CERTIKUS | Prevalidación Documental Registral e Inmobiliaria en Colombia',
  description:
    'Prevalida escrituras públicas y certificados de tradición antes de radicar en la ORIP. Detecta inconsistencias con OCR e IA. Cumple Ley 1579 de 2012.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CO">
      <body className="antialiased">{children}</body>
    </html>
  );
}