import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      // ⚠️ Se a API retornar erro, devolve com a mesma mensagem
      return NextResponse.json(
        { message: data?.message || "Usuário ou senha inválidos." },
        { status: res.status }
      );
    }

    // ✅ Login OK – cria resposta e define cookie com o token
    const response = NextResponse.json(
      { message: "Login realizado com sucesso" },
      { status: 200 }
    );

    // 🔐 Grava o token como cookie HttpOnly
    response.cookies.set("token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 dia
    });

    return response;
  } catch (error) {
    // 🛑 Erro inesperado (ex: falha de rede)
    return NextResponse.json(
      { message: "Erro interno. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}
