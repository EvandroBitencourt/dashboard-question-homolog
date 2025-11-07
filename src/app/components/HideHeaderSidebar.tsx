"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";

export function HideHeaderSidebar() {
  const pathname = usePathname();

  // Rotas que NÃO devem exibir Header e Sidebar
  const hideOnRoutes = ["/login", "/form"];
  const shouldHide =
    !!pathname && hideOnRoutes.some((route) => pathname.startsWith(route));

  if (shouldHide) return null;

  return (
    <>
      <Header />
      <Sidebar />
    </>
  );
}
