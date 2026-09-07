import { Metadata } from "next";
import ProjectDetailPageClient from "@/components/page/ad/projects/[projectId]/ProjectDetailPageClient";

export const metadata: Metadata = {
    title: "Project — ShortReal Ad",
    description: "Live progress and results for your ad generation project.",
};

export default async function AdProjectDetailPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await params;
    return <ProjectDetailPageClient projectId={projectId} />;
}
