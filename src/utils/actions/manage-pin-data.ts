import { PinProps } from "../types/pin";

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;
const API_URL = `${BASE_API_URL}/manage-pins`;

// 🔐 pega o token salvo via rota interna /api/token
async function getServerAuthHeaders(): Promise<HeadersInit> {
    const res = await fetch("/api/token", { method: "GET" });

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

/** Normaliza assigned vindo do backend (0/1/"0"/"1" → boolean) */
function normalizeAssigned<T extends PinProps | PinProps[]>(data: T): T {
    const toBool = (v: any) =>
        v === true || v === 1 || v === "1" ? true : false;

    if (Array.isArray(data)) {
        return data.map((p) => ({ ...p, assigned: toBool(p.assigned) })) as T;
    }
    return { ...data, assigned: toBool(data.assigned) } as T;
}

/** ✅ Lista PINs (opcional: search e/ou assigned) */
export async function listPins(params?: {
    search?: string;
    assigned?: boolean | 0 | 1;
}): Promise<PinProps[] | null> {
    try {
        const headers = await getServerAuthHeaders();

        // dentro de listPins(...)
        const qs = new URLSearchParams();
        if (params?.search) qs.set("search", params.search);

        if (params?.assigned !== undefined) {
            // params.assigned é boolean | 0 | 1 → não compare com "1" (string)
            const val = params.assigned === true || params.assigned === 1 ? "1" : "0";
            qs.set("assigned", val);
        }


        const res = await fetch(`${API_URL}${qs.toString() ? `?${qs}` : ""}`, {
            method: "GET",
            headers,
            next: { revalidate: 60 },
        });

        if (!res.ok) throw new Error("Erro ao listar PINs");

        const data: PinProps[] = await res.json();
        return normalizeAssigned(data);
    } catch (err) {
        console.error("Erro ao listar PINs:", err);
        return null;
    }
}

/** ✅ Cria PIN (só precisa do name; pin_code é gerado se não enviar) */
export async function createPin(payload: { name: string; pin_code?: string }): Promise<PinProps> {
    const headers = await getServerAuthHeaders();

    const res = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
            `Erro da API: ${res.status} - ${errorData.message || res.statusText}`
        );
    }

    const data: PinProps = await res.json();
    return normalizeAssigned(data);
}

/** ✅ Mostra PIN pelo id */
export async function showPin(id: number): Promise<PinProps | null> {
    try {
        const headers = await getServerAuthHeaders();

        const res = await fetch(`${API_URL}/${id}`, {
            method: "GET",
            headers,
            cache: "no-cache",
        });

        if (!res.ok) throw new Error("Erro ao buscar PIN");

        const data: PinProps = await res.json();
        return normalizeAssigned(data);
    } catch (err) {
        console.error("Erro ao buscar PIN:", err);
        return null;
    }
}

// ✅ Atualiza apenas nome e/ou assigned
export async function updatePin(
    id: number,
    payload: { name?: string; assigned?: boolean }
): Promise<PinProps> {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
            `Erro da API: ${res.status} - ${errorData.message || res.statusText}`
        );
    }

    const data: PinProps = await res.json();
    return normalizeAssigned(data);
}

/** ✅ Exclui PIN pelo id */
export async function deletePin(id: number): Promise<boolean> {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
            `Erro da API: ${res.status} - ${errorData.message || res.statusText}`
        );
    }

    return true;
}

