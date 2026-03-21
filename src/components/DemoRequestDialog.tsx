import { useState } from "react";
import { motion } from "framer-motion";
import { Send, User, Mail, Phone, MapPin, Cpu } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import emailjs from '@emailjs/browser';
import { submitCustomerData } from "@/lib/customerDataApi";
import { useLanguage } from "@/lib/language";

interface DemoRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestFor?: string;
}

const siteTypes = [
  "Open Field",
  "CEA / Greenhouse",
  "Parks & Landscaping",
  "Stadium",
  "Industrial Utility",
  "Commercial Building",
  "Other",
];

const deploymentSizes = [
  "Single site",
  "2-5 sites",
  "5-20 sites",
  "20+ sites",
  "Large enterprise rollout",
];

const siteTypesHi = ["ओपन फील्ड", "CEA / ग्रीनहाउस", "पार्क और लैंडस्केपिंग", "स्टेडियम", "इंडस्ट्रियल यूटिलिटी", "कॉमर्शियल बिल्डिंग", "अन्य"];
const deploymentSizesHi = ["सिंगल साइट", "2-5 साइट", "5-20 साइट", "20+ साइट", "बड़ा एंटरप्राइज रोलआउट"];

export function DemoRequestDialog({
  open,
  onOpenChange,
  requestFor = "DEMO_REQUEST",
}: DemoRequestDialogProps) {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    siteType: "",
    deploymentSize: "",
    location: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY



    const templateParams = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      farm_type: formData.siteType,
      area: formData.deploymentSize,
      location: formData.location,
      message: formData.message,
    }


    try {
      await submitCustomerData({
        ...formData,
        Request_For: requestFor,
      });

      try {
        await emailjs.send(serviceId, templateId, templateParams, publicKey);
      } catch (emailError) {
        console.error("Demo request email failed:", emailError);
      }

      toast({
        title: isHindi ? "रिक्वेस्ट भेजी गई" : "Demo Request Sent",
        description: isHindi ? "धन्यवाद! हम जल्द आपसे संपर्क करेंगे।" : "Thank you for your interest! We will get back to you soon.",
      });
      onOpenChange(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        siteType: "",
        deploymentSize: "",
        location: "",
        message: "",
      });
      setIsSubmitting(false);
    } catch (error) {
      console.error("Demo request failed:", error);
      toast({
        title: isHindi ? "त्रुटि" : "Error",
        description: isHindi ? "कुछ गलत हुआ। कृपया बाद में फिर प्रयास करें।" : "Something went wrong. Please try again later.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl font-bold">
                {isHindi ? "कंसल्टेशन रिक्वेस्ट करें" : "Request a Consultation"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {isHindi ? "अपनी आवश्यकता साझा करें, हम सही डिवाइस स्टैक सुझाएंगे" : "Share your requirement and we will suggest the right device stack"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              {isHindi ? "पूरा नाम" : "Full Name"}
            </Label>
            <Input
              id="name"
              placeholder={isHindi ? "आपका नाम" : "John Doe"}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                {isHindi ? "ईमेल" : "Email"}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {isHindi ? "फोन" : "Phone"}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Site Type & Deployment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                {isHindi ? "साइट प्रकार" : "Site Type"}
              </Label>
              <Select
                value={formData.siteType}
                onValueChange={(value) => setFormData({ ...formData, siteType: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={isHindi ? "साइट प्रकार चुनें" : "Select site type"} />
                </SelectTrigger>
                <SelectContent>
                  {(isHindi ? siteTypesHi : siteTypes).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {isHindi ? "डिप्लॉयमेंट आकार" : "Deployment Size"}
              </Label>
              <Select
                value={formData.deploymentSize}
                onValueChange={(value) => setFormData({ ...formData, deploymentSize: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={isHindi ? "डिप्लॉयमेंट आकार चुनें" : "Select deployment size"} />
                </SelectTrigger>
                <SelectContent>
                  {(isHindi ? deploymentSizesHi : deploymentSizes).map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              {isHindi ? "लोकेशन / शहर" : "Location / City"}
            </Label>
            <Input
              id="location"
              placeholder={isHindi ? "शहर, राज्य, देश" : "City, State, Country"}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">{isHindi ? "अतिरिक्त आवश्यकताएँ (वैकल्पिक)" : "Additional Requirements (Optional)"}</Label>
            <Textarea
              id="message"
              placeholder={isHindi ? "अपनी विशेष आवश्यकताएँ बताएं..." : "Tell us about your specific requirements..."}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {isHindi ? "रिक्वेस्ट सबमिट करें" : "Submit Inquiry"}
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
