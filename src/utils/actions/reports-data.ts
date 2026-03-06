// utils/actions/reports-data.ts
const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

async function getServerAuthHeaders(): Promise<HeadersInit> {
  const res = await fetch("/api/token");

  if (!res.ok) {
    throw new Error("Token não encontrado");
  }

  const data = await res.json();

  return {
    Authorization: `Bearer ${data.token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export type ReportAggregateGroupItem = {
  label: string;
  count: number;
  percent: number;
};

export type ReportAggregateGroup = {
  key: string;
  title: string;
  total: number;
  items: ReportAggregateGroupItem[];
};

export type ReportAggregate = {
  reportId: number | string;
  quizId?: number | null;
  quizTitle?: string | null;
  specs?: {
    dateLabel?: string | null;
    audience?: string | null;
    method?: string | null;
    totalInterviews?: number | null;
    marginOfErrorLabel?: string | null;
    sourcesLabel?: string | null;
    confidence?: string | null;
  };
  indicators?: {
    totalInterviews?: number | null;
    summariesFound?: number | null;
    groupList?: ReportAggregateGroup[];
  };
  charts?: {
    pie?: {
      title?: string | null;
      items?: { label: string; count: number }[];
    };
    line?: {
      title?: string | null;
      points?: { label: string; value: number }[];
      width?: number | null;
      height?: number | null;
      padding?: number | null;
    };
  };
};

export async function getReportAggregate(
  reportId: number | string,
  quizId?: number | null
): Promise<ReportAggregate | null> {
  if (!reportId) return null;

  const headers = await getServerAuthHeaders();
  const params = new URLSearchParams();
  if (quizId) params.set("quizId", String(quizId));

  const url = `${BASE_API_URL}/reports/${reportId}${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  console.info("getReportAggregate URL:", url);

  const res = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (res.status === 404 || res.status === 400) return null;

  if (!res.ok) {
    console.error("Erro HTTP getReportAggregate:", res.status, res.statusText);
    throw new Error("Erro ao carregar relatório");
  }

  const json = await res.json().catch(() => null);
  if (!json) return null;

  if (json.report) return json.report;
  if (json.data) return json.data;
  return json;
}
