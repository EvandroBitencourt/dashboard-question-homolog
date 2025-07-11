"use client";

import { toast } from "react-toastify";

interface HandleLoginProps {
  email: string;
  password: string;
  setLoading: (state: boolean) => void;
  router: any;
}

export async function handleLogin({
  email,
  password,
  setLoading,
  router,
}: HandleLoginProps) {
  setLoading(true);

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg =
        data?.messages?.error?.login ??
        (typeof data?.messages?.error === "string"
          ? data.messages.error
          : null) ??
        data?.message ??
        "Usuário ou senha inválidos.";

      toast.error(errorMsg);
      return;
    }

    toast.success("Login realizado com sucesso!");
    router.push("/");
  } catch (err: any) {
    toast.error(err.message || "Erro ao fazer login.");
  } finally {
    setLoading(false);
  }
}
