"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash } from "lucide-react";
import { FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

import {
    listInterviewers,
    createInterviewer,
    deleteInterviewer,
    updateInterviewer,
} from "@/utils/actions/interviewers-data";
import { interviewersProps } from "@/utils/types/interviewers";

const ManageInterviewers = () => {
    const [interviewers, setInterviewers] = useState<interviewersProps[]>([]);
    const [loading, setLoading] = useState(true);

    const [formOpen, setFormOpen] = useState(false);
    const [name, setName] = useState("");
    const [additionalInfo, setAdditionalInfo] = useState("");
    const [editing, setEditing] = useState<interviewersProps | null>(null);

    const [searchTerm, setSearchTerm] = useState("");

    const fetchInterviewers = async () => {
        setLoading(true);
        const data = await listInterviewers();
        if (data) setInterviewers(data);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error("O nome é obrigatório");
            return;
        }

        try {
            if (editing) {
                const updated = await updateInterviewer(editing.id!, {
                    name: name.trim(),
                    additional_information: additionalInfo.trim(),
                });

                setInterviewers((prev) =>
                    prev.map((i) => (i.id === updated.id ? updated : i))
                );
                toast.success("Entrevistador atualizado!");
            } else {
                const created = await createInterviewer({
                    name: name.trim(),
                    additional_information: additionalInfo.trim(),
                });

                setInterviewers((prev) => [...prev, created]);
                toast.success("Entrevistador adicionado!");
            }

            handleResetForm();
        } catch {
            toast.error("Erro ao salvar entrevistador.");
        }
    };

    const handleEdit = (interviewer: interviewersProps) => {
        setEditing(interviewer);
        setName(interviewer.name);
        setAdditionalInfo(interviewer.additional_information || "");
        setFormOpen(true);
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
            await deleteInterviewer(id);
            setInterviewers((prev) => prev.filter((i) => i.id !== id));
            toast.success("Entrevistador excluído!");
        } catch {
            toast.error("Erro ao excluir entrevistador.");
        }
    };

    const handleResetForm = () => {
        setEditing(null);
        setFormOpen(false);
        setName("");
        setAdditionalInfo("");
    };

    useEffect(() => {
        fetchInterviewers();
    }, []);

    return (
        <div className="flex flex-col lg:flex-row h-full w-full">
            {/* Lista de Entrevistadores */}
            <div className="lg:w-1/2 border-r p-4">
                <div className="bg-[#e85228] text-white px-4 py-3 rounded-t-md text-lg font-semibold">
                    Lista de Entrevistadores
                </div>

                <div className="flex items-center gap-2 mt-4">
                    <Button size="sm" onClick={() => setFormOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" /> Novo
                    </Button>
                    <Input
                        placeholder="Buscar entrevistador"
                        className="flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <ScrollArea className="h-[400px] mt-4 border rounded-md">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <FaSpinner className="animate-spin text-[#e85228] text-xl" />
                        </div>
                    ) : interviewers.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            Nenhum entrevistador encontrado.
                        </p>
                    ) : (
                        interviewers
                            .filter((i) =>
                                `${i.name} ${i.additional_information || ""}`
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase())
                            )
                            .map((i) => (
                                <div
                                    key={i.id}
                                    className="flex justify-between items-center p-3 border-b cursor-pointer hover:bg-gray-50 transition"
                                    onClick={() => handleEdit(i)}
                                >
                                    <div>
                                        <p className="font-medium">{i.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {i.additional_information || "Sem Informações Adicionais"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(i.id!);
                                        }}
                                        className="text-gray-500 hover:text-red-600"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                    )}
                </ScrollArea>
            </div>

            {/* Formulário de Criar/Editar */}
            {formOpen && (
                <div className="lg:w-1/2 p-4">
                    <div className="bg-[#e85228] text-white px-4 py-3 rounded-t-md text-lg font-semibold">
                        {editing ? "Editar Entrevistador" : "Adicionar novo Entrevistador"}
                    </div>
                    <div className="mt-4 space-y-3">
                        <Input
                            placeholder="Nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={name.trim() === "" ? "border-red-500" : ""}
                        />
                        {name.trim() === "" && (
                            <p className="text-red-500 text-sm">Campo obrigatório</p>
                        )}
                        <Textarea
                            placeholder="Informações Adicionais"
                            value={additionalInfo}
                            onChange={(e) => setAdditionalInfo(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSubmit}
                                className="bg-[#e85228] text-white hover:bg-[#d9441e]"
                            >
                                {editing ? "Salvar Alterações" : "Adicionar Entrevistador"}
                            </Button>
                            <Button variant="outline" onClick={handleResetForm}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageInterviewers;
