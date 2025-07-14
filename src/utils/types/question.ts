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
    label: string;
    id: number;
    question_id: number;
    value: string;
    is_open: boolean;
    is_exclusive: boolean;
    is_nsnr: boolean;
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