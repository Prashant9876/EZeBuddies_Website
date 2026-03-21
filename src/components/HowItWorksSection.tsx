import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Cpu, Wifi, Smartphone } from "lucide-react";
import { useLanguage } from "@/lib/language";

const stepsEn = [
  {
    number: "01",
    icon: Cpu,
    title: "Consult & Scope",
    description: "We map your site requirements, control points, and operating constraints.",
  },
  {
    number: "02",
    icon: Wifi,
    title: "Deploy & Configure",
    description: "Install devices, connect via Wi-Fi/LoRa, and configure automation workflows.",
  },
  {
    number: "03",
    icon: Smartphone,
    title: "Operate & Optimize",
    description: "Monitor and control operations remotely while continuously improving performance.",
  },
];

const stepsHi = [
  { number: "01", icon: Cpu, title: "कंसल्ट और स्कोप", description: "हम आपकी साइट की जरूरतें, कंट्रोल पॉइंट्स और ऑपरेटिंग कंडीशन्स समझते हैं।" },
  { number: "02", icon: Wifi, title: "डिप्लॉय और कॉन्फ़िगर", description: "डिवाइस इंस्टॉल करके Wi-Fi/LoRa से जोड़ते हैं और ऑटोमेशन सेट करते हैं।" },
  { number: "03", icon: Smartphone, title: "ऑपरेट और ऑप्टिमाइज", description: "रिमोट मॉनिटरिंग और कंट्रोल के साथ प्रदर्शन बेहतर बनाते हैं।" },
];

export function HowItWorksSection() {
  const { language } = useLanguage();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const steps = language === "hi" ? stepsHi : stepsEn;

  return (
    <section className="py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wider uppercase">
            {language === "hi" ? "कस्टमर जर्नी" : "Customer Journey"}
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            {language === "hi" ? "कंसल्टेशन से लाइव ऑटोमेशन तक" : "From Consultation to Live Automation"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === "hi"
              ? "तेज़ अपनाने और लंबे समय की विश्वसनीयता के लिए संरचित रोलआउट मॉडल"
              : "A structured rollout model designed for quick adoption and long-term reliability"}
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2" />

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 50 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="relative"
                >
                  <div className="bg-card rounded-3xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-border/50">
                    {/* Step Number */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground font-display font-bold text-lg flex items-center justify-center shadow-lg">
                      {index + 1}
                    </div>

                    <div className="w-20 h-20 mx-auto mb-6 mt-4 rounded-3xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-10 h-10 text-primary" />
                    </div>

                    <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
