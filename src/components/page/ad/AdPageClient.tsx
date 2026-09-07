'use client'

import AdHeader from "@/components/page/ad/header/AdHeader";
import ThemeToggle from "@/components/page/ad/ThemeToggle";
import HeroSection from "@/components/page/ad/hero-section/HeroSection";
import PortfolioSection from "@/components/page/ad/portfolio-section/PortfolioSection";
import HowItWorksSection from "@/components/page/ad/how-it-works-section/HowItWorksSection";
import FeaturesSection from "@/components/page/ad/features-section/FeaturesSection";
import PricingSection from "@/components/page/ad/pricing-section/PricingSection";
import FAQSection from "@/components/page/ad/faq-section/FAQSection";
import AdFooter from "@/components/page/ad/footer/AdFooter";

export default function AdPageClient() {
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
