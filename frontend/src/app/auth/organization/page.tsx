"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { slugify } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { organizationsApi } from "@/lib/api";
import toast from "react-hot-toast";

export default function OrganizationPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setOrganization } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Please enter an organization name");
      return;
    }
    const slug = slugify(name);
    setLoading(true);
    try {
      const { data } = await organizationsApi.create({ name, slug });
      setOrganization(data);
      toast.success(`Welcome to ${data.name}!`);
      router.push("/dashboard");
    } catch {
      toast.error("Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      const { data } = await organizationsApi.getCurrent();
      setOrganization(data);
    } catch {
      // no org yet, that's fine
    }
    router.push("/dashboard");
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-6 shadow-lg shadow-brand-500/20">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Name your organization
          </h1>
          <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
            This will be your workspace for all workflows and documents
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl glass p-6 space-y-4 shadow-xl shadow-black/20"
        >
          <Input
            label="Organization name"
            type="text"
            placeholder="Acme Corp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<Building2 className="h-4 w-4" />}
          />

          {name && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-zinc-500"
            >
              Your URL: {slugify(name)}.aiworkflow.app
            </motion.p>
          )}

          <Button type="submit" className="w-full shadow-lg shadow-brand-500/20" icon={<ArrowRight className="h-4 w-4" />}>
            Create Organization
          </Button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </form>
      </motion.div>
    </div>
  );
}
