"use client";

import { useMemo, useEffect, useState, type ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import { useQuiz } from "@/context/QuizContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AdminInterviewListItem,
  listInterviewsByQuiz,
} from "@/utils/actions/interviews-data";
import {
  Calendar,
  Target,
  ClipboardList,
  CheckCircle2,
  FileSearch,
  Users,
  Activity,
} from "lucide-react";

type ReportViewerProps = {
  reportId: string;
};

type SpecItem = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
};

type SummaryLine = { label: string; value: string };
type GroupCount = Record<string, number>;
type PieSlice = {
  label: string;
  value: number;
  percent: number;
  color: string;
  path: string;
};
type LinePoint = { label: string; value: number };

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSummaryLines(summary?: string | null): SummaryLine[] {
  if (!summary) return [];
  const parts = summary
    .split(/\||\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const lines: SummaryLine[] = [];
  for (const raw of parts) {
    const idx = raw.indexOf(":");
    if (idx === -1) continue;
    const label = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1).trim();
    if (!label || !value) continue;
    lines.push({ label, value });
  }
  return lines;
}

function buildPieSlices(items: { label: string; count: number }[]): PieSlice[] {
  const total = items.reduce((acc, item) => acc + item.count, 0);
  if (total === 0) return [];

  const colors = ["#1b3d92", "#2f64c5", "#4f83e1", "#6aa3f0", "#9bbcf6", "#c4d7fb"];
  const radius = 80;
  const center = 90;

  let startAngle = -Math.PI / 2;
  return items.map((item, index) => {
    const angle = (item.count / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const percent = (item.count / total) * 100;
    startAngle = endAngle;
    return {
      label: item.label,
      value: item.count,
      percent,
      color: colors[index % colors.length],
      path,
    };
  });
}

function buildLinePath(points: LinePoint[], width: number, height: number, padding: number) {
  if (points.length === 0) return "";
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const dx = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const range = max - min || 1;
  return points
    .map((p, index) => {
      const x = padding + index * dx;
      const y = height - padding - ((p.value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export default function ReportViewer({ reportId }: ReportViewerProps) {
  const { selectedQuizId, selectedQuizTitle } = useQuiz();
  const searchParams = useSearchParams();
  const queryQuizId = searchParams.get("quizId");
  const queryQuizTitle = searchParams.get("quizTitle");
  const isPdf = searchParams.get("pdf") === "1";

  const effectiveQuizId = queryQuizId ? Number(queryQuizId) : selectedQuizId;
  const effectiveQuizTitle = queryQuizTitle || selectedQuizTitle;

  const [interviews, setInterviews] = useState<AdminInterviewListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isPdf) {
      document.body.setAttribute("data-pdf", "1");
    } else {
      document.body.removeAttribute("data-pdf");
    }
  }, [isPdf]);

  useEffect(() => {
    if (!effectiveQuizId) return;
    let active = true;
    setLoading(true);
    setError(null);
    listInterviewsByQuiz(effectiveQuizId)
      .then((items) => {
        if (!active) return;
        setInterviews(items ?? []);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setError("Não foi possível carregar as entrevistas.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [effectiveQuizId]);

  const specs = useMemo<SpecItem[]>(() => {
    const total = interviews.length;

    const dates = interviews
      .map((i) => i.finished_at || i.started_at || i.created_at)
      .filter(Boolean)
      .map((d) => new Date(d as string))
      .filter((d) => !Number.isNaN(d.getTime()));

    let dateLabel = "—";
    if (dates.length > 0) {
      const min = new Date(Math.min(...dates.map((d) => d.getTime())));
      const max = new Date(Math.max(...dates.map((d) => d.getTime())));
      const format = (d: Date) =>
        d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      dateLabel = min.getTime() === max.getTime() ? format(min) : `${format(min)} a ${format(max)}`;
    }

    const moe = total > 0 ? (0.98 / Math.sqrt(total)) * 100 : null;
    const moeLabel = moe ? `margem de erro estimada ${moe.toFixed(1)} p.p.` : "margem de erro estimada —";

    const sources = Array.from(
      new Set(interviews.map((i) => i.source).filter((s): s is string => Boolean(s)))
    );
    const sourceLabel = sources.length > 0 ? sources.join(", ") : "—";

    return [
      {
        icon: Calendar,
        title: "Data de coleta",
        value: dateLabel,
      },
      {
        icon: Target,
        title: "Público-alvo",
        value: "Brasileiros com 16 anos ou mais",
      },
      {
        icon: ClipboardList,
        title: "Método de coleta",
        value: "Coleta domiciliar por entrevistas face a face",
      },
      {
        icon: Users,
        title: "Entrevistas e margem de erro",
        value: total > 0 ? `${total} entrevistas, ${moeLabel}` : "—",
      },
      {
        icon: FileSearch,
        title: "Fonte dos dados",
        value: sourceLabel,
      },
      {
        icon: CheckCircle2,
        title: "Nível de confiabilidade",
        value: "95% de confiança",
      },
    ];
  }, [interviews]);

  const indicators = useMemo(() => {
    const groups = [
      { key: "sexo", title: "Sexo", match: ["sexo", "genero", "gênero"] },
      { key: "idade", title: "Idade", match: ["idade", "faixa etaria", "faixa etária"] },
      { key: "escolaridade", title: "Escolaridade", match: ["escolaridade", "escolar"] },
      { key: "regiao", title: "Região", match: ["regiao", "região"] },
      { key: "renda", title: "Renda", match: ["renda", "faixa de renda"] },
      { key: "religiao", title: "Religião", match: ["religiao", "religião"] },
      { key: "voto", title: "Voto", match: ["voto", "intencao de voto", "intenção de voto"] },
    ];

    const counts: Record<string, GroupCount> = {};
    groups.forEach((g) => {
      counts[g.key] = {};
    });

    let summariesFound = 0;
    interviews.forEach((interview) => {
      const lines = extractSummaryLines(interview.summary);
      if (lines.length > 0) summariesFound += 1;

      lines.forEach((line) => {
        const label = normalizeLabel(line.label);
        const value = line.value.trim();
        if (!value) return;

        const group = groups.find((g) => g.match.some((m) => label.includes(normalizeLabel(m))));
        if (!group) return;

        counts[group.key][value] = (counts[group.key][value] || 0) + 1;
      });
    });

    const groupList = groups
      .map((g) => {
        const entries = Object.entries(counts[g.key]);
        const total = entries.reduce((acc, [, v]) => acc + v, 0);
        const top = entries
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([label, count]) => ({
            label,
            count,
            percent: total > 0 ? (count / total) * 100 : 0,
          }));

        return {
          key: g.key,
          title: g.title,
          total,
          items: top,
        };
      })
      .filter((g) => g.total > 0);

    return {
      summariesFound,
      totalInterviews: interviews.length,
      groupList,
    };
  }, [interviews]);

  const pieData = useMemo(() => {
    const group = indicators.groupList[0];
    if (!group) return null;
    const items = group.items.map((item) => ({
      label: item.label,
      count: item.count,
    }));
    return {
      title: `Distribuição por ${group.title}`,
      slices: buildPieSlices(items),
    };
  }, [indicators.groupList]);

  const lineData = useMemo(() => {
    const buckets = new Map<string, number>();
    interviews.forEach((interview) => {
      const raw = interview.finished_at || interview.started_at || interview.created_at;
      if (!raw) return;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return;
      const label = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      buckets.set(label, (buckets.get(label) || 0) + 1);
    });

    const points = Array.from(buckets.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => {
        const [ad, am] = a.label.split("/").map(Number);
        const [bd, bm] = b.label.split("/").map(Number);
        return ad - bd || am - bm;
      });

    if (points.length < 2) return null;

    const width = 620;
    const height = 220;
    const padding = 28;
    return {
      title: "Volume de entrevistas por data",
      width,
      height,
      padding,
      points,
      path: buildLinePath(points, width, height, padding),
    };
  }, [interviews]);

  return (
    <main
      className={`pt-[80px] sm:pl-[190px] bg-[#f7f7f7] min-h-screen ${
        isPdf ? "!pt-0 !pl-0 bg-white" : ""
      }`}
      data-report-ready={!loading && !error}
      data-pdf={isPdf ? "1" : "0"}
    >
      <div className="max-w-screen-xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between gap-4 pt-4">
          <div>
            <h1 className="text-xl font-semibold text-[#1b2b5b]">Visualização do Relatório</h1>
            <p className="text-sm text-gray-500">
              Relatório #{reportId} • Quiz selecionado:{" "}
              {effectiveQuizId ? (
                <>
                  <span className="font-semibold">{effectiveQuizId}</span> —{" "}
                  <span>{effectiveQuizTitle}</span>
                </>
              ) : (
                <span className="italic">nenhum quiz selecionado</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <Activity className="h-4 w-4" />
              Layout pronto para geração de PDF
            </div>
            {!isPdf && (
              <Button
                type="button"
                className="gap-2 bg-[#1b3d92] hover:bg-[#17357e]"
                disabled={printing || !effectiveQuizId}
                onClick={async () => {
                  if (!effectiveQuizId) return;
                  setPrinting(true);
                  try {
                    const params = new URLSearchParams();
                    params.set("quizId", String(effectiveQuizId));
                    if (effectiveQuizTitle) params.set("quizTitle", effectiveQuizTitle);
                    const res = await fetch(`/api/reports/${reportId}/pdf?${params.toString()}`);
                    if (!res.ok) {
                      const text = await res.text().catch(() => "");
                      throw new Error(text || "Falha ao gerar PDF");
                    }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `relatorio-${reportId}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setPrinting(false);
                  }
                }}
              >
                Imprimir Relatório
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <p className="mt-4 text-xs text-gray-500">Carregando dados do relatório...</p>
        )}
        {error && <p className="mt-4 text-xs text-red-500">{error}</p>}

        <div className="mt-6 space-y-6">
          <section className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a3e93] via-[#1a3a8c] to-[#132a68] text-white shadow-lg">
            <div className="px-8 py-10">
              <div className="text-5xl font-semibold tracking-wide">PESQUISA</div>
              <div className="mt-2 text-xs uppercase tracking-[0.45em] text-white/80">
                {effectiveQuizTitle || "Relatório de Questionário"}
              </div>
              <div className="mt-6 h-1 w-32 bg-gradient-to-r from-[#44d14f] via-[#f7d94c] to-[#6bd3ff]" />
            </div>
            <div className="bg-white text-[#1b2b5b] px-8 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-[#6a7bb4]">
                  Relatório #{reportId}
                </div>
                <div className="mt-2 text-sm font-semibold text-[#1b2b5b]">
                  {effectiveQuizTitle || "Resumo geral"}
                </div>
              </div>
              <div className="text-xs uppercase tracking-[0.3em] text-[#6a7bb4]">
                {specs.find((s) => s.title === "Data de coleta")?.value || "—"}
              </div>
            </div>
          </section>

          <Card className="border-[#dbe2f1]">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm uppercase tracking-[0.25em] text-[#1b2b5b]">
                Especificações técnicas
              </CardTitle>
              <span className="text-xs text-[#6a7bb4]">Pesquisa Quantitativa</span>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {specs.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-3">
                      <div className="h-10 w-10 rounded-lg border border-[#dbe2f1] grid place-items-center text-[#1b2b5b]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#1b2b5b] uppercase tracking-widest">
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-600">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#dbe2f1]">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm uppercase tracking-[0.25em] text-[#1b2b5b]">
                Indicadores
              </CardTitle>
              <span className="text-xs text-[#6a7bb4]">
                Base em respostas resumidas das entrevistas
              </span>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-[#e6ebf7] p-4">
                  <p className="text-xs uppercase tracking-widest text-[#6a7bb4]">Entrevistas</p>
                  <p className="text-2xl font-semibold text-[#1b2b5b]">
                    {indicators.totalInterviews || "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e6ebf7] p-4">
                  <p className="text-xs uppercase tracking-widest text-[#6a7bb4]">Resumos disponíveis</p>
                  <p className="text-2xl font-semibold text-[#1b2b5b]">
                    {indicators.summariesFound || "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e6ebf7] p-4">
                  <p className="text-xs uppercase tracking-widest text-[#6a7bb4]">Cobertura</p>
                  <p className="text-2xl font-semibold text-[#1b2b5b]">
                    {indicators.totalInterviews > 0
                      ? `${Math.round((indicators.summariesFound / indicators.totalInterviews) * 100)}%`
                      : "—"}
                  </p>
                </div>
              </div>

              {indicators.groupList.length === 0 && (
                <p className="mt-4 text-sm text-gray-500">
                  Nenhum indicador disponível. Verifique se o campo <code>summary</code> está preenchido
                  nas entrevistas.
                </p>
              )}

              {indicators.groupList.length > 0 && (
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {indicators.groupList.map((group) => (
                    <div key={group.key} className="rounded-lg border border-[#e6ebf7]">
                      <div className="px-4 py-2 border-b bg-[#f4f7ff] text-xs uppercase font-semibold text-[#1b2b5b] tracking-widest">
                        {group.title}
                      </div>
                      <div className="px-4 py-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[11px] text-[#6a7bb4] uppercase tracking-widest">
                              <th className="text-left font-semibold pb-2">Categoria</th>
                              <th className="text-right font-semibold pb-2">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item) => (
                              <tr key={item.label} className="text-gray-600">
                                <td className="py-1">{item.label}</td>
                                <td className="py-1 text-right">{item.percent.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {(pieData || lineData) && (
            <Card className="border-[#dbe2f1]">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-sm uppercase tracking-[0.25em] text-[#1b2b5b]">
                  Gráficos
                </CardTitle>
                <span className="text-xs text-[#6a7bb4]">Indicadores visuais por dados reais</span>
              </CardHeader>
              <CardContent className="pt-6 grid gap-8 lg:grid-cols-2">
                {pieData && (
                  <div>
                    <p className="text-xs font-semibold text-[#1b2b5b] uppercase tracking-widest mb-4">
                      {pieData.title}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <svg width="180" height="180" viewBox="0 0 180 180" role="img">
                        {pieData.slices.map((slice) => (
                          <path key={slice.label} d={slice.path} fill={slice.color} />
                        ))}
                      </svg>
                      <div className="space-y-2">
                        {pieData.slices.map((slice) => (
                          <div key={slice.label} className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                            <span className="font-semibold text-[#1b2b5b]">{slice.label}</span>
                            <span className="text-gray-400">{slice.percent.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {lineData && (
                  <div className="w-full overflow-x-auto">
                    <p className="text-xs font-semibold text-[#1b2b5b] uppercase tracking-widest mb-4">
                      {lineData.title}
                    </p>
                    <div className="min-w-[680px]">
                      <svg
                        width={lineData.width}
                        height={lineData.height}
                        viewBox={`0 0 ${lineData.width} ${lineData.height}`}
                        className="w-full"
                        role="img"
                      >
                        <rect x="0" y="0" width={lineData.width} height={lineData.height} fill="white" />
                        {[0, 1, 2, 3, 4].map((i) => {
                          const y = lineData.padding + (i * (lineData.height - lineData.padding * 2)) / 4;
                          return (
                            <line
                              key={i}
                              x1={lineData.padding}
                              x2={lineData.width - lineData.padding}
                              y1={y}
                              y2={y}
                              stroke="#eef1f8"
                            />
                          );
                        })}
                        <path d={lineData.path} stroke="#1b3d92" strokeWidth="2.2" fill="none" />
                        {lineData.points.map((point, index) => {
                          const x =
                            lineData.padding +
                            index * ((lineData.width - lineData.padding * 2) / (lineData.points.length - 1));
                          const values = lineData.points.map((p) => p.value);
                          const min = Math.min(...values);
                          const max = Math.max(...values);
                          const y =
                            lineData.height -
                            lineData.padding -
                            ((point.value - min) / (max - min || 1)) *
                              (lineData.height - lineData.padding * 2);
                          return <circle key={point.label} cx={x} cy={y} r="3" fill="#1b3d92" />;
                        })}
                      </svg>
                      <div className="mt-2 grid grid-cols-8 text-[11px] text-gray-400 uppercase tracking-widest">
                        {lineData.points.slice(0, 8).map((p) => (
                          <span key={p.label} className="text-center">
                            {p.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
