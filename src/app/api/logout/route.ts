import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    { message: "Logout realizado com sucesso" },
    { status: 200 }
  );

  // 🧹 Limpar o cookie do token
  response.cookies.set("token", "", {
    httpOnly: true,
    path: "/login",
    expires: new Date(0), // data no passado
  });

  return response;
}
