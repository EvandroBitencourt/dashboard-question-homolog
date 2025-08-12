"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash, Copy } from "lucide-react";
import { FaSpinner } from "react-icons/fa";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

// import {
//   listPins,
//   createPin,
//   updatePin,
//   deletePin,
// } from "@/utils/actions/pins-data";

type PinProps = {
    id?: number;
    name: string;
    code: string; // ex: MBP67W
    assigned: boolean;
    device_uuid?: string | null;
    device_model?: string | null;
    app_version?: string | null;
    android_version?: string | null;
    created_at?: string;
    updated_at?: string;
};

const ORANGE = "#e85228";

function generatePin(len = 6) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // evita 1/I e 0/O
    let out = "";
    for (let i = 0; i < len; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

export default function ManagePins() {
    // esquerda (lista)
    const [pins, setPins] = useState<PinProps[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // direita (form)
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<PinProps | null>(null);

    const [name, setName] = useState("");
    const [code, setCode] = useState(generatePin());
    const [assigned, setAssigned] = useState(false);

    // campos do aparelho (só leitura)
    const [deviceUUID] = useState<string>("");
    const [deviceModel] = useState<string>("");
    const [appVersion] = useState<string>("");
    const [androidVersion] = useState<string>("");

    // ---------- mock de carregamento ----------
    useEffect(() => {
        // (troque pelo listPins() quando ligar na API)
        const load = async () => {
            setLoading(true);
            // const data = await listPins();
            const data: PinProps[] = [
                { id: 1, name: "Evandro", code: "MBP67W", assigned: false },
                { id: 2, name: "Maria Benedita", code: "M1DRA1", assigned: true },
                { id: 3, name: "Mara Jaqueline Almeida", code: "MAMGPP", assigned: false },
            ];
            setPins(data);
            setLoading(false);
        };
        load();
    }, []);

    // ---------- helpers ----------
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return pins;
        return pins.filter(
            (p) =>
                p.name.toLowerCase().includes(term) ||
                p.code.toLowerCase().includes(term)
        );
    }, [pins, search]);

    const resetForm = () => {
        setEditing(null);
        setFormOpen(false);
        setName("");
        setCode(generatePin());
        setAssigned(false);
    };

    const openNew = () => {
        setEditing(null);
        setName("");
        setCode(generatePin());
        setAssigned(false);
        setFormOpen(true);
    };

    const openEdit = (pin: PinProps) => {
        setEditing(pin);
        setName(pin.name);
        setCode(pin.code);
        setAssigned(pin.assigned);
        setFormOpen(true);
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copiado!");
        } catch {
            toast.error("Não foi possível copiar.");
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: "Tem certeza?",
            text: "Essa ação não poderá ser desfeita!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sim, excluir",
            cancelButtonText: "Cancelar",
        });
        if (!result.isConfirmed) return;

        try {
            // await deletePin(id);
            setPins((prev) => prev.filter((p) => p.id !== id));
            toast.success("PIN excluído!");
        } catch {
            toast.error("Erro ao excluir PIN.");
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error("O nome é obrigatório");
            return;
        }

        const payload: PinProps = {
            name: name.trim(),
            code,
            assigned,
        };

        try {
            if (editing?.id) {
                // const updated = await updatePin(editing.id, payload);
                const updated: PinProps = { ...payload, id: editing.id };
                setPins((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
                toast.success("PIN atualizado!");
            } else {
                // const created = await createPin(payload);
                const created: PinProps = { ...payload, id: Math.floor(Math.random() * 100000) };
                setPins((prev) => [created, ...prev]);
                toast.success("PIN criado!");
            }
            resetForm();
        } catch {
            toast.error("Erro ao salvar PIN.");
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full w-full">
            {/* HEADER + AÇÕES */}
            <div className="lg:w-1/2 border-r p-0">
                <div className="flex items-center justify-between bg-[#e85228] text-white px-4 py-3">
                    <h2 className="text-lg font-semibold">Lista de PINs</h2>
                    <Button
                        size="icon"
                        className="bg-white text-[#e85228] hover:bg-white/90"
                        onClick={openNew}
                        title="Adicionar novo PIN"
                    >
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>

                {/* Busca */}
                <div className="p-4">
                    <Input
                        placeholder="Termo para busca"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Lista */}
                <ScrollArea className="h-[calc(100vh-170px)] px-2">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <FaSpinner className="animate-spin text-[#e85228] text-xl" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Nenhum PIN encontrado.</p>
                    ) : (
                        filtered.map((p) => (
                            <div
                                key={p.id}
                                className="flex items-center justify-between px-2 py-3 border-b hover:bg-gray-50 cursor-pointer"
                                onClick={() => openEdit(p)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 grid place-items-center text-gray-600">
                                        <span className="text-lg">⚙️</span>
                                    </div>
                                    <div>
                                        <p className="font-medium">{p.name}</p>
                                        <p className="text-xs text-gray-500">{p.code}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        className="text-gray-500 hover:text-[#e85228]"
                                        title="Copiar PIN"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopy(p.code);
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        className="text-gray-500 hover:text-red-600"
                                        title="Excluir"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (p.id) handleDelete(p.id);
                                        }}
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </div>

            {/* Formulário */}
            {formOpen && (
                <div className="lg:w-1/2 pl-3">
                    <div className="bg-[#e85228] text-white px-4 py-3">
                        <h2 className="text-lg font-semibold">
                            {editing ? "Editar PIN" : "Adicionar novo PIN"}
                        </h2>
                    </div>

                    <div className="p-4 space-y-3">
                        {/* Nome */}
                        <div>
                            <Input
                                placeholder="Nome"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={name.trim() === "" ? "border-red-500" : ""}
                            />
                            {name.trim() === "" && (
                                <p className="text-red-500 text-sm mt-1">
                                    Campo obrigatório. O PIN só será salvo se o nome estiver preenchido corretamente.
                                </p>
                            )}
                        </div>

                        {/* PIN + copiar */}
                        <div className="flex items-center gap-2">
                            <Input value={code} readOnly className="font-mono" />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleCopy(code)}
                                title="Copiar PIN"
                            >
                                <Copy className="w-4 h-4 mr-1" />
                                Copiar
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCode(generatePin())}
                                title="Gerar novo PIN"
                            >
                                Gerar
                            </Button>
                        </div>

                        {/* Atribuído (toggle simples) */}
                        <label className="flex items-center gap-3 select-none">
                            <input
                                type="checkbox"
                                checked={assigned}
                                onChange={(e) => setAssigned(e.target.checked)}
                                className="h-5 w-5 accent-[##e85228]"
                            />
                            <span className="text-sm font-medium">Atribuído</span>
                        </label>

                        <p className="text-gray-700 font-semibold mt-2">Aparelho atribuído</p>

                        {/* Device Fields (read-only) */}
                        <Input placeholder="UUID" value={deviceUUID} readOnly />
                        <Input placeholder="Modelo do aparelho" value={deviceModel} readOnly />
                        <Input placeholder="Versão do App" value={appVersion} readOnly />
                        <Input placeholder="Versão do Android" value={androidVersion} readOnly />

                        <div className="flex gap-2 pt-1">
                            <Button
                                onClick={handleSubmit}
                                className="bg-[#e85228] text-white hover:bg-[#d9441e]"
                            >
                                {editing ? "Salvar Alterações" : "Salvar PIN"}
                            </Button>
                            <Button variant="outline" onClick={resetForm}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
