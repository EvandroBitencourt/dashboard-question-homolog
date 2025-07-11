import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard"); // ou qualquer rota principal que você deseje
}
