"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register({ email, password, full_name: name });
    } catch {
      // error toast handled by useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 gradient-mesh relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.08)_0%,_transparent_70%)]" />

      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.5) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

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
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Start automating your workflows in minutes
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl glass p-6 space-y-4 shadow-xl shadow-black/20"
        >
          <Input
            label="Full name"
            type="text"
            placeholder="Alex Chen"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User className="h-4 w-4" />}
          />

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

          <p className="text-xs text-zinc-500 leading-relaxed">
            By creating an account, you agree to our{" "}
            <Link href="#" className="text-zinc-400 hover:text-zinc-200 transition-colors duration-150 cursor-pointer">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-zinc-400 hover:text-zinc-200 transition-colors duration-150 cursor-pointer">
              Privacy Policy
            </Link>
            .
          </p>

          <Button type="submit" loading={loading} className="w-full shadow-lg shadow-brand-500/20">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-zinc-400 hover:text-zinc-200 transition-colors duration-150 font-medium cursor-pointer"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
