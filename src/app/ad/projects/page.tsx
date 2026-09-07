import { Metadata } from "next";
import ProjectsPageClient from "@/components/page/ad/projects/ProjectsPageClient";

export const metadata: Metadata = {
    title: "Projects — ShortReal Ad",
    description: "Browse all your ad generations — live progress and completed assets.",
};

export default function AdProjectsPage() {
    return <ProjectsPageClient />;
}
