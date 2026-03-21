import { useState } from "react";
import { Building2, Mail, MessageSquareMore, Phone, Send, User } from "lucide-react";
import emailjs from "@emailjs/browser";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { submitCustomerData } from "@/lib/customerDataApi";
import { useLanguage } from "@/lib/language";

interface ConsultationCardSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestFor?: string;
}

export function ConsultationCardSection({
  open,
  onOpenChange,
  requestFor = "CONSULTATION_REQUEST",
}: ConsultationCardSectionProps) {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    query: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    const templateParams = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: formData.company,
      message: formData.query,
      farm_type: "Consultation Request",
      area: "Direct Inquiry",
    };

    try {
      await submitCustomerData({
        ...formData,
        Request_For: requestFor,
      });

      try {
        await emailjs.send(serviceId, templateId, templateParams, publicKey);
      } catch (emailError) {
        console.error("Consultation email failed:", emailError);
      }

      toast({
        title: isHindi ? "रिक्वेस्ट भेजी गई" : "Consultation Request Sent",
        description: isHindi ? "हमारी टीम जल्द आपसे संपर्क करेगी।" : "Our team will contact you shortly.",
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        query: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Consultation request failed:", error);
      toast({
        title: isHindi ? "सबमिट नहीं हो पाया" : "Unable to Submit",
        description: isHindi ? "कृपया थोड़ी देर बाद फिर प्रयास करें।" : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{isHindi ? "हमारे IoT कंसल्टेंट से बात करें" : "Talk to Our IoT Consultant"}</DialogTitle>
          <DialogDescription>
            {isHindi
              ? "अपनी आवश्यकता साझा करें, हम सही प्रोडक्ट स्टैक और डिप्लॉयमेंट प्लान सुझाएंगे।"
              : "Share your requirement and we will recommend the right product stack and deployment plan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="consult-name" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                {isHindi ? "पूरा नाम" : "Full Name"}
              </Label>
              <Input
                id="consult-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isHindi ? "आपका नाम" : "Your name"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consult-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                {isHindi ? "ईमेल" : "Email"}
              </Label>
              <Input
                id="consult-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={isHindi ? "you@company.com" : "you@company.com"}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="consult-phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {isHindi ? "फोन नंबर" : "Phone Number"}
              </Label>
              <Input
                id="consult-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9XXXXXXXXX"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consult-company" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                {isHindi ? "कंपनी / साइट" : "Company / Site"}
              </Label>
              <Input
                id="consult-company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder={isHindi ? "कंपनी का नाम या लोकेशन" : "Company name or location"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consult-query" className="flex items-center gap-2">
              <MessageSquareMore className="w-4 h-4 text-muted-foreground" />
              {isHindi ? "प्रश्न / आवश्यकता" : "Query / Requirement"}
            </Label>
            <Textarea
              id="consult-query"
              value={formData.query}
              onChange={(e) => setFormData({ ...formData, query: e.target.value })}
              placeholder={isHindi ? "बताइए क्या ऑटोमेट करना है और कहाँ।" : "Tell us what you want to automate and where."}
              rows={5}
              required
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              isHindi ? "सबमिट हो रहा है..." : "Submitting..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {isHindi ? "कंसल्टेंट बुक करें" : "Book Consultant"}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
