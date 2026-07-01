"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: { monthly: "$29", annual: "$23" },
    period: { monthly: "/month", annual: "/month" },
    description: "Perfect for small teams getting started with automation.",
    features: [
      "Up to 5 workflows",
      "1,000 runs/month",
      "500 documents/month",
      "Basic AI insights",
      "Email support",
    ],
    cta: "Start Free Trial",
    href: "/auth/register",
    popular: false,
  },
  {
    name: "Professional",
    price: { monthly: "$79", annual: "$63" },
    period: { monthly: "/month", annual: "/month" },
    description: "For growing teams that need more power and flexibility.",
    features: [
      "Unlimited workflows",
      "10,000 runs/month",
      "5,000 documents/month",
      "Advanced AI insights",
      "Slack & email notifications",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Start Free Trial",
    href: "/auth/register",
    popular: true,
  },
  {
    name: "Enterprise",
    price: { monthly: "$249", annual: "$199" },
    period: { monthly: "/month", annual: "/month" },
    description: "For organizations with advanced security and compliance needs.",
    features: [
      "Everything in Professional",
      "50,000 runs/month",
      "Unlimited documents",
      "Dedicated AI models",
      "SSO & SCIM",
      "Audit logging",
      "99.99% SLA",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    href: "/auth/register",
    popular: false,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="py-28 relative" id="pricing">
      <div className="absolute inset-0 gradient-mesh-subtle pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-zinc-400 text-xs font-medium mb-4 ring-1 ring-brand-500/10">
            <Sparkles className="h-3 w-3 text-brand-400" />
            Pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-4">
            Simple, transparent <span className="gradient-text-brand">pricing</span>
          </h2>
          <p className="text-zinc-500 text-base max-w-2xl mx-auto leading-relaxed mb-8">
            Start free, upgrade as you grow. No hidden fees, no surprises.
          </p>

          {/* Annual/Monthly toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-full glass-card-static">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer",
                !annual
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-500/20"
                  : "text-zinc-400 hover:text-zinc-300"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer",
                annual
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-500/20"
                  : "text-zinc-400 hover:text-zinc-300"
              )}
            >
              Annual
              <span className="ml-1 text-[10px] opacity-80">Save 20%</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {plans.map((plan) => {
            const price = annual ? plan.price.annual : plan.price.monthly;
            const period = annual ? plan.period.annual : plan.period.monthly;

            return (
              <motion.div
                key={plan.name}
                variants={item}
                className={cn(
                  "relative rounded-xl p-6 flex flex-col",
                  plan.popular
                    ? "glass-card ring-1 ring-brand-500/20 shadow-xl shadow-brand-500/5 ring-glow-active"
                    : "glass-card"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-[11px] font-semibold text-white shadow-lg shadow-brand-500/25">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-zinc-100 mb-1">{plan.name}</h3>
                  <p className="text-xs text-zinc-500 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-zinc-100">{price}</span>
                    <span className="text-sm text-zinc-500">{period}</span>
                  </div>
                  {annual && (
                    <p className="text-[11px] text-brand-400 mt-1">
                      Billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-400">
                      <div className="w-4 h-4 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5 text-brand-400" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link href={plan.href} className="block w-full">
                  <Button
                    variant={plan.popular ? "primary" : "outline"}
                    className={cn(
                      "w-full group",
                      plan.popular && "shadow-lg shadow-brand-500/20"
                    )}
                  >
                    {plan.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
