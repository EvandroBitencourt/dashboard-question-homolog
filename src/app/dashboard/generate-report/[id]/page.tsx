import ReportViewer from "@/app/components/ReportViewer";
import "./pdf.css";

const ReportViewPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <ReportViewer reportId={id} />;
};

export default ReportViewPage;
