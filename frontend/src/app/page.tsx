"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Zap } from "lucide-react";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Demo } from "@/components/landing/Demo";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="fixed top-4 left-4 right-4 z-50 rounded-xl glass-card shadow-lg shadow-black/10 ring-1 ring-brand-500/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-brand-500 group-hover:scale-105 transition-transform duration-200 shadow-sm shadow-brand-500/20">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm gradient-text-brand">AI Workflow</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 mr-4">
              {["Features", "Pricing", "Demo"].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all duration-150 cursor-pointer"
                >
                  {item}
                </Link>
              ))}
            </div>
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="shadow-sm shadow-brand-500/20">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Hero />
        <Features />
        <Demo />
        <Testimonials />
        <Pricing />
        <Footer />
      </motion.main>
    </div>
  );
}
