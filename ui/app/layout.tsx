import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import { QueryProvider } from '@/components/query-provider';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export const metadata: Metadata = {
  title: 'OpsBuddy - Uptime Monitoring',
  description: 'Manage your services with OpsBuddy',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
