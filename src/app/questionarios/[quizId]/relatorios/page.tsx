import Reports from "@/app/components/Reports";

type ReportsByQuizPageProps = {
  params: Promise<{ quizId: string }>;
};

export default async function ReportsByQuizPage({ params }: ReportsByQuizPageProps) {
  const { quizId } = await params;
  const parsedQuizId = Number(quizId);

  return (
    <main className="pt-[80px] sm:pl-[190px]">
      <div className="mx-auto max-w-screen-xl p-4">
        <Reports forcedQuizId={Number.isNaN(parsedQuizId) ? null : parsedQuizId} />
      </div>
    </main>
  );
}
