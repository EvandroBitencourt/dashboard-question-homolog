// utils/actions/interviewers-data.ts

import { interviewersProps } from "@/utils/types/interviewers";

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;
const BASE_URL = `${BASE_API_URL}/interviewers`;

// 🔐 Recupera o token salvo via cookie HttpOnly e retorna os headers prontos
async function getServerAuthHeaders(): Promise<HeadersInit> {
    try {
        const res = await fetch("/api/token", {
            method: "GET",
            credentials: "include",
        });

        if (!res.ok) throw new Error(`Token request failed: ${res.status}`);

        const data = await res.json();

        if (!data.token) throw new Error("Token não encontrado na resposta");

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

// ✅ Lista todos os entrevistadores
export async function listInterviewers(): Promise<interviewersProps[] | null> {
    try {
        const headers = await getServerAuthHeaders();
        const res = await fetch(BASE_URL, {
            method: "GET",
            headers,
            cache: "no-cache",
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`❌ Erro ${res.status} ao listar entrevistadores:`, errorText);
            throw new Error(`Erro ${res.status}: ${errorText}`);
        }

        const data: interviewersProps[] = await res.json();
        return data;
    } catch (err) {
        return null;
    }
}

// 🔍 Busca um entrevistador por ID
export async function getInterviewer(id: number): Promise<interviewersProps | null> {
    try {
        const headers = await getServerAuthHeaders();
        const res = await fetch(`${BASE_URL}/${id}`, {
            method: "GET",
            headers,
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`❌ Erro ${res.status} ao buscar entrevistador ${id}:`, errorText);
            throw new Error(`Erro ${res.status}: ${errorText}`);
        }

        return await res.json();
    } catch (err) {
        return null;
    }
}

// ✅ Cria um novo entrevistador
export async function createInterviewer(data: Omit<interviewersProps, "id">): Promise<interviewersProps> {
    try {
        const headers = await getServerAuthHeaders();
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Erro desconhecido" }));
            throw new Error(`Erro da API: ${res.status} - ${errorData.message}`);
        }

        return await res.json();
    } catch (err) {
        throw err;
    }
}

// ✅ Atualiza um entrevistador existente
export async function updateInterviewer(id: number, data: Partial<interviewersProps>): Promise<interviewersProps> {
    try {
        const headers = await getServerAuthHeaders();
        const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Erro desconhecido" }));
            throw new Error(`Erro da API: ${res.status} - ${errorData.message}`);
        }

        return await res.json();
    } catch (err) {
        throw err;
    }
}

// ✅ Exclui um entrevistador
export async function deleteInterviewer(id: number): Promise<boolean> {
    try {
        const headers = await getServerAuthHeaders();
        const res = await fetch(`${BASE_URL}/${id}`, {
            method: "DELETE",
            headers,
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Erro desconhecido" }));
            throw new Error(`Erro da API: ${res.status} - ${errorData.message}`);
        }

        return true;
    } catch (err) {
        throw err;
    }
}
