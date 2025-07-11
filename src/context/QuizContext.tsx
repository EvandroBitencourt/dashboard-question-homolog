'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface QuizContextType {
    selectedQuizId: number | null;
    setSelectedQuizId: (id: number | null) => void;
    isClientReady: boolean;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider = ({ children }: { children: ReactNode }) => {
    const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
    const [isClientReady, setIsClientReady] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('selectedQuizId');
        const parsed = Number(stored);

        if (!isNaN(parsed) && parsed > 0) {
            setSelectedQuizId(parsed);
        } else {
            setSelectedQuizId(null);
        }

        setIsClientReady(true);
    }, []);

    useEffect(() => {
        if (selectedQuizId !== null && selectedQuizId > 0) {
            localStorage.setItem('selectedQuizId', String(selectedQuizId));
        } else {
            localStorage.removeItem('selectedQuizId');
        }
    }, [selectedQuizId]);

    return (
        <QuizContext.Provider value={{ selectedQuizId, setSelectedQuizId, isClientReady }}>
            {children}
        </QuizContext.Provider>
    );
};

export const useQuiz = (): QuizContextType => {
    const context = useContext(QuizContext);
    if (!context) {
        throw new Error('useQuiz deve ser usado dentro de QuizProvider');
    }
    return context;
};
