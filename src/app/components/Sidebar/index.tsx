"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Settings,
  LogOut,
  Menu,
  Speech,
  Users,
  ChartPie,
  MessageSquareQuote,
  FileQuestion,
  Smartphone,
  MapPin,
  ChartSpline,
  Pencil,
  FileDown,
} from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuiz } from "@/context/QuizContext";
import Swal from "sweetalert2";

const Sidebar = () => {
  const { selectedQuizId } = useQuiz();

  const handleProtectedNavigation = (href: string) => {
    console.log("Tentando acessar:", href, "selectedQuizId:", selectedQuizId);

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

  return (
    <div className="flex w-full flex-col bg-muted/40">
      {/* DESKTOP MENU */}
      <aside className="fixed inset-y-0 left-0 z-10 w-[190px] border-r bg-[#3e3e3e] text-white sm:flex flex-col hidden">
        {/* Logo */}
        <div className="flex p-3 items-center justify-center border-[#e74e15]">
          <Link href="/">
            <Image
              src="/logo-branca.webp"
              alt="Logo do site"
              quality={100}
              priority={true}
              width={130}
              height={100}
              className="object-cover"
            />
          </Link>
        </div>

        {/* Navegação sempre visível */}
        <nav className="flex flex-col items-center flex-1 gap-6 py-5 text-[#f7f7f7]">
          <TooltipProvider>
            <SidebarLink
              onClick={() => handleProtectedNavigation("/dashboard/panel")}
              icon={<ChartSpline className="h-5 w-5" />}
              label="Painel"
            />
            <SidebarLink
              onClick={() => handleProtectedNavigation("/dashboard/inspector")}
              icon={<ChartPie className="h-5 w-5" />}
              label="Acompanhamento de variáveis"
            />
            <SidebarLink
              onClick={() => handleProtectedNavigation("/dashboard/question")}
              icon={<Pencil className="h-5 w-5" />}
              label="Editar questões"
            />
            <SidebarLink
              onClick={() => handleProtectedNavigation("/dashboard/quotas")}
              icon={<MessageSquareQuote className="h-5 w-5" />}
              label="Quotas"
            />
            <SidebarLink
              onClick={() =>
                handleProtectedNavigation("/dashboard/manage-devices")
              }
              icon={<Smartphone className="h-5 w-5" />}
              label="Gerenciar dispositivos"
            />
            <SidebarLink
              onClick={() => handleProtectedNavigation("/dashboard/faq")}
              icon={<MapPin className="h-5 w-5" />}
              label="Localização"
            />
            <SidebarLink
              onClick={() =>
                handleProtectedNavigation("/dashboard/export-form")
              }
              icon={<FileDown className="h-5 w-5" />}
              label="Exportar"
            />
            <SidebarLink
              onClick={() =>
                handleProtectedNavigation("/dashboard/manage-team")
              }
              icon={<Users className="h-5 w-5" />}
              label="Gerencias time"
            />
          </TooltipProvider>
        </nav>
      </aside>

      {/* MOBILE MENU */}
      <div className="sm:hidden flex flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 border-b bg-gray-900 text-white gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="secondary" className="bg-amber-300">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Abrir / fechar menu</span>
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="p-4">
              <nav className="grid gap-4 text-base font-medium">
                <MobileSidebarLink
                  href="/dashboard/banner-home"
                  icon={<ChartSpline className="h-5 w-5" />}
                  label="Painel"
                />
                <MobileSidebarLink
                  href="/dashboard/banner-home"
                  icon={<ChartPie className="h-5 w-5" />}
                  label="Acompanhamento de variáveis"
                />
                <MobileSidebarLink
                  href="/dashboard/question"
                  icon={<FileQuestion className="h-5 w-5" />}
                  label="Editar questões"
                />
                <MobileSidebarLink
                  href="/dashboard/quotas"
                  icon={<MessageSquareQuote className="h-5 w-5" />}
                  label="Quotas"
                />
                <MobileSidebarLink
                  href="/dashboard/modalidades"
                  icon={<Smartphone className="h-5 w-5" />}
                  label="Gerenciar dispositivos"
                />
                <MobileSidebarLink
                  href="/dashboard/faq"
                  icon={<MapPin className="h-5 w-5" />}
                  label="Localização"
                />
                <MobileSidebarLink
                  href="/dashboard/depoimentos"
                  icon={<Speech className="h-5 w-5" />}
                  label="Depoimentos"
                />
                <MobileSidebarLink
                  href="/dashboard/register"
                  icon={<Users className="h-5 w-5" />}
                  label="Gerenciar time"
                />

                <button className="flex items-center gap-3 text-red-500">
                  <LogOut className="h-5 w-5" /> Sair
                </button>
              </nav>
            </SheetContent>
          </Sheet>

          <Image
            src="/logo-icone-power.png"
            alt="Logo do site"
            quality={100}
            priority={true}
            width={40}
            height={40}
            className="object-cover"
          />
        </header>
      </div>
    </div>
  );
};

function SidebarLink({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="flex h-10 w-15 bg-[#e74e15] items-center justify-center rounded-lg transition-colors hover:bg-gray-800"
        >
          {icon}
          <span className="sr-only">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function MobileSidebarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const { selectedQuizId } = useQuiz();

  const handleClick = () => {
    console.log("📱 Clicou:", href, "selectedQuizId:", selectedQuizId);

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

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 text-muted-foreground hover:text-foreground"
    >
      {icon} {label}
    </button>
  );
}

export default Sidebar;
