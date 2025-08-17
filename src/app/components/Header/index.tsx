"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image"; // 👈 adicionado
import { toast } from "react-toastify";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getUserProfile, updateMyProfile } from "@/utils/actions/user-data";
import type { UserProps } from "@/utils/types/user";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import {
  ChevronDown,
  DollarSign,
  Info,
  Users,
  Shield,
  Smartphone,
  User,
  MessageCircle,
  Languages,
  LogOut,
} from "lucide-react";

import { useQuiz } from "@/context/QuizContext";

const formSchema = z.object({
  username: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

const Header = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [user, setUser] = useState<UserProps | null>(null);

  const { isClientReady, selectedQuizTitle, setSelectedQuizId, setSelectedQuizTitle } = useQuiz();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    getUserProfile()
      .then((data) => {
        setUser(data);
        reset({ username: data.username, email: data.email, password: "" });
      })
      .catch(() => setUser(null));
  }, [reset]);

  const handleLogout = async () => {
    const res = await fetch("/api/logout", { method: "POST" });
    if (res.ok) {
      toast.success("Logout realizado com sucesso!");
      localStorage.removeItem("selectedQuizId");
      localStorage.removeItem("selectedQuizTitle");
      setSelectedQuizId(null);
      setSelectedQuizTitle("");
      router.push("/login");
    } else {
      toast.error("Erro ao sair da conta.");
    }
  };

  const handleUpdate = async (data: FormValues) => {
    try {
      const payload = {
        username: data.username,
        email: data.email,
        ...(data.password ? { password: data.password } : {}),
      };
      const updated = await updateMyProfile(payload);
      setUser(updated.user);
      toast.success("Conta atualizada com sucesso!");
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar a conta.");
    }
  };

  return (
    <div
      className="
        top-0 left-0 right-0 z-40
        bg-[#3e3e3e]
        h-16 sm:h-16 lg:h-[80px]
        pl-0 lg:pl-[190px]
        pb-6 sm:pb-0 pt-2 
        "
    >
      <div
        className="
          flex items-center justify-between h-full
          px-3 sm:px-4
          max-w-screen-xl mx-auto
          relative
        "
      >
        {/* ESQUERDA: logo (só mobile) + botões */}
        <div
          className="
            flex items-center gap-2 sm:gap-3 
            overflow-x-auto scrollbar-none flex-wrap
          "
        >
          {/* 👇 Logo só no mobile (no desktop o Sidebar já mostra) */}
          <Link href="/" className="block lg:hidden mr-1">
            <Image
              src="/logo-branca.webp"
              alt="Tracking Pesquisas"
              width={110}
              height={28}
              priority
              className="h-6 w-auto object-contain"
            />
          </Link>

          <Button
            variant="outline"
            className="
              bg-[#e74e15] text-white hover:text-[#e74e15]
              h-8 sm:h-9 lg:h-10
              px-3 sm:px-4
              text-xs sm:text-sm
              whitespace-nowrap
            "
            asChild
          >
            <Link href="/">QUESTIONÁRIO</Link>
          </Button>

          <Button
            variant="outline"
            className="
              bg-transparent text-white hover:text-white hover:bg-[#e74e15]
              h-8 sm:h-9 lg:h-10
              px-3 sm:px-4
              text-xs sm:text-sm
              whitespace-nowrap
            "
            asChild
          >
            <Link href="/dashboard/archived">ARQUIVADOS</Link>
          </Button>

          {isClientReady && selectedQuizTitle && (
            <p
              className="
              absolute left-3 top-full mt-1
              text-white text-xs sm:text-sm font-medium
              sm:static sm:mt-0
            "
            >
              Você está trabalhando no questionário:{" "}
              <span className="font-semibold text-orange-400">
                {selectedQuizTitle}
              </span>
            </p>
          )}

        </div>

        {/* DIREITA: usuário / menu */}
        <DropdownMenu onOpenChange={(o) => setOpen(o)}>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer select-none">
              <Avatar className="w-8 h-8 sm:w-9 sm:h-9">
                <AvatarImage src="https://github.com/evandrobitencourt.png" />
                <AvatarFallback>EB</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-white font-medium">
                {user?.username ?? "Usuário"}
              </span>
              <ChevronDown
                className={`hidden sm:block h-4 w-4 text-white transition-transform ${open ? "rotate-180" : ""
                  }`}
              />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">
                  {user?.username ?? "Usuário"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.email ?? "sem e-mail"}
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuItem><DollarSign className="mr-2 h-4 w-4" />Relatório de créditos</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogOpen(true)}><User className="mr-2 h-4 w-4" />Conta</DropdownMenuItem>
            <DropdownMenuItem><Info className="mr-2 h-4 w-4" />Relatórios</DropdownMenuItem>
            <DropdownMenuItem>
              <Smartphone className="mr-2 h-4 w-4" />
              <Link href="/dashboard/pins">Administrar PINs</Link>
            </DropdownMenuItem>
            <DropdownMenuItem><Users className="mr-2 h-4 w-4" />Gerenciar usuários</DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <Link href="/dashboard/interviewers">Gerenciar entrevistadores</Link>
            </DropdownMenuItem>
            <DropdownMenuItem><Shield className="mr-2 h-4 w-4" />Administrar permissões</DropdownMenuItem>
            <DropdownMenuItem><MessageCircle className="mr-2 h-4 w-4" />Integração com WhatsApp</DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem><Languages className="mr-2 h-4 w-4" />Português</DropdownMenuItem>
            <DropdownMenuItem><Languages className="mr-2 h-4 w-4" />Inglês</DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </div>
  );
};

export default Header;
