import { ReactNode } from "react";
import { Geist_Mono } from "next/font/google";

const geistMono = Geist_Mono({
    weight: ["400", "500", "600"],
    subsets: ["latin"],
    variable: "--font-geist-mono",
});

export default function AdLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <div className={`${geistMono.variable} min-h-screen bg-canvas text-text1 font-satoshi`}>
            {children}
        </div>
    );
}
