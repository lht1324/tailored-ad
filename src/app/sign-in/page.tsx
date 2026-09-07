import SignInPageServer from "@/components/page/sign-in/SignInPageServer";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: 'Sign In',
    description: 'Log in to TailorAd. Bring your product photos and let our harnessed pipeline handle the complex generation process to create high-quality ad stills.',
    openGraph: {
        title: 'Sign In to TailorAd',
        description: 'Access your AI ad creation dashboard.',
        url: 'https://tailoredad.com/sign-in',
    },
    alternates: {
        canonical: 'https://tailoredad.com/sign-in',
    },
    robots: {
        index: false,
        follow: false,
    }
};

export default async function SignInPage() {
    return (<SignInPageServer/>)
}