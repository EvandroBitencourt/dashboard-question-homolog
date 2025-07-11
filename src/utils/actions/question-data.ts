// utils/actions/question-data.ts

import { QuestionProps, QuestionWithOptions } from "@/utils/types/question";

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;
const BASE_URL = `${BASE_API_URL}/question`;
const BASE_WITH_OPTIONS_URL = `${BASE_API_URL}/question-with-options`;

// Boolean fields that need conversion between frontend (boolean) and backend (0/1)
const BOOLEAN_FIELDS = ["is_required", "is_hidden", "is_readonly", "shuffle_options"] as const;

// 🔐 Recupera o token salvo via cookie HttpOnly e retorna os headers prontos
async function getServerAuthHeaders(): Promise<HeadersInit> {
    try {
        const res = await fetch("/api/token", {
            method: "GET",
            credentials: "include", // Ensure cookies are sent
        });

        if (!res.ok) {
            throw new Error(`Token request failed: ${res.status}`);
        }

        const data = await res.json();

        if (!data.token) {
            throw new Error("Token não encontrado na resposta");
        }

        return {
            Authorization: `Bearer ${data.token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        };
    } catch (err) {
        console.error("Erro ao obter headers de autenticação:", err);
        throw new Error("Falha na autenticação");
    }
}

// 🔄 Convert boolean values to 0/1 for backend
function convertBooleansToNumbers(data: Partial<QuestionProps>): Partial<QuestionProps> {
    const converted = { ...data };
    
    BOOLEAN_FIELDS.forEach((field) => {
        if (field in converted) {
            const value = converted[field as keyof QuestionProps];
            if (typeof value === 'boolean') {
                // @ts-ignore - We know this field exists and should be converted
                converted[field] = value ? 1 : 0;
                // console.log(`🔄 Convertendo ${field}: ${value} → ${converted[field]}`);
            } else if (value === 1 || value === "1") {
                // @ts-ignore
                converted[field] = 1;
            } else if (value === 0 || value === "0") {
                // @ts-ignore
                converted[field] = 0;
            }
        }
    });
    return converted;
}

// 🔄 Convert 0/1 values to boolean for frontend
function convertNumbersToBooleans(data: QuestionProps): QuestionProps {
    const converted = { ...data };
    
    BOOLEAN_FIELDS.forEach((field) => {
        if (field in converted) {
            const value = converted[field as keyof QuestionProps];
            // Explicitly check for 1, 0, true, false, "1", "0"
            // @ts-ignore - We know this field exists and should be converted
            if (value === 1 || value === "1" || value === true) {
                converted[field] = true;
            } else if (value === 0 || value === "0" || value === false || value === null || value === undefined) {
                converted[field] = false;
            } else {
                // For any other value, convert to boolean
                converted[field] = Boolean(value);
            }
        }
    });
    return converted;
}

// 🔄 Convert array of questions
function convertQuestionsArray(questions: QuestionProps[]): QuestionProps[] {
    return questions.map(convertNumbersToBooleans);
}

// 🔍 Busca uma pergunta com suas opções (GET /api/question-with-options/:id)
export async function getQuestionWithOptions(
    id: number
): Promise<QuestionWithOptions | null> {
    try {
        const headers = await getServerAuthHeaders();
        const res = await fetch(`${BASE_WITH_OPTIONS_URL}/${id}`, {
            method: "GET",
            headers,
            cache: "no-cache", // Prevent stale data
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`❌ Erro ${res.status} ao buscar pergunta ${id}:`, errorText);
            throw new Error(`Erro ${res.status}: ${errorText}`);
        }

        const data: QuestionWithOptions = await res.json();
        
        // Convert boolean fields
        const convertedData = {
            ...data,
            question: convertNumbersToBooleans(data.question),
        };
        // console.log('✅ Pergunta com opções carregada:', convertedData);
        return convertedData;
    } catch (err) {
        // console.error("❌ Erro ao buscar pergunta com opções:", err);
        return null;
    }
}

// ✅ Lista todas as perguntas (sem filtro)
export async function listQuestions(): Promise<QuestionProps[] | null> {
    try {
        const headers = await getServerAuthHeaders();
        const res = await fetch(BASE_URL, {
            method: "GET",
            headers,
            cache: "no-cache",
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`❌ Erro ${res.status} ao listar perguntas:`, errorText);
            throw new Error(`Erro ${res.status}: ${errorText}`);
        }

        const data: QuestionProps[] = await res.json();
        const convertedData = convertQuestionsArray(data);
        
        // console.log('✅ Perguntas listadas:', convertedData);
        return convertedData;
    } catch (err) {
        // console.error("❌ Erro ao buscar perguntas:", err);
        return null;
    }
}

// ✅ Lista perguntas filtrando por quiz_id
export async function listQuestionsByQuiz(
    quizId: number
): Promise<QuestionProps[] | null> {
    try {
        const headers = await getServerAuthHeaders();
        const url = `${BASE_URL}?quiz_id=${encodeURIComponent(quizId)}`;
        
        const res = await fetch(url, {
            method: "GET",
            headers,
            cache: "no-cache",
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`❌ Erro ${res.status} ao buscar perguntas do quiz ${quizId}:`, errorText);
            throw new Error(`Erro ${res.status}: ${errorText}`);
        }

        const data: QuestionProps[] = await res.json();
        const convertedData = convertQuestionsArray(data);
        // console.log(`✅ Perguntas do quiz ${quizId} listadas:`, convertedData);
        return convertedData;
    } catch (err) {
        // console.error(`❌ Erro ao buscar perguntas por quiz_id ${quizId}:`, err);
        return null;
    }
}

// ✅ Cria uma nova pergunta
export async function createQuestion(
    data: Partial<QuestionProps>
): Promise<QuestionProps> {
    try {
        const headers = await getServerAuthHeaders();
        const convertedData = convertBooleansToNumbers(data);
        
        // console.log('📤 Criando pergunta com dados:', convertedData);
        
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(convertedData),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Erro desconhecido" }));
            const errorMessage = `Erro da API: ${res.status} - ${errorData.message || res.statusText}`;
            console.error("❌ Erro ao criar pergunta:", errorMessage, errorData);
            throw new Error(errorMessage);
        }

        const responseData: QuestionProps = await res.json();
        const convertedResponse = convertNumbersToBooleans(responseData);
        
        // console.log('✅ Pergunta criada com sucesso:', convertedResponse);
        return convertedResponse;
    } catch (err) {
        // console.error("❌ Erro ao criar pergunta:", err);
        throw err;
    }
}

// ✅ Atualiza uma pergunta
export async function updateQuestion(
    id: number,
    data: Partial<QuestionProps>
): Promise<QuestionProps> {
    try {
        const headers = await getServerAuthHeaders();
        const convertedData = convertBooleansToNumbers(data);
        
        // console.log(`📤 Atualizando pergunta ${id} com dados:`, convertedData);
        
        const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(convertedData),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Erro desconhecido" }));
            const errorMessage = `Erro da API: ${res.status} - ${errorData.message || res.statusText}`;
            console.error(`❌ Erro ao atualizar pergunta ${id}:`, errorMessage, errorData);
            throw new Error(errorMessage);
        }

        const responseData: QuestionProps = await res.json();
        const convertedResponse = convertNumbersToBooleans(responseData);
        
        // console.log(`✅ Pergunta ${id} atualizada com sucesso:`, convertedResponse);
        return convertedResponse;
    } catch (err) {
        console.error(`❌ Erro ao atualizar pergunta ${id}:`, err);
        throw err;
    }
}

// ✅ Exclui uma pergunta
export async function deleteQuestion(id: number): Promise<boolean> {
    try {
        const headers = await getServerAuthHeaders();
        
        // console.log(`🗑️ Excluindo pergunta ${id}`);
        
        const res = await fetch(`${BASE_URL}/${id}`, {
            method: "DELETE",
            headers,
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Erro desconhecido" }));
            const errorMessage = `Erro da API: ${res.status} - ${errorData.message || res.statusText}`;
            console.error(`❌ Erro ao excluir pergunta ${id}:`, errorMessage, errorData);
            throw new Error(errorMessage);
        }

        // console.log(`✅ Pergunta ${id} excluída com sucesso`);
        return true;
    } catch (err) {
        // console.error(`❌ Erro ao excluir pergunta ${id}:`, err);
        throw err;
    }
}

// 🔧 Utility function for debugging - call this to see raw backend data
export async function debugQuestionData(id: number): Promise<void> {
    try {
        const headers = await getServerAuthHeaders();
        const res = await fetch(`${BASE_WITH_OPTIONS_URL}/${id}`, {
            method: "GET",
            headers,
        });

        if (res.ok) {
            const rawData = await res.json();
            // console.log('🔍 Dados RAW do backend (sem conversão):', rawData);
        }
    } catch (err) {
        console.error('❌ Erro no debug:', err);
    }
}