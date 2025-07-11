// src/app/api/token/route.ts

// Importa o objeto NextResponse, usado para retornar respostas HTTP na API do Next.js
import { NextResponse } from "next/server";

// Define a função que será executada quando a rota receber um GET (ex: /api/token)
export async function GET(request: Request) {
  // Busca o cabeçalho 'cookie' da requisição
  const token = request.headers
    .get("cookie")
    ?.split("; ") // divide os cookies por "; "
    .find((cookie) => cookie.startsWith("token=")) // procura o cookie chamado "token"
    ?.split("=")[1]; // pega o valor do token

  // Se o token não for encontrado, retorna 401 (não autorizado)
  if (!token) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  // Se o token existir, retorna ele no formato JSON
  return NextResponse.json({ token });
}
