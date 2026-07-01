"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { authApi, usersApi } from "@/lib/api";
import { setTokens, clearTokens } from "@/lib/auth";
import type { LoginRequest, RegisterRequest } from "@/types";
import toast from "react-hot-toast";

function resolveError(err: unknown): string {
  if (err && typeof err === "object" && "detail" in err) {
    return (err as { detail: string }).detail;
  }
  if (err && typeof err === "object" && "message" in err) {
    return (err as { message: string }).message;
  }
  return "Something went wrong";
}

export function useAuth() {
  const { setUser, setOrganization, setAuthenticated, user, isAuthenticated } =
    useStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { isLoading: isAuthLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        const { data } = await usersApi.getMe();
        setUser(data);
        setAuthenticated(true);
        return data;
      } catch {
        clearTokens();
        setUser(null);
        setAuthenticated(false);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: typeof window !== "undefined" && !!localStorage.getItem("access_token"),
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
  });

  const login = async (data: LoginRequest) => {
    try {
      const { data: tokens } = await loginMutation.mutateAsync(data);
      setTokens(tokens.access_token, tokens.refresh_token);
      const { data: userData } = await usersApi.getMe();
      setUser(userData);
      setAuthenticated(true);
      queryClient.setQueryData(["current-user"], userData);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(resolveError(err));
      throw err;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const { data: tokens } = await registerMutation.mutateAsync(data);
      setTokens(tokens.access_token, tokens.refresh_token);
      const { data: userData } = await usersApi.getMe();
      setUser(userData);
      setAuthenticated(true);
      queryClient.setQueryData(["current-user"], userData);
      toast.success("Account created!");
      router.push("/auth/organization");
    } catch (err) {
      toast.error(resolveError(err));
      throw err;
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setOrganization(null);
    setAuthenticated(false);
    queryClient.clear();
    router.push("/");
  };

  return {
    user,
    isAuthenticated,
    isAuthLoading,
    login,
    register,
    logout,
    loginLoading: loginMutation.isPending,
    registerLoading: registerMutation.isPending,
  };
}
