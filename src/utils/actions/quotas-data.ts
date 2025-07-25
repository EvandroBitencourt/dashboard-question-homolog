import type { QuotasProps } from "../types/quotas";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const BASE_API_URL = `${API_BASE}/api`;
const BASE_URL = `${BASE_API_URL}/quota`;

async function getServerAuthHeaders(): Promise<HeadersInit> {
  try {
    const res = await fetch("/api/token", {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Token request failed: ${res.status}`);

    const data = await res.json();
    if (!data.token) throw new Error("Token não encontrado na resposta");

    return {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  } catch (err) {
    console.error("Erro ao obter headers de autenticação:", err);
    throw new Error("Falha na autenticação");
  }
}

export async function createQuota(data: Omit<QuotasProps, "id" | "created_at" | "updated_at">): Promise<QuotasProps> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(`Erro ao criar Quota: ${res.status} - ${await res.text()}`);
  return res.json();
}

export async function getQuotasByQuiz(quizId: number): Promise<QuotasProps[]> {
  try {
    const headers = await getServerAuthHeaders();
    const url = `${BASE_API_URL}/quota?quiz_id=${quizId}`;
    const res = await fetch(url, { method: "GET", headers });

    const text = await res.text();

    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Erro ao buscar quotas por quiz: ${res.status} - ${text}`);

    let result: any;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      throw new Error(`Resposta inválida do servidor: ${text}`);
    }

    // Agora o backend retorna um array diretamente
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    return [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function updateQuota(id: number, data: Partial<Omit<QuotasProps, "id" | "created_at" | "updated_at">>): Promise<QuotasProps> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(`Erro ao atualizar quota: ${res.status} - ${await res.text()}`);
  return res.json();
}

export async function deleteQuota(id: number): Promise<{ message: string }> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE", headers });

  if (!res.ok) throw new Error(`Erro ao deletar quota: ${res.status} - ${await res.text()}`);
  return res.json();
}

export async function bulkCreateQuotasForQuestion(questionId: number, quizId: number, defaultLimit = 0): Promise<any> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/bulk/question/${questionId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ quiz_id: quizId, default_limit: defaultLimit }),
  });

  if (!res.ok) throw new Error(`Erro ao criar quotas em lote: ${res.status} - ${await res.text()}`);
  return res.json();
}

export async function updateQuotaLimit(quotaId: number, limit: number): Promise<any> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/${quotaId}/limit`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ limit }),
  });

  if (!res.ok) throw new Error(`Erro ao atualizar limite: ${res.status} - ${await res.text()}`);
  return res.json();
}

export async function checkQuestionHasQuotas(questionId: number): Promise<{ has_quotas: boolean; quota_count: number }> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/check/question/${questionId}`, { method: "GET", headers });

  if (res.status === 404) return { has_quotas: false, quota_count: 0 };
  if (!res.ok) throw new Error(`Erro ao verificar quotas: ${res.status} - ${await res.text()}`);

  const result = await res.json();
  return result.data;
}

export async function resetQuotaCount(quotaId: number): Promise<any> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/${quotaId}/reset`, { method: "PATCH", headers });

  if (!res.ok) throw new Error(`Erro ao resetar contador: ${res.status} - ${await res.text()}`);
  return res.json();
}

export async function deleteQuotasByQuestion(questionId: number): Promise<any> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/question/${questionId}`, { method: "DELETE", headers });

  if (!res.ok) throw new Error(`Erro ao deletar quotas por pergunta: ${res.status} - ${await res.text()}`);
  return res.json();
}

export async function deleteQuotasByQuiz(quizId: number): Promise<any> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/quiz/${quizId}`, { method: "DELETE", headers });

  if (!res.ok) throw new Error(`Erro ao deletar quotas por quiz: ${res.status} - ${await res.text()}`);
  return res.json();
}

export async function getAllQuotas(): Promise<QuotasProps[]> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(BASE_URL, { method: "GET", headers });

  if (!res.ok) throw new Error(`Erro ao buscar todas as quotas: ${res.status} - ${await res.text()}`);
  return res.json();
}
