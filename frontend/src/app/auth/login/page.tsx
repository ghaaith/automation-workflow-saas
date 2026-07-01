"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, Mail, Lock, Eye, EyeOff, Github, Chrome } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh-hero" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-brand-500/10 blur-[120px] animate-pulse-soft" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-accent-blue/8 blur-[100px] animate-pulse-soft" style={{ animationDelay: "1s" }} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500 group-hover:scale-105 transition-transform duration-200 shadow-lg shadow-brand-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </Link>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Welcome back</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Sign in to your account to continue
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl glass-card p-6 space-y-4 shadow-xl shadow-black/20"
        >
          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="h-4 w-4" />}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 bottom-2.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-zinc-500 cursor-pointer hover:text-zinc-400 transition-colors">
              <input
                type="checkbox"
                className="rounded border-zinc-700 bg-zinc-900 text-brand-500 focus:ring-brand-500/25"
              />
              Remember me
            </label>
            <Link
              href="#"
              className="text-zinc-400 hover:text-zinc-300 transition-colors duration-150 cursor-pointer"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="w-full shadow-lg shadow-brand-500/20">
            Sign In
          </Button>

          {/* Social login divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-900 px-2 text-zinc-500">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-zinc-800/50 text-sm text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all duration-150 cursor-pointer"
            >
              <Github className="h-4 w-4" />
              GitHub
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-zinc-800/50 text-sm text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all duration-150 cursor-pointer"
            >
              <Chrome className="h-4 w-4" />
              Google
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="text-zinc-400 hover:text-zinc-200 transition-colors duration-150 font-medium cursor-pointer"
          >
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
