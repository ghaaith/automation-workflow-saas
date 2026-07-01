"use client";

import { Zap, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Integrations", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
      { label: "GDPR", href: "#" },
    ],
  },
];

const socialLinks = [
  { label: "X", href: "#" },
  { label: "LI", href: "#" },
  { label: "GH", href: "#" },
  { label: "DI", href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-5 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 shadow-sm shadow-brand-500/20">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm text-zinc-100">AI Workflow</span>
            </div>
            <p className="text-sm text-zinc-500 max-w-sm leading-relaxed mb-6">
              Automate business workflows with AI. The modern platform for
              intelligent document processing and workflow automation.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="w-8 h-8 rounded-lg glass-card-static flex items-center justify-center text-[11px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 transition-all cursor-pointer"
                >
                  {social.label}
                </Link>
              ))}
            </div>
          </div>

          {footerLinks.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-medium text-zinc-300 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-150 inline-flex items-center gap-1 cursor-pointer group"
                    >
                      {link.label}
                      <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-0.5 group-hover:opacity-100 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider-gradient mb-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <span>&copy; {new Date().getFullYear()} AI Workflow. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-zinc-400 transition-colors cursor-pointer">Privacy</Link>
            <Link href="#" className="hover:text-zinc-400 transition-colors cursor-pointer">Terms</Link>
            <Link href="#" className="hover:text-zinc-400 transition-colors cursor-pointer">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
