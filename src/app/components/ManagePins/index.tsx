"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash, Copy } from "lucide-react";
import { FaSpinner } from "react-icons/fa";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

import { PinProps } from "@/utils/types/pin";
import { listPins, createPin, updatePin, deletePin } from "@/utils/actions/manage-pin-data";

const ORANGE = "#e85228";

/** Gera um UUID v4 apenas para EXIBIÇÃO no formulário de novo PIN */
function genUUIDv4() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    const s: string[] = [];
    const hex = "0123456789abcdef";
    for (let i = 0; i < 36; i++) s[i] = hex[Math.floor(Math.random() * 16)];
    s[14] = "4";
    // @ts-ignore
    s[19] = hex[(parseInt(s[19], 16) & 0x3) | 0x8];
    s[8] = s[13] = s[18] = s[23] = "-";
    return s.join("");
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
    const [pinCode, setPinCode] = useState(""); // read-only
    const [assigned, setAssigned] = useState<boolean>(false); // editável

    // campos do aparelho (read-only)
    const [deviceUUID, setDeviceUUID] = useState<string>("");
    const [deviceModel, setDeviceModel] = useState<string>("");
    const [appVersion, setAppVersion] = useState<string>("");
    const [androidVersion, setAndroidVersion] = useState<string>("");

    // ---------- carregar da API ----------
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await listPins();
                setPins(data ?? []);
            } catch {
                toast.error("Erro ao listar PINs.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // ---------- helpers ----------
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return pins;

        return pins.filter((p) => {
            const n = (p.name ?? "").toLowerCase();
            const c = (p.pin_code ?? "").toLowerCase();
            return n.includes(term) || c.includes(term);
        });
    }, [pins, search]);

    const resetForm = () => {
        setEditing(null);
        setFormOpen(false);
        setName("");
        setPinCode("");
        setAssigned(false);
        setDeviceUUID("");
        setDeviceModel("");
        setAppVersion("");
        setAndroidVersion("");
    };

    const openNew = () => {
        resetForm();
        // Mostra um UUID v4 fake apenas para visual (não será enviado no create)
        setDeviceUUID(genUUIDv4());
        setFormOpen(true);
    };

    const openEdit = (pin: PinProps) => {
        setEditing(pin);
        setName(pin.name);
        setPinCode(pin.pin_code ?? "");
        setAssigned(!!pin.assigned);
        setDeviceUUID(pin.uuid ?? "");
        setDeviceModel(pin.device_model ?? "");
        setAppVersion(pin.app_version ?? "");
        setAndroidVersion(pin.android_version ?? "");
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
            await deletePin(id);
            setPins((prev) => prev.filter((p) => p.id !== id));
            toast.success("PIN excluído!");
            if (editing?.id === id) resetForm();
        } catch {
            toast.error("Erro ao excluir PIN.");
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error("O nome é obrigatório");
            return;
        }

        try {
            if (editing?.id) {
                // atualização: só nome e/ou atribuído
                const updated = await updatePin(editing.id, {
                    name: name.trim(),
                    assigned,
                });

                setPins((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
                setEditing(updated); // mantém na tela
                toast.success("PIN atualizado!");
            } else {
                // criação: envia só o nome; PIN é gerado no backend
                const created = await createPin({ name: name.trim() });
                setPins((prev) => [created, ...prev]);
                toast.success("PIN criado!");

                // Preenche para exibir/copiar
                setEditing(created);
                setPinCode(created.pin_code ?? "");
                setAssigned(!!created.assigned);
                setDeviceUUID(created.uuid ?? deviceUUID); // se backend não mandar, mantém o fake exibido
                setDeviceModel(created.device_model ?? "");
                setAppVersion(created.app_version ?? "");
                setAndroidVersion(created.android_version ?? "");
            }
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
                                        <p className="text-xs text-gray-500">{p.pin_code}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        className="text-gray-500 hover:text-[#e85228]"
                                        title="Copiar PIN"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopy(p.pin_code ?? "");
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    {p.id && (
                                        <button
                                            className="text-gray-500 hover:text-red-600"
                                            title="Excluir"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(p.id!);
                                            }}
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </div>

            {/* Formulário */}
            {formOpen && (
                <div className="lg:w-1/2 pl-2">
                    <div className="bg-[#e85228] text-white px-4 py-3">
                        <h2 className="text-lg font-semibold">
                            {editing ? "Detalhes do PIN" : "Adicionar novo PIN"}
                        </h2>
                    </div>

                    <div className="p-4 space-y-3">
                        {/* Nome (editável) */}
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

                        {/* PIN + copiar (read-only) */}
                        <div className="flex items-center gap-2">
                            <Input value={pinCode} readOnly className="font-mono" />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleCopy(pinCode)}
                                title="Copiar PIN"
                                disabled={!pinCode}
                            >
                                <Copy className="w-4 h-4 mr-1" />
                                Copiar
                            </Button>
                            {/* “Gerar” desabilitado (PIN é gerado no backend) */}
                            <Button type="button" variant="outline" disabled title="Gerado automaticamente">
                                Gerar
                            </Button>
                        </div>

                        {/* Atribuído (editável) */}
                        <label className="flex items-center gap-3 select-none">
                            <input
                                type="checkbox"
                                checked={assigned}
                                onChange={(e) => setAssigned(e.target.checked)}
                                className="h-5 w-5 accent-[#e85228]"
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
                                {editing ? "Salvar" : "Salvar PIN"}
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
