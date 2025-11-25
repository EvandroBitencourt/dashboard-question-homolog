// utils/question-rules-engine.ts

// Mesmos campos que o backend já está mandando no publicFull()
export type RuleCondition = {
    id: number;
    rule_id: number;
    condition_question_id: number;
    operator: string; // 'selected' | 'not_selected' | 'eq' | 'neq' | ...
    option_id: number | null;
    compare_value: string | null;
    is_number: boolean | 0 | 1;
};

export type QuestionRule = {
    id: number;
    quiz_id: number;
    source_question_id: number;  // em qual pergunta a regra está “presa”
    type: string;                // 'skip', 'show', 'refuse', etc
    logic: "AND" | "OR";
    target_question_id: number | null;
    sort_order: number;
    is_active: boolean | 0 | 1;
    conditions: RuleCondition[];
};

// Resposta em memória da entrevista
// (adapta depois se o teu formato for um pouco diferente)
export type AnswerMap = {
    [questionId: number]: {
        optionIds?: number[];              // ids das opções marcadas
        value?: string | number | null;    // valor aberto (numérico/texto)
    };
};

// ============================
// Helpers internos
// ============================

function toBool(v: boolean | 0 | 1 | null | undefined): boolean {
    return v === true || v === 1;
}

function getAnswerForCondition(
    cond: RuleCondition,
    answers: AnswerMap
) {
    return answers[cond.condition_question_id];
}

function evalCondition(cond: RuleCondition, answers: AnswerMap): boolean {
    const ans = getAnswerForCondition(cond, answers);
    const op = cond.operator;

    // Se não tem resposta ainda, a condição não é satisfeita
    if (!ans) return false;

    // Operações baseadas em opção marcada
    if (op === "selected" || op === "not_selected") {
        if (!cond.option_id) return false;

        const ids = ans.optionIds ?? [];
        const isSelected = ids.includes(cond.option_id);

        return op === "selected" ? isSelected : !isSelected;
    }

    // Operações baseadas em valor
    const rawValue = ans.value;
    const rawCompare = cond.compare_value;

    if (rawValue == null || rawCompare == null) {
        return false;
    }

    const numeric = toBool(cond.is_number);
    let value: string | number = rawValue as any;
    let cmp: string | number = rawCompare as any;

    if (numeric) {
        const vNum = Number(value);
        const cNum = Number(cmp);
        if (Number.isNaN(vNum) || Number.isNaN(cNum)) return false;
        value = vNum;
        cmp = cNum;
    }

    switch (op) {
        case "eq":
            return value === cmp;
        case "neq":
            return value !== cmp;
        case "gt":
            return (value as number) > (cmp as number);
        case "gte":
            return (value as number) >= (cmp as number);
        case "lt":
            return (value as number) < (cmp as number);
        case "lte":
            return (value as number) <= (cmp as number);
        default:
            // operador desconhecido → não dispara a regra
            return false;
    }
}

function evalRule(rule: QuestionRule, answers: AnswerMap): boolean {
    const conds = rule.conditions ?? [];

    if (!conds.length) {
        // regra sem condição → nunca dispara (ou você pode tratar como sempre verdadeira)
        return false;
    }

    const logicAnd = rule.logic === "AND";

    if (logicAnd) {
        // AND → todas precisam ser verdadeiras
        for (const cond of conds) {
            if (!evalCondition(cond, answers)) {
                return false;
            }
        }
        return true;
    }

    // OR → basta uma verdadeira
    for (const cond of conds) {
        if (evalCondition(cond, answers)) {
            return true;
        }
    }
    return false;
}

// ============================
// Função principal: próximo ID
// ============================

export function getNextQuestionIdByRules(opts: {
    currentQuestionId: number;
    questions: { id: number }[];  // lista ordenada de perguntas
    rules: QuestionRule[];
    answers: AnswerMap;
}): number | null {
    const { currentQuestionId, questions, rules, answers } = opts;

    // Garante que as perguntas estão ordenadas
    const ordered = [...questions].sort((a, b) => a.id - b.id);

    const currentIndex = ordered.findIndex((q) => q.id === currentQuestionId);
    if (currentIndex === -1) {
        return null;
    }

    // Regras ativas presas à pergunta atual
    const activeRules = rules.filter(
        (r) =>
            toBool(r.is_active) &&
            r.source_question_id === currentQuestionId &&
            r.type === "skip" // por enquanto só tratamos pulo; show/refuse dá pra ligar depois
    );

    // Aplica na ordem (sort_order já vem do banco, mas se quiser reforçar:)
    activeRules.sort((a, b) => a.sort_order - b.sort_order);

    for (const rule of activeRules) {
        if (evalRule(rule, answers)) {
            // Achou uma regra de pulo que bateu
            if (rule.target_question_id) {
                return rule.target_question_id;
            }
        }
    }

    // Se nenhuma regra “pegou”, vai pra próxima pergunta na ordem normal
    const next = ordered[currentIndex + 1];
    return next ? next.id : null;
}
