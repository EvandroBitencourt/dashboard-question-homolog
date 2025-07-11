// Importa o objeto de resposta do Next.js que permite redirecionar ou seguir com a requisição
import { NextResponse } from "next/server";

// Tipagem da requisição do Next.js (NextRequest)
import type { NextRequest } from "next/server";

// Função principal do middleware que intercepta todas as rotas definidas no `config.matcher`
export function middleware(request: NextRequest) {
  // Recupera o token salvo no cookie HttpOnly (nome do cookie: "token")
  const token = request.cookies.get("token")?.value;

  // Verifica se a rota atual começa com "/dashboard", ou seja, se é uma rota protegida
  const isProtected = request.nextUrl.pathname.startsWith("/dashboard");

  // Se a rota for protegida e não houver token, redireciona para a página de login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Caso o token exista (usuário autenticado), permite seguir normalmente
  return NextResponse.next();
}

// Define as rotas que serão interceptadas por este middleware
export const config = {
  // Aqui o matcher define que qualquer rota que comece com "/dashboard" será protegida
  matcher: ["/dashboard/:path*"],
};
