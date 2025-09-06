export type QuestionRuleCondition = {
    id?: number;
    rule_id?: number;
    condition_question_id: number;
    operator:
    | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
    | "selected" | "not_selected"
    | "contains" | "not_contains";
    option_id?: number | null;
    compare_value?: string | null;
    is_number?: 0 | 1;
    created_at?: string | null;
    updated_at?: string | null;
};

export type QuestionRule = {
    id?: number;
    quiz_id: number;
    source_question_id: number;
    type: "skip" | "show" | "hide" | "refuse" | "validate";
    logic: "AND" | "OR";
    target_question_id: number | null;
    sort_order?: number;
    is_active?: number;
    created_at?: string | null;
    updated_at?: string | null;
    deleted_at?: string | null;
    conditions?: QuestionRuleCondition[];
};
