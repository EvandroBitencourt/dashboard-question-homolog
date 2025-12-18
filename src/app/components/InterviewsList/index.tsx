"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "@/context/QuizContext";
import { listInterviewsByQuiz, deleteInterview } from "@/utils/actions/interviews-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCcw, Eye, Pencil, Trash2 } from "lucide-react";
import { FaSpinner } from "react-icons/fa";
import Swal from "sweetalert2";

type InterviewSummary = {
    id: number;
    quiz_id: number;
    interviewer_name?: string | null;
    respondent_name?: string | null;
    respondent_email?: string | null;
    respondent_phone?: string | null;
    finished_at?: string | null;
    duration_ms?: number | null;
    source?: string | null;
    summary?: string | null; // texto vindo da API (label: valor | label: valor | ...)
};

const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("pt-BR");
};

const formatDuration = (ms?: number | null) => {
    if (!ms || ms <= 0) return "-";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/** Normaliza rótulo (sem acento/minúsculo) p/ comparação robusta */
function normalizeLabel(s: string) {
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/** Quebra o summary “Label: Valor | Label: Valor ...” e extrai campos chaves */
function extractMainFields(summary?: string | null): {
    sexo?: string;
    idade?: string;
    escolaridade?: string;
    lines: { label: string; value: string }[];
} {
    const result = { sexo: undefined as string | undefined, idade: undefined as string | undefined, escolaridade: undefined as string | undefined, lines: [] as { label: string; value: string }[] };

    if (!summary) return result;

    // Aceita separadores “ | ” ou quebras de linha
    const parts = summary.split(/\||\n/g).map(p => p.trim()).filter(Boolean);

    for (const raw of parts) {
        // separa primeira ocorrência do “:”
        const idx = raw.indexOf(":");
        if (idx === -1) continue;

        const label = raw.slice(0, idx).trim();
        const value = raw.slice(idx + 1).trim();

        if (!value) continue;

        const norm = normalizeLabel(label);

        // casa rótulos mais comuns
        if (norm.startsWith("sexo")) {
            result.sexo = value;
        } else if (norm.startsWith("qual a sua idade")) {
            result.idade = value;
        } else if (norm.startsWith("qual a sua escolaridade")) {
            result.escolaridade = value;
        }

        result.lines.push({ label, value });
    }

    return result;
}

export default function InterviewsList() {
    const router = useRouter();
    const { selectedQuizId, selectedQuizTitle } = useQuiz();

    const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
    const [loading, setLoading] = useState(false);

    const loadInterviews = async () => {
        if (!selectedQuizId) return;
        setLoading(true);
        try {
            const data = await listInterviewsByQuiz(selectedQuizId);
            setInterviews(data ?? []);
        } catch (e) {
            console.error(e);
            await Swal.fire({
                icon: "error",
                title: "Erro",
                text: "Não foi possível carregar as coletas desse questionário.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInterviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedQuizId]);

    const handleShowMore = (interview: InterviewSummary) => {
        const { lines } = extractMainFields(interview.summary);

        // monta lista UL bonitinha
        const respostasHtml =
            lines.length > 0
                ? `<ul style="padding-left:16px;margin:6px 0 0 0">${lines
                    .map((l) => `<li><b>${l.label}:</b> ${l.value}</li>`)
                    .join("")}</ul>`
                : "-";

        const html = `
      <div style="text-align:left;font-size:14px">
        <p><b>ID:</b> ${interview.id}</p>
        <p><b>Questionário (quiz_id):</b> ${interview.quiz_id}</p>
        <p><b>Entrevistador:</b> ${interview.interviewer_name || "-"}</p>
        <p><b>Nome do entrevistado:</b> ${interview.respondent_name || "-"}</p>
        <p><b>E-mail:</b> ${interview.respondent_email || "Sem e-mail"}</p>
        <p><b>Telefone:</b> ${interview.respondent_phone || "Sem telefone"}</p>
        <p><b>Origem:</b> ${interview.source || "-"}</p>
        <hr style="margin:8px 0;" />
        <p style="margin:0 0 4px 0"><b>Respostas:</b></p>
        ${respostasHtml}
        <hr style="margin:8px 0;" />
        <p><b>Finalizada em:</b> ${formatDateTime(interview.finished_at)}</p>
        <p><b>Duração:</b> ${formatDuration(interview.duration_ms)}</p>
      </div>
    `;

        Swal.fire({
            icon: "info",
            title: `Coleta #${interview.id}`,
            html,
            confirmButtonText: "Fechar",
        });
    };

    const handleEdit = (interview: InterviewSummary) => {
        // Sua página /dashboard/interviews/[id] deve ler as respostas e marcar defaultChecked
        router.push(`/dashboard/interviews/${interview.id}`);
    };

    const handleDelete = async (interview: InterviewSummary) => {
        const confirm = await Swal.fire({
            icon: "warning",
            title: "Excluir coleta",
            html: `Tem certeza que deseja excluir a coleta <b>#${interview.id}</b>?<br/><small>Esta ação não poderá ser desfeita.</small>`,
            showCancelButton: true,
            confirmButtonText: "Sim, excluir",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#e74c3c",
        });

        if (!confirm.isConfirmed) return;

        try {
            await deleteInterview(interview.id);
            setInterviews((prev) => prev.filter((i) => i.id !== interview.id));
            await Swal.fire({
                icon: "success",
                title: "Excluída",
                text: "Coleta removida com sucesso.",
            });
        } catch (e: any) {
            console.error(e);
            await Swal.fire({
                icon: "error",
                title: "Erro ao excluir",
                text: e?.message || "Não foi possível excluir a coleta.",
            });
        }
    };

    return (
        <section>
            <div>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
                        <div>
                            <CardTitle className="text-lg text-[#e85228] font-bold">
                                Coletas do questionário
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-1">
                                Quiz selecionado:{" "}
                                {selectedQuizId ? (
                                    <>
                                        <span className="font-semibold">{selectedQuizId}</span> —{" "}
                                        <span>{selectedQuizTitle}</span>
                                    </>
                                ) : (
                                    <span className="italic">nenhum quiz selecionado</span>
                                )}
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={loadInterviews}
                            disabled={loading || !selectedQuizId}
                            className="gap-2"
                        >
                            {loading ? (
                                <>
                                    <FaSpinner className="w-4 h-4 animate-spin" />
                                    Atualizando...
                                </>
                            ) : (
                                <>
                                    <RefreshCcw className="w-4 h-4" />
                                    Atualizar
                                </>
                            )}
                        </Button>
                    </CardHeader>

                    <CardContent className="p-0">
                        <ScrollArea className="max-h-[540px]">
                            {(!selectedQuizId || interviews.length === 0) && !loading && (
                                <p className="px-6 py-8 text-sm text-gray-500">
                                    Nenhuma entrevista registrada para este questionário.
                                </p>
                            )}

                            {loading && (
                                <div className="flex justify-center items-center py-10">
                                    <FaSpinner className="animate-spin text-[#e85228] w-5 h-5" />
                                </div>
                            )}

                            {!loading && interviews.length > 0 && (
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700 w-16">ID</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Sexo</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Idade</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Escolaridade</th>
                                                <th className="px-4 py-2 text-center font-semibold text-gray-700 w-[210px]">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {interviews.map((interview) => {
                                                const { sexo, idade, escolaridade } = extractMainFields(interview.summary);

                                                return (
                                                    <tr
                                                        key={interview.id}
                                                        className="border-b last:border-0 hover:bg-orange-50/60 transition-colors"
                                                    >
                                                        <td className="px-4 py-2 text-gray-700 font-medium">#{interview.id}</td>
                                                        <td className="px-4 py-2 text-gray-700">{sexo || "-"}</td>
                                                        <td className="px-4 py-2 text-gray-700">{idade || "-"}</td>
                                                        <td className="px-4 py-2 text-gray-700">{escolaridade || "-"}</td>
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="gap-1"
                                                                    onClick={() => handleShowMore(interview)}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                    Ver mais
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="gap-1"
                                                                    onClick={() => handleEdit(interview)}
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                    Editar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    className="gap-1"
                                                                    onClick={() => handleDelete(interview)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Excluir
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
