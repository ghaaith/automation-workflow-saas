"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Sparkles } from "lucide-react";

const testimonials = [
  {
    quote: "AI Workflow cut our document processing time by 80%. The automation builder is incredibly intuitive — our team was building workflows within hours, not days.",
    name: "Sarah Chen",
    role: "VP of Operations, Finova",
    initials: "SC",
    color: "bg-brand-500",
    rating: 5,
  },
  {
    quote: "We evaluated 12 automation platforms. AI Workflow won because it actually understands complex document structures. The AI insights alone saved us thousands in manual review costs.",
    name: "Marcus Johnson",
    role: "CTO, DataStream Inc.",
    initials: "MJ",
    color: "bg-accent-emerald",
    rating: 5,
  },
  {
    quote: "The multi-tenant setup made rolling this out to our enterprise clients seamless. Role-based access, audit logs, and dedicated orgs — it has everything we needed for compliance.",
    name: "Priya Patel",
    role: "Head of Product, CloudSync",
    initials: "PP",
    color: "bg-accent-blue",
    rating: 5,
  },
];

export function Testimonials() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((c) => (c + 1) % testimonials.length);
  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-28 relative overflow-hidden" id="testimonials">
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-zinc-400 text-xs font-medium mb-4 ring-1 ring-brand-500/10">
            <Sparkles className="h-3 w-3 text-brand-400" />
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-4">
            Trusted by <span className="gradient-text-brand">industry leaders</span>
          </h2>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-xl glass-card p-8 md:p-10 text-center"
            >
              {/* Rating */}
              <div className="flex items-center justify-center gap-1 mb-6">
                {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <blockquote className="text-base md:text-lg text-zinc-300 leading-relaxed mb-8 max-w-2xl mx-auto">
                &ldquo;{testimonials[current].quote}&rdquo;
              </blockquote>

              <div className="flex items-center justify-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${testimonials[current].color} flex items-center justify-center text-xs font-semibold text-white shadow-sm`}
                >
                  {testimonials[current].initials}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-100">{testimonials[current].name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{testimonials[current].role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={prev}
              className="p-2 rounded-lg glass-card-static text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  i === current ? "bg-brand-500 w-6 h-1.5" : "bg-zinc-700 w-1.5 h-1.5 hover:bg-zinc-500"
                }`}
              />
            ))}
            <button
              onClick={next}
              className="p-2 rounded-lg glass-card-static text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
