'use client'

import { useEffect } from 'react';
import AdHeader from "@/components/page/ad/landing/header/AdHeader";
import ThemeToggle from "@/components/page/ad/public/ThemeToggle";
import HeroSection from "@/components/page/ad/landing/hero-section/HeroSection";
import PortfolioSection from "@/components/page/ad/landing/portfolio-section/PortfolioSection";
import HowItWorksSection from "@/components/page/ad/landing/how-it-works-section/HowItWorksSection";
import FeaturesSection from "@/components/page/ad/landing/features-section/FeaturesSection";
import PricingSection from "@/components/page/ad/landing/pricing-section/PricingSection";
import FAQSection from "@/components/page/ad/landing/faq-section/FAQSection";
import AdFooter from "@/components/page/ad/public/AdFooter";
import { captureUtmFromUrl } from "@/lib/utm";

export default function LandingPageClient() {
    // UTM 귀속 캡처 (10-20) — 랜딩 진입 시 1회. 로그인 후 users 행에 기록.
    useEffect(() => {
        captureUtmFromUrl();
    }, []);

    return (
        <>
            <AdHeader />
            <main>
                <HeroSection />
                <PortfolioSection />
                <HowItWorksSection />
                <FeaturesSection />
                <PricingSection />
                <FAQSection />
            </main>
            <AdFooter />
            <ThemeToggle />
        </>
    );
}
