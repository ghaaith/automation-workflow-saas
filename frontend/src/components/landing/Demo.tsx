"use client";

import { motion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";

export function Demo() {
  return (
    <section className="py-28 relative" id="demo">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-zinc-400 text-xs font-medium mb-4 ring-1 ring-brand-500/10">
            <Sparkles className="h-3 w-3 text-brand-400" />
            Demo
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-4">
            See it in <span className="gradient-text-brand">action</span>
          </h2>
          <p className="text-zinc-500 text-base max-w-xl mx-auto leading-relaxed">
            Watch how teams automate their document workflows in minutes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-xl overflow-hidden border border-zinc-800/50 glass-card aspect-video flex items-center justify-center group cursor-pointer shadow-xl shadow-black/20"
        >
          <div className="absolute inset-0 bg-zinc-950/50 group-hover:bg-zinc-950/30 transition-colors duration-300" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.08)_0%,_transparent_70%)]" />

          {/* Decorative grid lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />

          <div className="relative z-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-full glass flex items-center justify-center group-hover:scale-105 transition-all duration-200 mb-3 group-hover:shadow-lg group-hover:shadow-brand-500/10">
              <Play className="h-6 w-6 text-zinc-200 ml-0.5" />
            </div>
            <p className="text-zinc-400 text-sm font-medium">Watch Demo</p>
            <p className="text-zinc-600 text-xs mt-1">2:34 min</p>
          </div>

          <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-xs text-zinc-600">
            <span>AI Workflow Platform Demo</span>
            <span>2026</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
