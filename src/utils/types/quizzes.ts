export interface quizzesProps {
  value_skipped: number | undefined;
  id: number;
  title: string;
  max_sample: number;
  end_date: Date;
  status: "test" | "active";
  change_level: string;
  value_ns_nr: number;
  value_blank: number;
  bar_color: string;
  text_color: string;
  logo_path: string;
  allow_over_sample: boolean;
  allow_continued_collection: boolean;
  is_online: boolean;
  digitization_mode: boolean;
}
