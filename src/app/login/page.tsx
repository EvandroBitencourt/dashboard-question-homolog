"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Image from "next/image";
import Logo from "../../../public/logo-branca.webp";
import { handleLogin } from "@/utils/actions/login";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin({ email, password, setLoading, router });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-[#3e3e3e] text-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-4">
          <Image
            src={Logo}
            alt="Logo do site"
            quality={100}
            priority={true}
            width={130}
            height={100}
            className="object-cover"
          />
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Digite seu email"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
            >
              Senha
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Digite sua senha"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-[#e74e15] hover:bg-[#ec8f6d] text-white"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
