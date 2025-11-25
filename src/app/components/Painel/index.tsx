"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Clock, Download, Hourglass } from "lucide-react";
import { useQuiz } from "@/context/QuizContext";
import { getDashboardSummary, type DashboardSummary } from "@/utils/actions/dashboard";

function formatDayBR(iso: string) {
  // iso vem tipo "2025-11-10"
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const Painel = () => {
  const { selectedQuizId, selectedQuizTitle } = useQuiz();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!selectedQuizId) {
        setSummary(null);
        setErrorMsg("Nenhum questionário selecionado.");
        return;
      }

      try {
        setLoading(true);
        setErrorMsg(null);

        const data = await getDashboardSummary(selectedQuizId);
        setSummary(data);
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message || "Não foi possível carregar os dados do painel.");
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [selectedQuizId]);

  const tituloQuiz =
    selectedQuizTitle || summary?.quiz_title || "Selecione um questionário";

  return (
    <section className="p-4 space-y-6">
      {/* Cabeçalho */}
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-lg font-semibold text-[#e85228] mb-1">
          Painel do questionário
        </h1>
        <p className="text-sm text-gray-600">
          Questionário:{" "}
          <span className="font-semibold text-gray-900">{tituloQuiz}</span>
        </p>

        {errorMsg && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Métricas principais */}
      <section className="max-w-screen-xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-col items-center">
            <Clock className="w-6 h-6 mb-2 text-gray-600" />
            <CardTitle className="text-center text-sm text-muted-foreground">
              Duração Média
            </CardTitle>
            <CardContent>
              <p className="text-xl font-bold text-center">
                {loading
                  ? "Carregando..."
                  : summary
                    ? `${summary.avg_duration_minutes.toFixed(2)} min`
                    : "-"}
              </p>
            </CardContent>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col items-center">
            <Download className="w-6 h-6 mb-2 text-gray-600" />
            <CardTitle className="text-center text-sm text-muted-foreground">
              Média de Coletas por Dia
            </CardTitle>
            <CardContent>
              <p className="text-xl font-bold text-center">
                {loading
                  ? "Carregando..."
                  : summary
                    ? summary.daily_average.toFixed(2)
                    : "-"}
              </p>
            </CardContent>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col items-center">
            <Hourglass className="w-6 h-6 mb-2 text-gray-600" />
            <CardTitle className="text-center text-sm text-muted-foreground">
              Previsto X Realizado
            </CardTitle>
            <CardContent>
              <p className="text-xl font-bold text-center">
                {loading
                  ? "Carregando..."
                  : summary
                    ? `${summary.total_completed}/${summary.max_sample} (${summary.completion_percent.toFixed(
                      0
                    )}%)`
                    : "-"}
              </p>
            </CardContent>
          </CardHeader>
        </Card>
      </section>

      {/* Quotas */}
      <section className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quotas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            {loading && <p>Carregando...</p>}

            {!loading && summary?.quotas?.length === 0 && (
              <p className="text-gray-500 text-xs">Nenhuma quota cadastrada.</p>
            )}

            {!loading &&
              summary?.quotas?.map((q) => (
                <p key={q.id} className="border-b pb-1 last:border-none">
                  › {q.option_label} {q.count}/{q.limit} (
                  {((q.count / q.limit) * 100).toFixed(0)}%)
                </p>
              ))}
          </CardContent>
        </Card>

        {/* Coletas por dia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coletas por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-auto space-y-2 text-sm text-gray-700">
              {loading && <p>Carregando...</p>}

              {!loading &&
                summary?.daily_collections?.map((d, i) => (
                  <p key={i} className="border-b pb-1 last:border-none">
                    • {formatDayBR(d.day)}: {d.total} entrevistas
                  </p>
                ))}

            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tempo + Equipe */}
      <section className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tempo médio por entrevistador</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">

            {loading && <p>Carregando...</p>}

            {!loading &&
              summary?.team_stats?.map((t, i) => (
                <p key={i} className="border-b pb-2 last:border-none">
                  • {t.interviewer_name || "Desktop"} —{" "}
                  {t.avg_minutes.toFixed(2)} min
                </p>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm text-left text-gray-700">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Nome</th>
                  <th>Total</th>
                  <th>Coletas/dia</th>
                  <th>Duração Média</th>
                  <th>Última coleta</th>
                </tr>
              </thead>
              <tbody>
                {summary?.team_stats?.map((t, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{t.interviewer_name || "Desktop"}</td>
                    <td>{t.total}</td>
                    <td>{t.per_day.toFixed(2)}</td>
                    <td>{t.avg_minutes.toFixed(2)} min</td>
                    <td>{t.last_date || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </section>
  );
};

export default Painel;
