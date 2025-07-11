"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

const formDevices = [
    { name: "Evandro", role: "Entrevistador" },
    { name: "Luiz", role: "Entrevistador" },
    { name: "Roberto David", role: "Entrevistador" },
];

const availableDevices = [
    "Maria Benedita",
    "Mara Jaqueline Almeida",
    "Mairza",
    "Maria das Graças Andrade",
];

const Devices = () => {
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <section className="space-y-6">
            <h2 className="text-xl font-semibold text-[#e85228]">Gerenciar Aparelhos</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Aparelhos no formulário */}
                <Card className="shadow-md">
                    <CardHeader className="bg-[#e85228] text-white py-3 rounded-t">
                        <CardTitle className="text-base">APARELHOS NO FORMULÁRIO</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <Input placeholder="Termo para busca" />
                        <ScrollArea className="h-64 border rounded p-2">
                            {formDevices.map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-2 border-b">
                                    <label className="text-sm">{d.name}</label>
                                    <span className="text-xs px-2 py-1 rounded bg-orange-100 text-[#e85228] font-medium">
                                        {d.role}
                                    </span>
                                </div>
                            ))}
                        </ScrollArea>
                        <div className="flex justify-center gap-2 pt-2">
                            <Button variant="outline" size="sm">
                                &gt;
                            </Button>
                            <Button variant="outline" size="sm">
                                &lt;
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Meus Aparelhos */}
                <Card className="shadow-md">
                    <CardHeader className="bg-[#e85228] text-white py-3 rounded-t">
                        <CardTitle className="text-base">MEUS APARELHOS</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <Input placeholder="Termo para busca" />
                        <ScrollArea className="h-64 border rounded p-2">
                            {availableDevices.map((d, i) => (
                                <div key={i} className="flex items-center space-x-2 p-1">
                                    <input type="checkbox" />
                                    <label className="text-sm">{d}</label>
                                </div>
                            ))}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
};

export default Devices;
