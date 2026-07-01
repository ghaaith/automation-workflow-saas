"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Building2,
  Key,
  Users,
  CreditCard,
  Bell,
  Palette,
  Mail,
  Copy,
  Check,
  Plus,
  X,
  Zap,
  ExternalLink,
  TestTube,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/lib/store";
import { integrationsApi } from "@/lib/api";
import type { Integration } from "@/types";
import toast from "react-hot-toast";

const tabs = [
  { id: "general", label: "General", icon: Building2 },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "email", label: "Email", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Zap },
  { id: "appearance", label: "Appearance", icon: Palette },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const { organization } = useStore();

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("Copied to clipboard");
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
  };

  const renderTab = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Organization Settings
                </h3>
                <p className="text-xs text-zinc-500">
                  Manage your organization details
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Organization name"
                  defaultValue={organization?.name}
                />
                <Input
                  label="Slug"
                  defaultValue={organization?.slug}
                />
                <div className="flex justify-end pt-2">
                  <Button size="sm">Save Changes</Button>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Danger Zone
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500 mb-3">
                  Irreversible actions — proceed with caution
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Archive Organization
                  </Button>
                  <Button variant="danger" size="sm">
                    Delete Organization
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "api-keys":
        return (
          <div className="space-y-4">
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-sm font-semibold text-zinc-100">
                  API Keys
                </h3>
                <p className="text-xs text-zinc-500">
                  Keys for programmatic access to the API
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Production", key: "aiw_prod_abc123def456ghi789jkl" },
                  { name: "Development", key: "aiw_dev_mno123pqr456stu789vwx" },
                ].map((apiKey) => (
                  <div
                    key={apiKey.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800"
                  >
                    <div>
                      <p className="text-sm text-zinc-300">{apiKey.name}</p>
                      <code className="text-xs text-zinc-600 font-mono">
                        {apiKey.key.slice(0, 16)}...
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(apiKey.key)}
                        icon={
                          copiedKey === apiKey.key ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )
                        }
                      />
                      <Button size="sm" variant="ghost">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" icon={<Plus className="h-3.5 w-3.5" />}>
                  Generate New Key
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "team":
        return (
          <div className="space-y-4">
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Team Members
                </h3>
                <p className="text-xs text-zinc-500">
                  Manage who has access to this organization
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <EmptyState
                  icon={<Users className="h-8 w-8" />}
                  title="No team members"
                  description="Invite team members to collaborate."
                />
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Invite Member
                </h3>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50"
                  />
                  <Button size="sm" onClick={handleInvite}>
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "billing":
        return (
          <div className="space-y-4">
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Current Plan
                </h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-zinc-100">Team Plan</h4>
                      <Badge variant="success" size="sm">
                        Active
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500">
                      $49/month &middot; 5 members &middot; 10,000 runs/mo
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Change Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Payment Method
                </h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="w-10 h-7 rounded bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[8px] font-bold text-white">
                    VISA
                  </div>
                  <div>
                    <p className="text-sm text-zinc-300">
                      •••• 4242
                    </p>
                    <p className="text-xs text-zinc-600">Expires 12/28</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "notifications":
        return (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-zinc-100">
                Notification Preferences
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Workflow completed",
                "Workflow failed",
                "New document processed",
                "AI insight generated",
                "Team member invited",
              ].map((item) => (
                <label
                  key={item}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-zinc-300">{item}</span>
                  <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-zinc-800 cursor-pointer transition-colors">
                    <span className="inline-block h-3.5 w-3.5 translate-x-1 rounded-full bg-zinc-400 transition-transform" />
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>
        );

      case "email":
        return (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-zinc-100">
                Email Configuration
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Configure email sending for workflow notifications. Uses Resend (resend.com) — get a free API key.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Resend API Key
                </label>
                <input
                  type="password"
                  placeholder="re_..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 transition-colors"
                />
                <p className="text-[10px] text-zinc-600">
                  Get a free key at{" "}
                  <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    resend.com
                  </a>
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  From Email
                </label>
                <input
                  type="email"
                  placeholder="onboarding@resend.dev"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 transition-colors"
                />
                <p className="text-[10px] text-zinc-600">
                  Default: onboarding@resend.dev. Verify a domain at Resend to use your own sender.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => toast.success("Email settings saved (stored in .env for now)")}
              >
                Save
              </Button>
            </CardContent>
          </Card>
        );

      case "integrations":
        return <IntegrationsTab />;

      case "appearance":
        return (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-zinc-100">
                Appearance
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-zinc-400 mb-3">Theme</p>
                <div className="flex gap-3">
                  {[
                    { label: "Dark", active: true },
                    { label: "Light", active: false },
                    { label: "System", active: false },
                  ].map((theme) => (
                    <button
                      key={theme.label}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        theme.active
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your organization and account settings
          </p>
        </div>

        <div className="flex gap-8">
          <nav className="w-48 shrink-0 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-indigo-500/10 text-indigo-400"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 max-w-2xl">{renderTab()}</div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channel, setChannel] = useState("#general");
  const [message, setMessage] = useState("Test from AI Workflow");
  const [saving, setSaving] = useState(false);

  const loadIntegrations = () => {
    setLoading(true);
    integrationsApi.list("slack").then((r) => {
      setIntegrations(r.data.integrations);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleCreate = async () => {
    if (!name || !webhookUrl) {
      toast.error("Name and Webhook URL are required");
      return;
    }
    setSaving(true);
    try {
      await integrationsApi.create({
        integration_type: "slack",
        name,
        config: { webhook_url: webhookUrl, channel, message },
      });
      toast.success("Slack integration created!");
      setShowForm(false);
      setName("");
      setWebhookUrl("");
      setChannel("#general");
      setMessage("Test from AI Workflow");
      loadIntegrations();
    } catch {
      toast.error("Failed to create integration");
    }
    setSaving(false);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const r = await integrationsApi.test(id);
      if (r.data.success) {
        toast.success("Slack test message sent!");
      } else {
        toast.error(r.data.message || "Test failed");
      }
    } catch {
      toast.error("Test request failed");
    }
    setTestingId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await integrationsApi.delete(id);
      toast.success("Integration deleted");
      loadIntegrations();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Slack Integrations</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Connect Slack to send notifications from your workflows
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowForm(!showForm)}
              icon={showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            >
              {showForm ? "Cancel" : "Add Slack"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className="space-y-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <Input
                label="Integration Name"
                placeholder="My Workspace Slack"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Webhook URL"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <Input
                label="Channel"
                placeholder="#general"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-400">Test Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
                />
              </div>
              <Button onClick={handleCreate} loading={saving} className="w-full">
                Create Integration
              </Button>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-zinc-500 py-4 text-center">Loading...</div>
          ) : integrations.length === 0 ? (
            <EmptyState
              icon={<Zap className="h-8 w-8" />}
              title="No Slack integrations"
              description="Add a Slack webhook to send workflow notifications to your team."
            />
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-zinc-100">{integration.name}</h4>
                      <Badge variant="success" size="sm">Slack</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono truncate">
                      ID: {integration.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(integration.id)}
                      loading={testingId === integration.id}
                      icon={<TestTube className="h-3.5 w-3.5" />}
                    >
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(integration.id);
                        toast.success("Integration ID copied");
                      }}
                      icon={<Copy className="h-3.5 w-3.5" />}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(integration.id)}
                      icon={<X className="h-3.5 w-3.5 text-zinc-500 hover:text-red-400" />}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <h3 className="text-sm font-semibold text-zinc-100">Need a Webhook URL?</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Create one in your Slack workspace, then paste it above.
          </p>
        </CardHeader>
        <CardContent>
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Slack Webhooks page
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
