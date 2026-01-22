import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stack Health AI | Contentstack Analysis Platform',
  description: 'AI-powered Solution Architect Bot for analyzing Contentstack Stack Health Check reports. Get instant insights, recommendations, and answers.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0a0a0f" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
