// components/Auth.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthWrapper';
import Link from 'next/link';

export default function Auth() {
  const { session, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [signingOut, setSigningOut] = useState(false);  // NEW: For sign-out feedback
  const [isSignUp, setIsSignUp] = useState(false);

  const handleMagicLink = async () => {
    setLoadingAuth(true);
    const callbackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/confirm`;
    const options = { emailRedirectTo: callbackUrl };

    const { error } = await supabase.auth.signInWithOtp({ email, options });
    
    if (error) {
      alert(`Oops: ${error.message}`);
    } else {
      alert(isSignUp ? 'Check your email to create your TrackAura account!' : 'Check your email to sign in and start tracking!');
      setShowModal(false);
    }
    setLoadingAuth(false);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.reload();
    setSigningOut(false);
  };

  const closeModal = () => setShowModal(false);

  if (loading) return null;

  if (session) {
    return (
      <div className="fixed top-4 right-4 flex flex-col items-end space-y-2 p-2">
        <span className="text-sm text-gray-600">Hi, {session.user.email}!</span>
        <Link
          href="/dashboard"
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
        >
          My Watchlist
        </Link>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-red-600 underline text-sm hover:text-red-800 disabled:opacity-50 flex items-center space-x-1"
        >
          {signingOut ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing out...
            </>
          ) : (
            'Sign Out'
          )}
        </button>
      </div>
    );
  }

  // Non-logged-in: Button to toggle modal
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed top-4 right-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition shadow-md"
      >
        Sign In to Track
      </button>

      {/* Modal Pop-Out */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
            onClick={closeModal}
          />
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isSignUp ? 'Join TrackAura' : 'Sign In to Track'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loadingAuth}
                required
              />
              <button
                onClick={handleMagicLink}
                disabled={loadingAuth || !email}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-3 transition"
              >
                {loadingAuth ? 'Sending...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-blue-600 underline text-sm hover:text-blue-800"
                disabled={loadingAuth}
              >
                {isSignUp ? 'Have an account? Sign In' : "New? Sign Up"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}