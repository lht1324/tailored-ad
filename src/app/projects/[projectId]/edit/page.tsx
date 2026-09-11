import EditorPageServer from "@/components/page/ad/projects/[projectId]/edit/EditorPageServer";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: 'Edit Creative',
    description: 'Fine-tune your AI-generated ad creative: headline copy, typography, and overlay layout.',
    robots: {
        index: false,
        follow: false,
    }
};

export default async function EditPage() {
    return (<EditorPageServer />)
}
