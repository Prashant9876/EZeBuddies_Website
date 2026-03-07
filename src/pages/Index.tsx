import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ProductsSection } from "@/components/ProductsSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { AboutSection } from "@/components/AboutSection";
import { SolutionsSection } from "@/components/SolutionsSection";
import { Footer } from "@/components/Footer";
import { CustomerUseCasesSection } from "@/components/CustomerUseCasesSection";
import { TestimonialsCaseStudiesSection } from "@/components/TestimonialsCaseStudiesSection";
import { FaqSection } from "@/components/FaqSection";
import { StickyMobileCta } from "@/components/StickyMobileCta";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-24 md:pb-0">
        <HeroSection />
        <CustomerUseCasesSection />
        <ProductsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <AboutSection />
        <SolutionsSection />
        <TestimonialsCaseStudiesSection />
        <FaqSection />
      </main>
      <Footer />
      <StickyMobileCta />
    </div>
  );
};

export default Index;
