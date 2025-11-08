// app/layout.tsx - Line numbers for debug
'use client';  // Line 1: Enables client hooks

import { Inter } from 'next/font/google';  // Line 3
import './globals.css';  // Line 4
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';  // Line 5
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';  // Line 6
import { Session } from '@supabase/supabase-js';  // Line 7

const inter = Inter({ subsets: ['latin'] });  // Line 9

// Auth Context & Hook - Lines 12-20
type AuthContextType = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ session: null, loading: true });

export function useAuth() {  // Line 21
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// AuthProvider - Lines 32-50
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClientComponentClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, currentSession) => {
      setSession(currentSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Metadata commented - Lines 52-55
/*
export const metadata = {
  title: 'TrackAura - Track Item Values Worldwide',
  description: 'Historical prices, specs, and charts for every item.',
};
*/

// RootLayout - Lines 57-70 (53-54 were old; now clean sig)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}