"use client";

import { motion } from "framer-motion";
import {
  FileText,
  GitBranch,
  Shield,
  Puzzle,
  BarChart3,
  Bell,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "AI Document Processing",
    description:
      "Extract, classify, and analyze documents with state-of-the-art AI. Supports PDF, images, CSV, and more.",
    size: "lg" as const,
    accent: "from-brand-500/20 to-brand-500/5",
    iconBg: "bg-brand-500/10 text-brand-400",
    borderColor: "border-brand-500/10",
  },
  {
    icon: Shield,
    title: "Multi-Tenant SaaS",
    description:
      "Enterprise-grade multi-tenancy with isolated orgs, role-based access control, and audit logging.",
    size: "sm" as const,
    accent: "from-accent-blue/20 to-accent-blue/5",
    iconBg: "bg-accent-blue/10 text-accent-blue",
    borderColor: "border-accent-blue/10",
  },
  {
    icon: GitBranch,
    title: "Workflow Automation",
    description:
      "Build powerful automations with a visual builder. Connect triggers, AI actions, conditions, and outputs.",
    size: "sm" as const,
    accent: "from-accent-emerald/20 to-accent-emerald/5",
    iconBg: "bg-accent-emerald/10 text-accent-emerald",
    borderColor: "border-accent-emerald/10",
  },
  {
    icon: Puzzle,
    title: "Integrations",
    description:
      "Connect with Slack, email, CRMs, accounting tools, and any REST API for seamless data flow.",
    size: "sm" as const,
    accent: "from-accent-amber/20 to-accent-amber/5",
    iconBg: "bg-accent-amber/10 text-accent-amber",
    borderColor: "border-accent-amber/10",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Monitor workflow performance, document processing stats, and AI insights in a rich dashboard.",
    size: "sm" as const,
    accent: "from-accent-rose/20 to-accent-rose/5",
    iconBg: "bg-accent-rose/10 text-accent-rose",
    borderColor: "border-accent-rose/10",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Get notified on workflow completions, errors, and AI-generated insights via Slack, email, or webhooks.",
    size: "sm" as const,
    accent: "from-brand-500/20 to-brand-500/5",
    iconBg: "bg-brand-500/10 text-brand-400",
    borderColor: "border-brand-500/10",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    description:
      "Built-in AI assistant that helps you design workflows, interpret results, and optimize your automations.",
    size: "sm" as const,
    accent: "from-accent-blue/20 to-accent-blue/5",
    iconBg: "bg-accent-blue/10 text-accent-blue",
    borderColor: "border-accent-blue/10",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section className="py-28 relative" id="features">
      <div className="absolute inset-0 gradient-mesh-subtle pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-zinc-400 text-xs font-medium mb-4 ring-1 ring-brand-500/10">
            <Sparkles className="h-3 w-3 text-brand-400" />
            Platform Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-4">
            Everything you need to <span className="gradient-text-brand">automate</span>
          </h2>
          <p className="text-zinc-500 text-base max-w-2xl mx-auto leading-relaxed">
            Powerful features that work together to transform your business operations.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={item}
              className={`
                relative rounded-xl p-6 group cursor-default overflow-hidden
                ${feature.size === "lg" ? "md:col-span-2 md:row-span-1" : ""}
                glass-card
              `}
            >
              {/* Gradient accent on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              <div className="relative z-10">
                <div
                  className={`w-10 h-10 rounded-lg ${feature.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-200`}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-12">
        <div className="divider-gradient" />
      </div>
    </section>
  );
}
