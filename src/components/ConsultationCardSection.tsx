import { useState } from "react";
import { Building2, Mail, MessageSquareMore, Phone, Send, User } from "lucide-react";
import emailjs from "@emailjs/browser";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

interface ConsultationCardSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultationCardSection({ open, onOpenChange }: ConsultationCardSectionProps) {
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
      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      toast({
        title: "Consultation Request Sent",
        description: "Our team will contact you shortly.",
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
        title: "Unable to Submit",
        description: "Please try again in a moment.",
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
          <DialogTitle className="font-display text-2xl">Talk to Our IoT Consultant</DialogTitle>
          <DialogDescription>
            Share your requirement and we will recommend the right product stack and deployment plan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="consult-name" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="consult-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consult-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="consult-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@company.com"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="consult-phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Phone Number
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
                Company / Site
              </Label>
              <Input
                id="consult-company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company name or location"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consult-query" className="flex items-center gap-2">
              <MessageSquareMore className="w-4 h-4 text-muted-foreground" />
              Query / Requirement
            </Label>
            <Textarea
              id="consult-query"
              value={formData.query}
              onChange={(e) => setFormData({ ...formData, query: e.target.value })}
              placeholder="Tell us what you want to automate and where."
              rows={5}
              required
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Book Consultant
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
