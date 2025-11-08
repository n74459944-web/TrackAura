// components/Auth.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';  // Assumes lib/supabase.ts from before

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);  // Toggle for UX/messaging only

  const handleMagicLink = async () => {
    setLoading(true);
    const options = {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : '',  // Redirect back to site
    };

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options,
    });
    
    if (error) {
      alert(`Oops: ${error.message}`);  // Swap for toast lib later (e.g., react-hot-toast)
    } else {
      alert(
        isSignUp 
          ? 'Check your email to create your TrackAura account!' 
          : 'Check your email to sign in and start tracking!'
      );
    }
    setLoading(false);
  };

  return (
    <div className="fixed top-4 right-4 p-4 bg-white shadow-lg rounded-lg border border-gray-200 z-50 max-w-sm">
      <h2 className="text-lg font-semibold mb-3 text-gray-900">
        {isSignUp ? 'Join TrackAura' : 'Sign In to Track'}
      </h2>
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={loading}
        required
      />
      <button
        onClick={handleMagicLink}
        disabled={loading || !email}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-2 transition-colors"
      >
        {loading ? 'Sending...' : (isSignUp ? 'Sign Up' : 'Sign In')}
      </button>
      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className="w-full text-blue-600 underline text-sm hover:text-blue-800"
        disabled={loading}
      >
        {isSignUp ? 'Have an account? Sign In' : "New? Sign Up"}
      </button>
    </div>
  );
}