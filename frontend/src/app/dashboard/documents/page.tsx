"use client";

import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Inbox } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { DocumentCard } from "@/components/dashboard/DocumentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { documentsApi, organizationsApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Document } from "@/types";
import toast from "react-hot-toast";

export default function DocumentsPage() {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { organization, setOrganization } = useStore();
  const orgId = organization?.id;

  useQuery({
    queryKey: ["current-org"],
    queryFn: () => organizationsApi.getCurrent().then((r) => {
      setOrganization(r.data);
      return r.data;
    }),
    enabled: !orgId,
    retry: false,
  });

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["documents", orgId],
    queryFn: () => documentsApi.list(orgId!) as Promise<Document[]>,
    enabled: !!orgId,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      documentsApi.upload(file, orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded successfully");
    },
    onError: () => {
      toast.error("Failed to upload document");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      for (const file of acceptedFiles) {
        await uploadMutation.mutateAsync(file);
      }
      setUploading(false);
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
      "text/csv": [".csv"],
      "text/plain": [".txt"],
    },
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Documents</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Upload and manage your documents for AI processing
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? "border-brand-500/70 bg-brand-500/5 glass"
              : "border-zinc-800 hover:border-zinc-700 glass glass-hover"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center">
              {uploading ? (
                <div className="h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="h-5 w-5 text-zinc-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">
                {isDragActive
                  ? "Drop files here"
                  : "Drag & drop files or click to browse"}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                PDF, CSV, TXT, PNG, JPG — up to 50MB
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title="No documents yet"
            description="Upload your first document to start processing with AI workflows."
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                {documents.length} document{documents.length !== 1 ? "s" : ""}
              </p>
            </div>

            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
