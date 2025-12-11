export interface QuestionProps {
    [x: string]: any;
    id: number;
    quiz_id: number;
    uuid: string;
    title: string;
    variable: string;
    type: "single_choice" | "multiple_choice" | "open" | "signature" | "photo" | "matrix" | "scale";
    is_required: boolean;
    is_hidden: boolean;
    is_readonly: boolean;
    option_display?: string | null;
    shuffle_options: boolean;
    mask?: string | null;
}

export interface QuestionOptionProps {
    id: number;
    question_id: number;
    value: string;
    label: string; // ✅ Adicione esta linha
    is_open: boolean | number | string;
    is_exclusive: boolean | number | string;
    is_nsnr: boolean | number | string;
    sort_order: number;
    mask?: string | null;
    // quota?: number | null;           // novo campo
    min_selections?: number | null;  // novo campo
    max_selections?: number | null;  // novo campo
}

export interface QuestionWithOptions extends QuestionProps {
    question: any;
    options: QuestionOptionProps[];
}