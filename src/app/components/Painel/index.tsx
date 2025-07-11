// app/dashboard/Painel.tsx
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Clock, Download, Hourglass } from "lucide-react";

const quotas = [
  "Masculino 33/33 - (100%)",
  "Feminino 34/34 - (100%)",
  "analfabeto/lê e escreve 2/2 - (100%)",
  "fundamental 18/18 - (100%)",
  "ensino médio 34/34 - (100%)",
  "superior ou + 13/13 - (100%)",
  "Bandeirantes 35/34 - (102%)",
  "Parque das Emas 29/30 - (96%)",
  "Parque dos Buritis 3/3 - (100%)",
];

const Painel = () => {
  return (
    <section className="p-4 space-y-6">
      {/* Métricas principais */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-col items-center">
            <Clock className="w-6 h-6 mb-2 text-gray-600" />
            <CardTitle className="text-center text-sm text-muted-foreground">
              Duração Média
            </CardTitle>
            <CardContent>
              <p className="text-xl font-bold text-center">13.70 min</p>
            </CardContent>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col items-center">
            <Download className="w-6 h-6 mb-2 text-gray-600" />
            <CardTitle className="text-center text-sm text-muted-foreground">
              Média de Coletas por Dia
            </CardTitle>
            <CardContent>
              <p className="text-xl font-bold text-center">33.5</p>
            </CardContent>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col items-center">
            <Hourglass className="w-6 h-6 mb-2 text-gray-600" />
            <CardTitle className="text-center text-sm text-muted-foreground">
              Previsto X Realizado
            </CardTitle>
            <CardContent>
              <p className="text-xl font-bold text-center">67/67 (100%)</p>
            </CardContent>
          </CardHeader>
        </Card>
      </section>

      {/* Quotas e Gráficos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quotas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            {quotas.map((item, index) => (
              <p key={index} className="border-b pb-1 last:border-none">
                › {item}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coletas por dia</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Aqui você pode substituir por um gráfico real futuramente */}
            <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">
              [Gráfico Coletas por dia - Exemplo]
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tempo médio por entrevistador */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tempo médio de entrevista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">
              [Gráfico Tempo por entrevistador - Exemplo]
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm text-left text-gray-700">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Nome</th>
                  <th>Total</th>
                  <th>Coletas/dia</th>
                  <th>Duração Média</th>
                  <th>Última coleta</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Lúcia Maria</td>
                  <td>67</td>
                  <td>33.50</td>
                  <td>13.70 min</td>
                  <td>03/06/2025, 19:47:04</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </section>
  );
};

export default Painel;
