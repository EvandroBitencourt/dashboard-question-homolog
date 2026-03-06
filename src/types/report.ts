export type ReportStatus = "draft" | "finalized" | string;

export interface Report {
  id: number;
  quiz_id: number;
  title: string;
  subtitle?: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export interface ReportsListResponse {
  quiz_id?: number;
  items: Report[];
}

export interface CreateReportPayload {
  title: string;
  subtitle?: string;
}

export interface UpdateReportPayload {
  title?: string;
  subtitle?: string;
  status?: ReportStatus;
}

export interface ReportDatasetAnswer {
  question_id: number | string;
  question_title?: string | null;
  option_label?: string | null;
  option_value?: string | number | null;
  value_text?: string | null;
  value_number?: number | null;
  value_bool?: boolean | null;
  value?: string | number | boolean | null;
}

export interface ReportDatasetInterview {
  summary?: string | null;
  answers?: ReportDatasetAnswer[];
}

export interface ReportDataset {
  interviews: ReportDatasetInterview[];
}
