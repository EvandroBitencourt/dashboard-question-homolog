"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Users,
  ChartPie,
  MessageSquareQuote,
  Smartphone,
  MapPin,
  ChartSpline,
  Pencil,
  FileDown,
  Database, // <<< novo ícone
} from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useQuiz } from "@/context/QuizContext";
import Swal from "sweetalert2";

/** Botão genérico usado nos dois layouts */
function IconBtn({
  onClick,
  children,
  className = "",
  size = "md",
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  const base =
    "grid place-items-center rounded-lg bg-[#e74e15] text-white transition-colors hover:bg-[#d9441e]";
  const dims = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  return (
    <button onClick={onClick} className={`${base} ${dims} ${className}`}>
      {children}
    </button>
  );
}

const Sidebar = () => {
  const { selectedQuizId } = useQuiz();

  const handleProtectedNavigation = (href: string) => {
    if (!selectedQuizId || selectedQuizId <= 0 || isNaN(selectedQuizId)) {
      Swal.fire({
        icon: "warning",
        title: "Selecione um questionário",
        text: "Você precisa selecionar um questionário antes de continuar.",
      });
      return;
    }
    window.location.assign(href);
  };

  // Um único array define os itens (usado no desktop e no mobile)
  const items: { label: string; icon: React.ReactNode; href: string }[] = [
    { label: "Painel", icon: <ChartSpline className="h-5 w-5" />, href: "/dashboard/panel" },
    {
      label: "Acompanhamento de variáveis",
      icon: <ChartPie className="h-5 w-5" />,
      href: "/dashboard/inspector",
    },
    {
      label: "Editar questões",
      icon: <Pencil className="h-5 w-5" />,
      href: "/dashboard/question",
    },
    {
      label: "Quotas",
      icon: <MessageSquareQuote className="h-5 w-5" />,
      href: "/dashboard/quotas",
    },
    {
      label: "Gerenciar dispositivos",
      icon: <Smartphone className="h-5 w-5" />,
      href: "/dashboard/manage-devices",
    },
    {
      label: "Localização",
      icon: <MapPin className="h-5 w-5" />,
      href: "/dashboard/faq",
    },

    // <<< NOVO ITEM – ENTREVISTAS / COLETAS >>>
    {
      label: "Entrevistas",
      icon: <Database className="h-5 w-5" />,
      href: "/dashboard/interviews", // rota da página que você criou
    },

    {
      label: "Exportar",
      icon: <FileDown className="h-5 w-5" />,
      href: "/dashboard/export-form",
    },
    {
      label: "Gerenciar time",
      icon: <Users className="h-5 w-5" />,
      href: "/dashboard/manage-team",
    },
  ];

  return (
    <div className="flex w-full flex-col bg-muted/40">
      {/* ===== DESKTOP (sm+) – sidebar fixa à esquerda ===== */}
      <aside className="hidden sm:flex fixed inset-y-0 left-0 z-10 w-[190px] border-r bg-[#3e3e3e] text-white flex-col">
        {/* Logo */}
        <div className="flex p-3 items-center justify-center">
          <Link href="/">
            <Image
              src="/logo-branca.webp"
              alt="Logo do site"
              width={130}
              height={100}
              priority
              className="object-cover"
            />
          </Link>
        </div>

        {/* Ícones */}
        <nav className="flex flex-col items-center flex-1 gap-6 py-5 text-[#f7f7f7]">
          <TooltipProvider>
            {items.map((it) => (
              <Tooltip key={it.label}>
                <TooltipTrigger asChild>
                  <IconBtn onClick={() => handleProtectedNavigation(it.href)}>
                    {it.icon}
                  </IconBtn>
                </TooltipTrigger>
                <TooltipContent side="right">{it.label}</TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </nav>
      </aside>

      {/* ===== MOBILE (<sm) – barra superior fixa com ícones roláveis ===== */}
      <div className="sm:hidden flex flex-col">
        {/* Barra de ícones; fica logo abaixo do Header (que tem h-14) */}
        <div
          className="
            sticky top-14 z-30
            bg-[#111827] text-white
            border-b border-black/10
          "
        >
          <div
            className="
              flex items-center gap-3 px-3 py-2
              overflow-x-auto no-scrollbar
            "
          >
            {items.map((it) => (
              <div key={it.label} className="flex flex-col items-center gap-1">
                <IconBtn
                  size="sm"
                  onClick={() => handleProtectedNavigation(it.href)}
                  className="shrink-0"
                >
                  {it.icon}
                </IconBtn>
                {/* legenda opcional; escondida em telas muito pequenas */}
                <span className="text-[10px] text-gray-200 whitespace-nowrap hidden xs:block">
                  {it.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
