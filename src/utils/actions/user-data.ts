import type { UserProps } from "@/utils/types/user";

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

// 🔐 Busca o token salvo no cookie
async function getServerAuthHeaders(): Promise<HeadersInit> {
    const res = await fetch("/api/token", {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Token não encontrado");
    }

    const data = await res.json();

    return {
        Authorization: `Bearer ${data.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

// ✅ GET perfil logado
export async function getUserProfile(): Promise<UserProps> {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${BASE_API_URL}/me`, {
        method: "GET",
        headers,
        cache: "no-cache",
    });

    if (!res.ok) {
        throw new Error("Erro ao buscar perfil do usuário.");
    }

    return await res.json();
}

// ✅ PUT /me — Atualiza nome, email e senha
type UpdateUserPayload = {
    username?: string;
    email?: string;
    password?: string;
};

export async function updateMyProfile(data: UpdateUserPayload) {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${BASE_API_URL}/me`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
            error?.messages?.username ||
            error?.messages?.email ||
            error?.messages?.password ||
            "Erro ao atualizar perfil."
        );
    }

    return await res.json(); // deve retornar { message, user }
}
