"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BarChart3, FileText, Zap, Check, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const floatingStats = [
  { icon: BarChart3, label: "98%", sub: "faster processing", x: "12%", y: "22%", delay: 0.3 },
  { icon: FileText, label: "10K+", sub: "docs processed", x: "78%", y: "18%", delay: 0.5 },
  { icon: Zap, label: "99.9%", sub: "uptime", x: "82%", y: "72%", delay: 0.4 },
  { icon: Star, label: "4.9", sub: "avg rating", x: "8%", y: "68%", delay: 0.6 },
];

const avatars = [
  { initial: "S", color: "bg-blue-600" },
  { initial: "M", color: "bg-emerald-600" },
  { initial: "A", color: "bg-amber-600" },
  { initial: "K", color: "bg-rose-600" },
  { initial: "J", color: "bg-violet-600" },
];

export function Hero() {
  return (
    <section className="relative pt-36 pb-28 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 gradient-mesh-hero" />
      <div className="absolute inset-0 grid-pattern-dot opacity-40" />

      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-brand-500/10 blur-[120px] animate-pulse-soft" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-accent-blue/8 blur-[100px] animate-pulse-soft" style={{ animationDelay: "1s" }} />

      {floatingStats.map((stat) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: stat.delay, duration: 0.6, ease: "easeOut" }}
          className="hidden lg:flex absolute items-center gap-2.5 px-3 py-2 rounded-xl glass-card-static pointer-events-none"
          style={{ left: stat.x, top: stat.y }}
        >
          <div className="w-7 h-7 rounded-md bg-brand-500/10 flex items-center justify-center">
            <stat.icon className="h-3.5 w-3.5 text-brand-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-100">{stat.label}</span>
            <span className="text-[10px] text-zinc-500 ml-1">{stat.sub}</span>
          </div>
        </motion.div>
      ))}

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-zinc-400 text-xs font-medium cursor-default ring-1 ring-brand-500/10">
            <Sparkles className="h-3 w-3 text-brand-400" />
            AI-Powered Automation Platform
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]"
        >
          <span className="text-zinc-100">Automate business</span>
          <br />
          <span className="gradient-text-brand">workflows with AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-base md:text-lg text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Transform your business operations with intelligent automation.
          Upload documents, define workflows, and let AI handle the rest.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-center gap-4 flex-wrap"
        >
          <Link href="/auth/register">
            <Button size="lg" className="text-base px-8 shadow-lg shadow-brand-500/25 group">
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Link href="#demo">
            <Button variant="outline" size="lg" className="text-base px-8">
              Watch Demo
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 flex flex-col items-center gap-4"
        >
          <div className="flex -space-x-2">
            {avatars.map((a, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full border-2 border-zinc-900 ${a.color} flex items-center justify-center text-[10px] font-medium text-white shadow-sm`}
              >
                {a.initial}
              </div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 bg-brand-500/20 flex items-center justify-center text-[10px] font-medium text-brand-400 shadow-sm">
              +
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-xs text-zinc-600 ml-1">
              Rated 4.9 by <span className="text-zinc-400 font-medium">2,000+</span> teams worldwide
            </span>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] text-zinc-600 tracking-widest uppercase">Scroll</span>
        <div className="w-5 h-8 rounded-full border border-zinc-800 flex justify-center pt-1.5">
          <div className="w-1 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDuration: "1.5s" }} />
        </div>
      </motion.div>
    </section>
  );
}
