import InterviewEdit from "@/app/components/InterviewEdit";

type PageProps = {
    params: Promise<{ id: string }> | { id: string };
};

const InterviewEditPage = async ({ params }: PageProps) => {
    const resolvedParams = await Promise.resolve(params);

    const rawId = resolvedParams?.id;
    const interviewId = Number(rawId);

    if (!Number.isFinite(interviewId) || interviewId <= 0) {
        return (
            <main className="pt-[30px] sm:pl-[190px]">
                <div className="max-w-screen-xl mx-auto px-4 py-8">
                    <p className="text-sm text-red-600">
                        ID de entrevista inválido.
                    </p>

                    <pre className="mt-4 text-xs bg-gray-100 p-3 rounded border overflow-auto">
                        {JSON.stringify(
                            {
                                rawId,
                                interviewId,
                                resolvedParams,
                                paramsType: typeof params,
                            },
                            null,
                            2
                        )}
                    </pre>
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