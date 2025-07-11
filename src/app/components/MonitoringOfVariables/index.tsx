"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { FaSpinner } from "react-icons/fa";

import { useQuiz } from "@/context/QuizContext";
import { QuestionProps } from "@/utils/types/question";
import { listQuestionsByQuiz } from "@/utils/actions/question-data";

const MonitoringOfVariables = () => {
    const { selectedQuizId } = useQuiz();
    const [questions, setQuestions] = useState<QuestionProps[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuestions = async () => {
            if (!selectedQuizId) return;

            setLoading(true);
            const data = await listQuestionsByQuiz(selectedQuizId);
            if (data) setQuestions(data);
            setLoading(false);
        };

        fetchQuestions();
    }, [selectedQuizId]);

    return (
        <section>
            <Card className="shadow-sm">
                <CardHeader className="flex items-center justify-between border-b pb-2">
                    <CardTitle className="text-lg text-[#e85228] font-bold">
                        QUESTÕES
                    </CardTitle>
                    <Button variant="link" className="text-blue-600 text-sm">
                        <Download className="w-4 h-4 mr-1" />
                        BAIXAR PDF COMPLETO
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    <ScrollArea className="p-4">
                        {loading ? (
                            <div className="flex justify-center items-center py-10">
                                <FaSpinner className="animate-spin text-[#e85228] w-5 h-5" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {questions.map((question, index) => (
                                    <div
                                        key={question.id}
                                        className="border rounded px-4 py-2 text-sm flex items-center gap-2 shadow-sm hover:bg-orange-50 cursor-pointer transition"
                                    >
                                        <span className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-gray-500 rounded-full" />
                                        </span>
                                        <span className="truncate">
                                            {`Q${index + 1} - P${question.variable} | ${question.title}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </section>
    );
};

export default MonitoringOfVariables;
