import { Metadata } from "next";
import ProfilePageClient from "@/components/page/ad/profile/ProfilePageClient";

export const metadata: Metadata = {
    title: "Profile — TailoredAd",
    description: "Manage your TailoredAd account, images, and subscription.",
};

export default function ProfilePage() {
    return <ProfilePageClient />;
}
