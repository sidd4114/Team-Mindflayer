"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, User } from "lucide-react";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const redirectTo = searchParams.get("redirect") || "/fields";

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name: name.trim() || undefined },
                    },
                });
                if (error) throw error;
                alert("Check your email for the confirmation link!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                const target = redirectTo === "/fields" || redirectTo === "/settings" || redirectTo?.startsWith("/fields/") ? redirectTo : "/fields";
                router.push(target);
                router.refresh();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen bg-[#F5F3EE] flex flex-col"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
            <main className="flex-1 flex flex-col justify-center max-w-md md:max-w-lg mx-auto px-5 md:px-8 w-full pt-8 pb-16">
                <h1 className="text-center text-[22px] md:text-[26px] font-semibold text-slate-800 mb-5 md:mb-6">
                    {isSignUp ? "Sign up" : "Sign in"}
                </h1>
                <div className="bg-white rounded-3xl shadow-xl shadow-black/10 border border-slate-200/60 p-6 md:p-8">
                    <p className="text-slate-500 text-sm font-medium mb-5">
                        {isSignUp ? "Create your account" : "Sign in to continue"}
                    </p>
                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200/80">
                            <p className="text-sm font-medium text-red-800">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-5">
                        {isSignUp && (
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-800">
                                    Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" strokeWidth={2} />
                                    <input
                                        type="text"
                                        className="w-full rounded-[18px] border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3.5 text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-[#6B7B3F] focus:bg-white focus:ring-2 focus:ring-[#6B7B3F]/20 transition-all"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Your name"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-800">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" strokeWidth={2} />
                                <input
                                    type="email"
                                    required
                                    className="w-full rounded-[18px] border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3.5 text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-[#6B7B3F] focus:bg-white focus:ring-2 focus:ring-[#6B7B3F]/20 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-800">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" strokeWidth={2} />
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full rounded-[18px] border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3.5 text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-[#6B7B3F] focus:bg-white focus:ring-2 focus:ring-[#6B7B3F]/20 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="pt-1">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-br from-[#6B7B3F] to-[#5A6A35] text-white font-bold py-4 px-6 rounded-[22px] shadow-lg shadow-[#6B7B3F]/25 hover:shadow-xl hover:shadow-[#6B7B3F]/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-3 min-h-[52px]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin shrink-0" strokeWidth={2.5} />
                                        <span>Please wait...</span>
                                    </>
                                ) : isSignUp ? (
                                    "Create account"
                                ) : (
                                    "Sign in"
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Test credentials - clearly inside card, subordinate */}
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Test account
                        </p>
                        <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-700">
                            <p><span className="font-medium text-slate-800">Email:</span> test@test.com</p>
                            <p className="mt-0.5"><span className="font-medium text-slate-800">Password:</span> password123</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            type="button"
                            className="w-full py-2.5 text-sm font-semibold text-[#6B7B3F] hover:text-[#5A6A35] hover:underline transition-colors text-center"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                            }}
                        >
                            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#6B7B3F]" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
