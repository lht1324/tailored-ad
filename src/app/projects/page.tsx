import { Metadata } from "next";
import ProjectsPageClient from "@/components/page/ad/projects/ProjectsPageClient";

export const metadata: Metadata = {
    title: "Projects — TailorAd",
    description: "Browse all your ad generations — live progress and completed assets.",
};

export default function AdProjectsPage() {
    return <ProjectsPageClient />;
}
