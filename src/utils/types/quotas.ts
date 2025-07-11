export interface QuotasProps {
  id?: number;
  quiz_id: number;
  question_id: number;
  question_option_id: number;
  limit?: number;
  created_at?: string;
  updated_at?: string;
  current_count?: number;
}