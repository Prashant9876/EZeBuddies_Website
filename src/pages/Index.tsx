import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket } from "lucide-react";
import vatavaranPreLaunchGraphic from "@/assets/devices/prelauch.png";
import { useLanguage } from "@/lib/language";
import { applySeo } from "@/lib/seo";

const Index = () => {
  const [preLaunchOpen, setPreLaunchOpen] = useState(false);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => setPreLaunchOpen(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    applySeo({
      title:
        language === "hi"
          ? "EzeBuddies | IoT ऑटोमेशन डिवाइस"
          : "EzeBuddies | IoT Automation Devices for Monitoring and Control",
      description:
        language === "hi"
          ? "क्लाइमेट, सिंचाई और वाटर कंट्रोल के लिए EzeBuddies के IoT समाधान।"
          : "Deploy Vatavaran Monitor, Smart Sinchai, and Pump Sathi for climate, irrigation, and water automation.",
      path: "/",
      robots: "index, follow",
    });
  }, [language]);

  const handleInterested = () => {
    setPreLaunchOpen(false);
    navigate("/pre-launch/vatavaran-monitor");
  };

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

      <Dialog open={preLaunchOpen} onOpenChange={setPreLaunchOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
          <div className="relative">
            <img
              src={vatavaranPreLaunchGraphic}
              alt="Vatavaran Monitor pre launch"
              className="w-full h-[300px] md:h-[380px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white mb-3">
                <Rocket className="w-3.5 h-3.5" />
                {t("index.prelaunch.badge")}
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-1">Vatavaran Monitor</h2>
              <p className="text-white/85 text-sm md:text-base">
                {t("index.prelaunch.subtitle")}
              </p>
            </div>
          </div>

          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">{t("index.prelaunch.title")}</DialogTitle>
            <DialogDescription>
              {t("index.prelaunch.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <Button className="flex-1" onClick={handleInterested}>
              {t("index.prelaunch.interested")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setPreLaunchOpen(false)}>
              {t("index.prelaunch.maybeLater")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
