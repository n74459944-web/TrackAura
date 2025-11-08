// app/auth/confirm/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/layout';  // Your provider hook (for loading/session if needed)

export default function Confirm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading } = useAuth();  // Just pull loading if wanted; no setSession

  useEffect(() => {
    const handleToken = async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(searchParams.get('token') || '');
      if (error) {
        console.error('Token exchange failed:', error);
        alert(`Sign-in error: ${error.message}. Try again?`);
        router.push('/');  // Back to home on fail
      } else {
        // Success: Session set via provider listener
        console.log('Signed in:', data.user?.email);
        router.push('/dashboard');  // Or '/' for home
      }
    };

    if (searchParams.get('token')) {
      handleToken();
    } else {
      router.push('/');  // No token? Bail
    }
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Signing you in...</h2>
          <p className="text-gray-600">One moment while we verify your magic link.</p>
        </div>
      </div>
    );
  }

  return null;  // Or a fallback if not loading
}