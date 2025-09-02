// utils/types/quotas.ts
export interface QuotasProps {
  id?: number;
  quiz_id: number;
  question_id: number;
  question_option_id: number;
  limit?: number;
  current_count?: number;
  status?: "active" | "inactive" | "suspended";
  created_at?: string | null;
  updated_at?: string | null;

  // extras do JOIN
  option_label?: string | null;
  question_title?: string | null;
  question_type?: string | null;
}
