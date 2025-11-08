// app/auth/confirm/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/layout';
import { Suspense } from 'react';  // NEW: For boundary

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();  // This triggers the need for Suspense
  const { loading } = useAuth();

  useEffect(() => {
    const handleToken = async () => {
      const token = searchParams.get('token') || '';
      if (!token) {
        router.push('/');  // No token? Bail to home
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(token);
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

    handleToken();
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Signing you in...</h2>
        <p className="text-gray-600">One moment while we verify your magic link.</p>
      </div>
    </div>
  );
}

export default function Confirm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <p className="text-gray-600">Preparing your session.</p>
        </div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}