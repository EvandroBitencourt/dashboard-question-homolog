"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listPins } from "@/utils/actions/manage-pin-data";
import type { PinProps } from "@/utils/types/pin";

type Device = { id: number; name: string };

export default function Devices() {
    // origem (Meus aparelhos) -> começa com todos os cadastrados
    const [available, setAvailable] = useState<Device[]>([]);
    // destino (Aparelhos no formulário) -> começa vazio
    const [inForm, setInForm] = useState<Device[]>([]);

    // seleção
    const [selAvail, setSelAvail] = useState<Set<number>>(new Set());
    const [selForm, setSelForm] = useState<Set<number>>(new Set());

    // busca
    const [qAvail, setQAvail] = useState("");
    const [qForm, setQForm] = useState("");

    // carrega os PINs e usa só o nome
    useEffect(() => {
        (async () => {
            const pins = (await listPins()) ?? [];
            const mapped: Device[] = pins
                .filter((p: PinProps) => !!p.id)
                .map((p: PinProps) => ({ id: p.id as number, name: p.name ?? "Sem nome" }));
            setAvailable(mapped);
        })();
    }, []);

    // filtros
    const filteredAvail = useMemo(() => {
        const t = qAvail.trim().toLowerCase();
        return t ? available.filter(d => d.name.toLowerCase().includes(t)) : available;
    }, [available, qAvail]);

    const filteredForm = useMemo(() => {
        const t = qForm.trim().toLowerCase();
        return t ? inForm.filter(d => d.name.toLowerCase().includes(t)) : inForm;
    }, [inForm, qForm]);

    // helpers seleção
    const toggle = (set: Set<number>, id: number) => {
        const s = new Set(set);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
    };

    // mover para a ESQUERDA (<) – volta para "Meus aparelhos"
    const moveLeft = () => {
        if (!selForm.size) return;
        const keepInForm = inForm.filter(d => !selForm.has(d.id));
        const toAvail = inForm.filter(d => selForm.has(d.id));
        setInForm(keepInForm);
        setAvailable(prev => [...prev, ...toAvail].sort((a, b) => a.name.localeCompare(b.name)));
        setSelForm(new Set());
    };

    // mover para a DIREITA (>) – vai para "Aparelhos no formulário"
    const moveRight = () => {
        if (!selAvail.size) return;
        const keepAvail = available.filter(d => !selAvail.has(d.id));
        const toForm = available.filter(d => selAvail.has(d.id));
        setAvailable(keepAvail);
        setInForm(prev => [...prev, ...toForm].sort((a, b) => a.name.localeCompare(b.name)));
        setSelAvail(new Set());
    };

    const canRight = selAvail.size > 0;
    const canLeft = selForm.size > 0;

    return (
        <section className="space-y-6">
            <h2 className="text-xl font-semibold text-[#e85228]">Gerenciar Aparelhos</h2>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">
                {/* ESQUERDA */}
                <Card className="shadow-md">
                    <CardHeader className="bg-[#e85228] text-white py-3 rounded-t">
                        <CardTitle className="text-base">APARELHOS NO FORMULÁRIO</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <Input
                            placeholder="Termo para busca"
                            value={qForm}
                            onChange={(e) => setQForm(e.target.value)}
                        />
                        <ScrollArea className="h-64 border rounded p-2">
                            {filteredForm.map((d) => (
                                <label
                                    key={d.id}
                                    className="flex items-center justify-between gap-3 p-2 border-b cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selForm.has(d.id)}
                                            onChange={() => setSelForm(s => toggle(s, d.id))}
                                            className="h-4 w-4 accent-[#e85228]"
                                        />
                                        <span className="text-sm">{d.name}</span>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded bg-orange-100 text-[#e85228] font-medium">
                                        Entrevistador
                                    </span>
                                </label>
                            ))}
                            {filteredForm.length === 0 && (
                                <p className="text-sm text-muted-foreground px-2 py-4">
                                    Nenhum aparelho vinculado ao formulário.
                                </p>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* BOTÕES CENTRAIS */}
                <div className="flex flex-col gap-3 items-center justify-center">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!canRight}
                        onClick={moveRight}
                        className="w-14"
                        title="Remover do formulário"
                    >
                        &lt;
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!canLeft}
                        onClick={moveLeft}
                        className="w-14"
                        title="Enviar para o formulário"
                    >
                        &gt;
                    </Button>

                </div>

                {/* DIREITA */}
                <Card className="shadow-md">
                    <CardHeader className="bg-[#e85228] text-white py-3 rounded-t">
                        <CardTitle className="text-base">MEUS APARELHOS</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <Input
                            placeholder="Termo para busca"
                            value={qAvail}
                            onChange={(e) => setQAvail(e.target.value)}
                        />
                        <ScrollArea className="h-64 border rounded p-2">
                            {filteredAvail.map((d) => (
                                <label
                                    key={d.id}
                                    className="flex items-center gap-3 p-2 border-b cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selAvail.has(d.id)}
                                        onChange={() => setSelAvail(s => toggle(s, d.id))}
                                        className="h-4 w-4 accent-[#e85228]"
                                    />
                                    <span className="text-sm">{d.name}</span>
                                </label>
                            ))}
                            {filteredAvail.length === 0 && (
                                <p className="text-sm text-muted-foreground px-2 py-4">
                                    Nenhum aparelho disponível.
                                </p>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
