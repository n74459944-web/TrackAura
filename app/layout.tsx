// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthWrapper from '@/components/AuthWrapper';  // NEW: Client-only auth layer

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {  // FIXED: Now server-safe—no 'use client'
  title: 'TrackAura - Track Every Item\'s Value Over Time',
  description: 'Historical pricing, specs, charts, and categories for the world\'s items.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthWrapper>  {/* Wraps children with client auth—hooks fire here */}
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}