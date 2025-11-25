// utils/types/quiz-full.ts

// Opções da pergunta
export type QuizFullOption = {
    id: number;
    question_id: number;
    label: string;
    value: string | null;
};

// Perguntas com opções
export type QuizFullQuestion = {
    id: number;
    quiz_id: number;
    title: string;
    variable: string | null;
    type: string;
    is_required: 0 | 1 | boolean;
    is_readonly: 0 | 1 | boolean;
    is_hidden: 0 | 1 | boolean;
    shuffle_options: 0 | 1 | boolean;
    option_display: string | null;
    options: QuizFullOption[];
};

// Condições da regra
export type QuizRuleCondition = {
    id: number;
    rule_id: number;
    condition_question_id: number;
    operator: string;
    option_id: number | null;
    compare_value: string | null;
    is_number: 0 | 1 | boolean;
};

// Links de opção (quando a regra for por opção)
export type QuizOptionLink = {
    id: number;
    quiz_id: number;
    source_question_id: number;
    source_option_id: number;
    target_question_id: number;
    target_option_id: number | null;
    created_at: string;
};

// Regra completa
export type QuizRule = {
    id: number;
    quiz_id: number;
    source_question_id: number;
    type: string; // skip | show | refuse etc.
    logic: string; // AND / OR
    target_question_id: number | null;
    sort_order: number;
    is_active: 0 | 1 | boolean;

    conditions: QuizRuleCondition[];
    links: QuizOptionLink[];
};

// Resposta do endpoint /api/quiz-public/{id}/full
export type QuizFullResponse = {
    ok: boolean;
    quiz: {
        id: number;
        title: string;
        end_date: string | null;
        status: string;
        max_sample: number | null;
        is_online: 0 | 1 | boolean;
    };
    questions: QuizFullQuestion[];
    rules: QuizRule[];
};
