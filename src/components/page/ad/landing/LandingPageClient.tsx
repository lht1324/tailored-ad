'use client'

import AdHeader from "@/components/page/ad/landing/header/AdHeader";
import ThemeToggle from "@/components/page/ad/public/ThemeToggle";
import HeroSection from "@/components/page/ad/landing/hero-section/HeroSection";
import PortfolioSection from "@/components/page/ad/landing/portfolio-section/PortfolioSection";
import HowItWorksSection from "@/components/page/ad/landing/how-it-works-section/HowItWorksSection";
import FeaturesSection from "@/components/page/ad/landing/features-section/FeaturesSection";
import PricingSection from "@/components/page/ad/landing/pricing-section/PricingSection";
import FAQSection from "@/components/page/ad/landing/faq-section/FAQSection";
import AdFooter from "@/components/page/ad/public/AdFooter";

export default function LandingPageClient() {
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
