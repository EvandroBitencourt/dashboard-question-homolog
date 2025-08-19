"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    listAttachedPins,
    listAvailablePins,
    attachPinToQuiz,
    detachPinFromQuiz,
} from "@/utils/actions/quiz-devices-data";
import { useQuiz } from "@/context/QuizContext";

type Device = { id: number; name: string };
const byName = (a: Device, b: Device) => a.name.localeCompare(b.name);
const toDevices = (arr: any): Device[] =>
    Array.isArray(arr) ? arr.map((p: any) => ({
        id: Number(p?.id),
        name: String(p?.name ?? "Sem nome"),
    })) : [];

export default function Devices() {
    const { selectedQuizId } = useQuiz();

    const [available, setAvailable] = useState<Device[]>([]);
    const [inForm, setInForm] = useState<Device[]>([]);
    const [selAvail, setSelAvail] = useState<Set<number>>(new Set());
    const [selForm, setSelForm] = useState<Set<number>>(new Set());
    const [qAvail, setQAvail] = useState("");
    const [qForm, setQForm] = useState("");
    const [loading, setLoading] = useState(false);
    const [acting, setActing] = useState(false);

    // DEBUG
    const [debug, setDebug] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);

    const refreshLeftRight = async () => {
        if (!selectedQuizId) {
            setErr("selectedQuizId vazio");
            return;
        }
        setLoading(true);
        setErr(null);

        try {
            ///console.log("[DEVICES] quizId:", selectedQuizId);
            const [leftRaw, rightRaw] = await Promise.all([
                listAttachedPins(Number(selectedQuizId)),
                listAvailablePins(Number(selectedQuizId)),
            ]);

            // console.log("[DEVICES] raw attached:", leftRaw);
            // console.log("[DEVICES] raw available:", rightRaw);

            // setDebug({
            //     quizId: selectedQuizId,
            //     envApi: process?.env?.NEXT_PUBLIC_API_URL ?? "(sem NEXT_PUBLIC_API_URL)",
            //     leftRaw, rightRaw,
            // });

            const left = toDevices(leftRaw).filter(x => Number.isFinite(x.id)).sort(byName);
            const right = toDevices(rightRaw).filter(x => Number.isFinite(x.id)).sort(byName);

            setInForm(left);
            setAvailable(right);
        } catch (e: any) {
            console.error("[DEVICES] refreshLeftRight ERRO:", e);
            setErr(e?.message || String(e));
            setInForm([]);
            setAvailable([]);
        } finally {
            setSelAvail(new Set());
            setSelForm(new Set());
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshLeftRight();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedQuizId]);

    const filteredAvail = useMemo(() => {
        const t = qAvail.trim().toLowerCase();
        return t ? available.filter(d => d.name.toLowerCase().includes(t)) : available;
    }, [available, qAvail]);

    const filteredForm = useMemo(() => {
        const t = qForm.trim().toLowerCase();
        return t ? inForm.filter(d => d.name.toLowerCase().includes(t)) : inForm;
    }, [inForm, qForm]);

    const toggle = (set: Set<number>, id: number) => {
        const s = new Set(set);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
    };

    const sendRightToLeft = async () => {
        if (!selectedQuizId || !selAvail.size) return;
        setActing(true);
        const ids = new Set(selAvail);
        const moving = available.filter(d => ids.has(d.id));
        setAvailable(prev => prev.filter(d => !ids.has(d.id)));
        setInForm(prev => [...prev, ...moving].sort(byName));
        try {
            await Promise.all([...ids].map(pinId =>
                attachPinToQuiz(Number(selectedQuizId), { pin_id: pinId })
            ));
        } catch (e) {
            console.error("[DEVICES] attach falhou:", e);
        } finally {
            await refreshLeftRight();
            setActing(false);
        }
    };

    const sendLeftToRight = async () => {
        if (!selectedQuizId || !selForm.size) return;
        setActing(true);
        const ids = new Set(selForm);
        const moving = inForm.filter(d => ids.has(d.id));
        setInForm(prev => prev.filter(d => !ids.has(d.id)));
        setAvailable(prev => [...prev, ...moving].sort(byName));
        try {
            await Promise.all([...ids].map(pinId =>
                detachPinFromQuiz(Number(selectedQuizId), pinId)
            ));
        } catch (e) {
            console.error("[DEVICES] detach falhou:", e);
        } finally {
            await refreshLeftRight();
            setActing(false);
        }
    };

    const canSendRight = selAvail.size > 0 && !acting && !loading;
    const canSendLeft = selForm.size > 0 && !acting && !loading;

    return (
        <section className="space-y-4">
            <h2 className="text-xl font-semibold text-[#e85228]">Gerenciar Aparelhos</h2>

            {/* DEBUG UI */}
            <div className="text-xs rounded border p-2 bg-neutral-50">
                {/* <div><b>quizId:</b> {String(selectedQuizId)}</div>
                <div><b>NEXT_PUBLIC_API_URL:</b> {String(process?.env?.NEXT_PUBLIC_API_URL ?? "(unset)")}</div> */}
                {err && <div className="text-red-600"><b>Erro:</b> {err}</div>}
                {debug && (
                    <details>
                        <summary>payloads crus (clique)</summary>
                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(debug, null, 2)}</pre>
                    </details>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">
                {/* ESQUERDA */}
                <Card className="shadow-md">
                    <CardHeader className="bg-[#e85228] text-white py-3 rounded-t">
                        <CardTitle className="text-base">APARELHOS NO FORMULÁRIO</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <Input placeholder="Termo para busca" value={qForm} onChange={e => setQForm(e.target.value)} disabled={loading} />
                        <ScrollArea className="h-64 border rounded p-2">
                            {(filteredForm ?? []).map((d) => (
                                <label key={d.id} className="flex items-center justify-between gap-3 p-2 border-b cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selForm.has(d.id)}
                                            onChange={() => setSelForm(s => toggle(s, d.id))}
                                            className="h-4 w-4 accent-[#e85228]" disabled={acting || loading}
                                        />
                                        <span className="text-sm">{d.name}</span>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded bg-orange-100 text-[#e85228] font-medium">Entrevistador</span>
                                </label>
                            ))}
                            {(filteredForm ?? []).length === 0 && (
                                <p className="text-sm text-muted-foreground px-2 py-4">Nenhum aparelho vinculado ao formulário.</p>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* BOTÕES */}
                <div className="flex flex-col gap-3 items-center justify-center">
                    <Button variant="outline" size="sm" disabled={!canSendRight} onClick={sendRightToLeft} className="w-14" title="Enviar para o formulário">&lt;</Button>
                    <Button variant="outline" size="sm" disabled={!canSendLeft} onClick={sendLeftToRight} className="w-14" title="Remover do formulário">&gt;</Button>
                </div>

                {/* DIREITA */}
                <Card className="shadow-md">
                    <CardHeader className="bg-[#e85228] text-white py-3 rounded-t">
                        <CardTitle className="text-base">MEUS APARELHOS</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <Input placeholder="Termo para busca" value={qAvail} onChange={e => setQAvail(e.target.value)} disabled={loading} />
                        <ScrollArea className="h-64 border rounded p-2">
                            {(filteredAvail ?? []).map((d) => (
                                <label key={d.id} className="flex items-center gap-3 p-2 border-b cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selAvail.has(d.id)}
                                        onChange={() => setSelAvail(s => toggle(s, d.id))}
                                        className="h-4 w-4 accent-[#e85228]" disabled={acting || loading}
                                    />
                                    <span className="text-sm">{d.name}</span>
                                </label>
                            ))}
                            {(filteredAvail ?? []).length === 0 && (
                                <p className="text-sm text-muted-foreground px-2 py-4">Nenhum aparelho disponível.</p>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
