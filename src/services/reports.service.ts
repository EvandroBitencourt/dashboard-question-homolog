import {
  CreateReportPayload,
  Report,
  ReportDataset,
  ReportsListResponse,
  UpdateReportPayload,
} from "@/types/report";

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

export class ApiHttpError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.body = body;
  }
}

async function getServerAuthHeaders(): Promise<HeadersInit> {
  const tokenRes = await fetch("/api/token", { cache: "no-store" });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    throw new ApiHttpError("Token não encontrado", tokenRes.status, text);
  }

  const data = await tokenRes.json();

  return {
    Authorization: `Bearer ${data.token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestWithAuth<T>(url: string, init: RequestInit): Promise<T> {
  const headers = await getServerAuthHeaders();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await parseResponseBody(response);
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message?: string }).message)
        : `Erro HTTP ${response.status}`;

    throw new ApiHttpError(message, response.status, body);
  }

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text().catch(() => "");
  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

export async function listReports(quizId: number): Promise<ReportsListResponse> {
  const data = await requestWithAuth<ReportsListResponse | Report[]>(
    `${BASE_API_URL}/questionnaire/${quizId}/reports`,
    {
      method: "GET",
    }
  );

  if (Array.isArray(data)) {
    return { quiz_id: quizId, items: data };
  }

  return {
    quiz_id: data.quiz_id ?? quizId,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

export async function createReport(
  quizId: number,
  payload: CreateReportPayload
): Promise<Report> {
  return requestWithAuth<Report>(`${BASE_API_URL}/questionnaire/${quizId}/reports`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateReport(
  quizId: number,
  reportId: number,
  payload: UpdateReportPayload
): Promise<Report> {
  return requestWithAuth<Report>(
    `${BASE_API_URL}/questionnaire/${quizId}/reports/${reportId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export async function getReportDataset(
  quizId: number,
  reportId: number
): Promise<ReportDataset> {
  const data = await requestWithAuth<ReportDataset>(
    `${BASE_API_URL}/questionnaire/${quizId}/reports/${reportId}/dataset`,
    {
      method: "GET",
    }
  );

  return {
    interviews: Array.isArray(data?.interviews) ? data.interviews : [],
  };
}

export async function deleteReport(quizId: number, reportId: number): Promise<void> {
  await requestWithAuth<unknown>(
    `${BASE_API_URL}/questionnaire/${quizId}/reports/${reportId}`,
    {
      method: "DELETE",
    }
  );
}
