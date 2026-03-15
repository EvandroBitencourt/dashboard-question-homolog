import InterviewEdit from "@/app/components/InterviewEdit";

type PageProps = {
    params: Promise<{ id: string }> | { id: string };
};

const InterviewEditPage = async ({ params }: PageProps) => {
    const resolvedParams = await Promise.resolve(params);
    const interviewId = Number(resolvedParams.id);

    if (!Number.isFinite(interviewId) || interviewId <= 0) {
        return (
            <main className="pt-[30px] sm:pl-[190px]">
                <div className="max-w-screen-xl mx-auto px-4 py-8">
                    <p className="text-sm text-red-600">
                        ID de entrevista inválido.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="pt-[30px] sm:pl-[190px]">
            <div className="max-w-screen-xl mx-auto px-4">
                <InterviewEdit interviewId={interviewId} />
            </div>
        </main>
    );
};

export default InterviewEditPage;