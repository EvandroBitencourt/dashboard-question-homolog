import ReportViewer from "@/app/components/ReportViewer";

type ReportDetailByQuizPageProps = {
  params: Promise<{ quizId: string; reportId: string }>;
};

export default async function ReportDetailByQuizPage({ params }: ReportDetailByQuizPageProps) {
  const { quizId, reportId } = await params;
  const parsedQuizId = Number(quizId);

  return <ReportViewer reportId={reportId} quizId={Number.isNaN(parsedQuizId) ? undefined : parsedQuizId} />;
}
