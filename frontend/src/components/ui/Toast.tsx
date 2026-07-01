"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      gutter={12}
      containerClassName="!bottom-6 !right-6"
      toastOptions={{
        duration: 4000,
        style: {
          background: "rgba(24, 24, 27, 0.9)",
          color: "#fafafa",
          border: "1px solid rgba(39, 39, 42, 0.6)",
          borderRadius: "10px",
          padding: "12px 16px",
          fontSize: "13px",
          lineHeight: "1.4",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        },
        success: {
          iconTheme: { primary: "#22c55e", secondary: "#18181b" },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#18181b" },
        },
      }}
    />
  );
}
