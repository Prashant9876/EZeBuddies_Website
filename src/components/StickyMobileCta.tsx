import { useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { ConsultationCardSection } from "./ConsultationCardSection";
import { useLanguage } from "@/lib/language";

export function StickyMobileCta() {
  const { language } = useLanguage();
  const [consultantDialogOpen, setConsultantDialogOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-card/95 backdrop-blur-md p-3 md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" className="w-full" onClick={() => setConsultantDialogOpen(true)}>
            <MessageCircle className="w-4 h-4 mr-1" />
            {language === "hi" ? "कंसल्टेंट से बात करें" : "Talk to Consultant"}
          </Button>
          <Button size="lg" variant="outline" className="w-full" asChild>
            <a href="tel:+918757184033">
              <Phone className="w-4 h-4 mr-1" />
              {language === "hi" ? "अभी कॉल करें" : "Call Now"}
            </a>
          </Button>
        </div>
      </div>

      <ConsultationCardSection
        open={consultantDialogOpen}
        onOpenChange={setConsultantDialogOpen}
        requestFor="MOBILE_STICKY_CONSULTATION_REQUEST"
      />
    </>
  );
}
