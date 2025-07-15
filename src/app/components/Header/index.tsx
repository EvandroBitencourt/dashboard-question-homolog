"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  password: z
    .string()
    .min(6, "Mínimo 6 caracteres")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const Header = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [user, setUser] = useState<UserProps | null>(null);

  const { selectedQuizTitle } = useQuiz(); // pega o título direto do contexto

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    getUserProfile()
      .then((data) => {
        setUser(data);
        reset({
          username: data.username,
          email: data.email,
          password: "",
        });
      })
      .catch(() => setUser(null));
  }, [reset]);

  const handleLogout = async () => {
    const res = await fetch("/api/logout", { method: "POST" });

    if (res.ok) {
      toast.success("Logout realizado com sucesso!");
      localStorage.removeItem("selectedQuizId");
      localStorage.removeItem("selectedQuizTitle");
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
      toast.error(
        err instanceof Error ? err.message : "Erro ao atualizar a conta."
      );
    }
  };

  return (
    <div className="top-0 left-0 right-0 z-40 h-[80px] bg-[#3e3e3e] pl-[190px]">
      <div className="flex items-center justify-between h-full px-4 max-w-screen-xl mx-auto">
        <div className="gap-3 flex items-center">
          <Button
            variant="outline"
            className="bg-[#e74e15] text-white hover:text-[#e74e15]"
            asChild
          >
            <Link href="/">QUESTIONÁRIO</Link>
          </Button>

          <Button
            variant="outline"
            className="bg-transparent text-white hover:text-white hover:bg-[#e74e15]"
            asChild
          >
            <Link href="/dashboard/archived">ARQUIVADOS</Link>
          </Button>

          {selectedQuizTitle && (
            <p className="text-white font-medium mt-1">
              Você está trabalhando no questionário:{" "}
              <span className="font-semibold text-orange-400">
                {selectedQuizTitle}
              </span>
            </p>
          )}
        </div>

        <DropdownMenu onOpenChange={(open) => setOpen(open)}>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://github.com/evandrobitencourt.png" />
                <AvatarFallback>EB</AvatarFallback>
              </Avatar>
              <span className="text-white font-medium">
                {user?.username ?? "Usuário"}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-white transition-transform ${
                  open ? "rotate-180" : ""
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

            <DropdownMenuItem>
              <DollarSign className="mr-2 h-4 w-4" />
              Relatório de créditos
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setDialogOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              Conta
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Info className="mr-2 h-4 w-4" />
              Relatórios
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Smartphone className="mr-2 h-4 w-4" />
              Administrar PINs
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" />
              Gerenciar usuários
            </DropdownMenuItem>

            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <Link href="/dashboard/interviewers">
                Gerenciar entrevistadores
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Shield className="mr-2 h-4 w-4" />
              Administrar permissões
            </DropdownMenuItem>

            <DropdownMenuItem>
              <MessageCircle className="mr-2 h-4 w-4" />
              Integração com WhatsApp
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <Languages className="mr-2 h-4 w-4" />
              Português
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Languages className="mr-2 h-4 w-4" />
              Inglês
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Editar conta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input type="text" {...register("username")} />
                {errors.username && (
                  <p className="text-red-500 text-sm">
                    {errors.username.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">E-mail</label>
                <Input type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Nova senha</label>
                <Input type="password" {...register("password")} />
                {errors.password && (
                  <p className="text-red-500 text-sm">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-[#e74e15] text-white">
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Header;
