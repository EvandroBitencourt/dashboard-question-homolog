import { NextResponse } from "next/server";

// evita cache do App Router p/ esta rota
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Prefira uma env de SERVIDOR (API_URL). Mantive fallback para a sua pública.
    const BASE =
      process.env.API_URL || process.env.NEXT_PUBLIC_API_URL; // ex.: https://api.trackingpesquisas.com.br
    if (!BASE) {
      return NextResponse.json(
        { message: "API base URL ausente (configure API_URL/NEXT_PUBLIC_API_URL)" },
        { status: 500 }
      );
    }

    // Ajuste o caminho conforme o seu backend:
    // se o endpoint externo for /login, troque para '/login'
    const url = `${BASE.replace(/\/+$/, "")}/api/login`;

    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    // parse seguro (não quebra se vier vazio/HTML)
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text || null };
    }

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Usuário ou senha inválidos." },
        { status: res.status }
      );
    }

    // garante que exista token no payload
    const token: string | undefined =
      data?.access_token || data?.token || data?.data?.access_token;

    if (!token) {
      return NextResponse.json(
        { message: "Resposta da API sem token de acesso." },
        { status: 502 }
      );
    }

    const response = NextResponse.json(
      { message: "Login realizado com sucesso" },
      { status: 200 }
    );

    // Cookie seguro para produção
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 dia
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "Erro interno. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}
