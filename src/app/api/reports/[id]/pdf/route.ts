import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const quizId = url.searchParams.get("quizId") ?? "";
    const quizTitle = url.searchParams.get("quizTitle") ?? "";

    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "http";

    if (!host) {
      return NextResponse.json(
        { error: "Host inválido para geração do PDF." },
        { status: 400 }
      );
    }

    const pageUrl = new URL(`${proto}://${host}/dashboard/generate-report/${id}`);
    pageUrl.searchParams.set("pdf", "1");
    if (quizId) pageUrl.searchParams.set("quizId", quizId);
    if (quizTitle) pageUrl.searchParams.set("quizTitle", quizTitle);

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      const cookie = request.headers.get("cookie");
      if (cookie) {
        await page.setExtraHTTPHeaders({ cookie });
      }

      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
      await page.goto(pageUrl.toString(), { waitUntil: "networkidle0" });
      await page.waitForSelector("[data-report-ready='true']", { timeout: 15000 });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "14mm",
          bottom: "14mm",
          left: "10mm",
          right: "10mm",
        },
      });

      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="relatorio-${id}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error: any) {
    console.error("Erro ao gerar PDF:", error);
    return NextResponse.json(
      {
        error: "Falha ao gerar PDF.",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
