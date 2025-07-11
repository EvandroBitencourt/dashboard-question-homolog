const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/company`;

// 🔐 Busca token via API interna
async function getServerAuthHeaders(): Promise<HeadersInit> {
  const res = await fetch("/api/token");

  if (!res.ok) {
    throw new Error("Token não encontrado");
  }

  const data = await res.json();

  return {
    Authorization: `Bearer ${data.token}`,
    Accept: "application/json",
  };
}

// ✅ Buscar os dados da empresa com autenticação
export async function dataCompany() {
  try {
    const headers = await getServerAuthHeaders();

    const res = await fetch(API_URL, {
      method: "GET",
      headers,
      cache: "no-store", // garante que não use cache
    });

    if (!res.ok) throw new Error("Erro ao buscar os dados da empresa.");

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar os dados da empresa:", error);
    return null;
  }
}
