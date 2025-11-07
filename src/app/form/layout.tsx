// app/form/layout.tsx
import type { Metadata } from "next";
import "../globals.css"; // mantém estilos globais (se precisar, ajuste o caminho)

export const metadata: Metadata = {
    title: "Formulário Público",
    description: "Coleta pública do questionário",
};

export default function FormLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="pt-br" suppressHydrationWarning>
            <body className="min-h-screen bg-white antialiased">
                {/* Página limpa (sem header/sidebar/toast). */}
                {children}
            </body>
        </html>
    );
}
