import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = isSignUp
  ? await supabase.auth.signUp({ email, password })
  : await supabase.auth.signInWithPassword({ email, password });

if (error) {
  setError(error.message);
} else if (isSignUp && data.user && !data.session) {
  setError("Account created — check your email to confirm before logging in.");
}
setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1ECE0]">
      <div className="bg-white border border-[#DED4BE] rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-[#5B564C] mb-5">
          {isSignUp ? "Sign up to start packing." : "Log in to your Packlist."}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email" required placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full text-sm border border-[#DED4BE] rounded-md px-3 py-2 focus:outline-none focus:border-[#B8862E]"
          />
          <input
            type="password" required placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full text-sm border border-[#DED4BE] rounded-md px-3 py-2 focus:outline-none focus:border-[#B8862E]"
          />
          {error && <p className="text-xs text-[#B4482F]">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-[#23262B] text-white py-2 text-sm font-medium hover:bg-black transition disabled:opacity-50"
          >
            {loading ? "Please wait…" : isSignUp ? "Sign up" : "Log in"}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp((s) => !s)}
          className="text-xs text-[#2F6F63] mt-4 font-medium"
        >
          {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}