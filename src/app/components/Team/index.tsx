"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

const teamInForm = ["luiz.felipe1708@gmail.com"];
const myTeam = [
    "evandro_bam@hotmail.com",
    "valquiriacamoraes@gmail.com",
    "yagomedeiros14@hotmail.com",
];

const Team = () => {
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <section className="space-y-6">
            <h2 className="text-xl font-semibold text-[#e85228]">Gerenciar Equipe</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Equipe no formulário */}
                <Card className="shadow-md">
                    <CardHeader className="bg-[#e85228] text-white py-3 rounded-t">
                        <CardTitle className="text-base">Equipe no Formulário</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <Input placeholder="Termo para busca" />
                        <ScrollArea className="h-64 border rounded p-2">
                            {teamInForm.map((email, i) => (
                                <div key={i} className="flex items-center space-x-2 p-1">
                                    <input type="checkbox" />
                                    <label className="text-sm">{email}</label>
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

                {/* Minha equipe */}
                <Card className="shadow-md">
                    <CardHeader className="bg-[#e85228] text-white py-3 rounded-t">
                        <CardTitle className="text-base">Minha Equipe</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <Input placeholder="Termo para busca" />
                        <ScrollArea className="h-64 border rounded p-2">
                            {myTeam.map((email, i) => (
                                <div key={i} className="flex items-center space-x-2 p-1">
                                    <input type="checkbox" />
                                    <label className="text-sm">{email}</label>
                                </div>
                            ))}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
};

export default Team;
