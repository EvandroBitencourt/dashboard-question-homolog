// utils/actions/question-copy.ts
import { getQuestionWithOptions, createQuestion } from "@/utils/actions/question-data";
import { createQuestionOption } from "@/utils/actions/question-option-data";

function fallbackUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export async function copyQuestionToQuiz(
    sourceQuestionId: number,
    destQuizId: number,
    copies: number = 1
) {
    if (!sourceQuestionId || !destQuizId || copies < 1) {
        throw new Error("Parâmetros inválidos para cópia.");
    }

    const src = await getQuestionWithOptions(sourceQuestionId);
    if (!src?.question) throw new Error("Questão de origem não encontrada.");

    const { question, options = [] } = src;

    const createdIds: number[] = [];

    for (let i = 0; i < copies; i++) {
        const newQ = await createQuestion({
            quiz_id: destQuizId,
            type: question.type,
            title: `Cópia de ${question.title || question.variable || `Q${question.id}`}`,
            variable: "",               // evita conflito
            uuid: (self.crypto?.randomUUID?.() || fallbackUUID()),
            is_required: !!question.is_required,
            is_hidden: !!question.is_hidden,
            is_readonly: !!question.is_readonly,
            shuffle_options: !!question.shuffle_options,
        } as any);

        // replica opções
        for (const opt of options) {
            await createQuestionOption({
                question_id: newQ.id,
                label: opt.label ?? "",
                value: opt.value ?? "",
                is_open: !!opt.is_open,
                is_exclusive: !!opt.is_exclusive,
                is_nsnr: !!opt.is_nsnr,
                sort_order: Number(opt.sort_order ?? 0),
            } as any);
        }

        createdIds.push(newQ.id);
    }

    return createdIds;
}
