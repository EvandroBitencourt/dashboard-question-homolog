// app/dashboard/interviews/page.tsx
import InterviewsList from "@/app/components/InterviewsList";

const InterviewsPage = () => {
    return (
        <main className="pt-[80px] sm:pl-[190px]">
            <div className="max-w-screen-xl mx-auto px-4">
                <InterviewsList />
            </div>
        </main>
    );
};

export default InterviewsPage;
