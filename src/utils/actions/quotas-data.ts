import type { QuotasProps } from "../types/quotas";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const BASE_API_URL = `${API_BASE}/api`;
const BASE_URL = `${BASE_API_URL}/quota`;

async function getServerAuthHeaders(): Promise<HeadersInit> {
  const res = await fetch("/api/token", { method: "GET", credentials: "include" });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error("Token não encontrado na resposta");
  return {
    Authorization: `Bearer ${data.token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function normalizeQuotaRow(row: any): QuotasProps {
  return {
    id: row.id != null ? Number(row.id) : undefined,
    quiz_id: Number(row.quiz_id),
    question_id: Number(row.question_id),
    question_option_id: Number(row.question_option_id),
    parent_quota_id: row.parent_quota_id != null ? Number(row.parent_quota_id) : null, // ✅
    limit: row.limit != null ? Number(row.limit) : 0,
    current_count: row.current_count != null ? Number(row.current_count) : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    option_label: row.option_label ?? null,
    question_title: row.question_title ?? null,
    question_type: row.question_type ?? null,
  };
}

export async function createQuota(
  data: Omit<QuotasProps, "id" | "created_at" | "updated_at">
): Promise<QuotasProps> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Erro ao criar Quota: ${res.status} - ${await res.text()}`);
  const json = await res.json();
  return normalizeQuotaRow(json);
}

export async function getQuotasByQuiz(quizId: number): Promise<QuotasProps[]> {
  const headers = await getServerAuthHeaders();
  const url = `${BASE_API_URL}/quota?quiz_id=${quizId}`;
  const res = await fetch(url, { method: "GET", headers });
  const text = await res.text();
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Erro ao buscar quotas por quiz: ${res.status} - ${text}`);
  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida do servidor: ${text}`);
  }
  const arr = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  return arr.map(normalizeQuotaRow);
}

export async function updateQuota(id: number, data: Partial<Omit<QuotasProps, "id" | "created_at" | "updated_at">>): Promise<QuotasProps> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Erro ao atualizar quota: ${res.status} - ${await res.text()}`);
  const json = await res.json();
  return normalizeQuotaRow(json);
}

export async function deleteQuota(id: number): Promise<{ message: string }> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(`Erro ao deletar quota: ${res.status} - ${await res.text()}`);
  return res.json();
}

/**
 * CRIA cotas em lote para uma pergunta.
 * Se parentQuotaId for informado, as cotas serão filhas dessa quota.
 */
// utils/actions/quotas-data.ts

// ✅ agora com parent_quota_id
// antes: export async function bulkCreateQuotasForQuestion(questionId:number, quizId:number, defaultLimit=0)
export async function bulkCreateQuotasForQuestion(
  questionId: number,
  quizId: number,
  defaultLimit = 0,
  parentQuotaId?: number           // <- opcional
): Promise<any> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/bulk/question/${questionId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      quiz_id: quizId,
      default_limit: Number(defaultLimit),
      ...(parentQuotaId ? { parent_quota_id: Number(parentQuotaId) } : {}), // <- só quando tiver pai
    }),
  });
  if (!res.ok) throw new Error(`Erro ao criar quotas em lote: ${res.status} - ${await res.text()}`);
  return res.json();
}



/** Atualiza apenas o limite */
export async function updateQuotaLimit(quotaId: number, limit: number): Promise<any> {
  const headers = await getServerAuthHeaders();
  const res = await fetch(`${BASE_URL}/${quotaId}/limit`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ limit: Number(limit) }),
  });
  if (!res.ok) throw new Error(`Erro ao atualizar limite: ${res.status} - ${await res.text()}`);
  return res.json();
}

/**
 * Verifica se já existem quotas para uma pergunta.
 * Se parentQuotaId vier, a checagem é feita no contexto desse pai.
 */
export async function checkQuestionHasQuotas(
  questionId: number,
  parentQuotaId?: number
): Promise<{ has_quotas: boolean; quota_count: number }> {
  const headers = await getServerAuthHeaders();
  const url =
    `${BASE_URL}/check/question/${questionId}` +
    (parentQuotaId ? `?parent_quota_id=${parentQuotaId}` : "");
  const res = await fetch(url, { method: "GET", headers });
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
  const json = await res.json();
  const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
  return arr.map(normalizeQuotaRow);
}
