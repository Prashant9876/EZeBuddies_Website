import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

const faqs = [
  {
    q: "How quickly can we deploy your IoT devices?",
    a: "Typical deployments can start within a few days after requirement finalization. Timeline depends on site readiness, number of control points, and customization scope.",
  },
  {
    q: "Do you support custom requirements and integrations?",
    a: "Yes. We provide custom hardware/firmware and can adapt control logic, alerts, and dashboard views based on your operational workflow.",
  },
  {
    q: "What connectivity options are available?",
    a: "Our stack supports LoRa and Wi-Fi by default, with additional protocol options for custom projects.",
  },
  {
    q: "Can we monitor and control sites remotely?",
    a: "Yes. Teams can monitor telemetry and run controls from mobile and web dashboards with role-based access.",
  },
  {
    q: "Do you provide training and post-installation support?",
    a: "Yes. We provide onboarding, operator training, troubleshooting support, and maintenance guidance after go-live.",
  },
  {
    q: "How do we get pricing?",
    a: "Pricing is based on site size, number of devices, and customization level. Use the consultant form and we will share a suitable proposal.",
  },
];

export function FaqSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wider uppercase">FAQ</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">Frequently Asked Questions</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Quick answers to common deployment, support, and pricing questions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15 }}
          className="max-w-3xl mx-auto rounded-2xl border border-border/60 bg-card p-4 md:p-6 shadow-sm"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, idx) => (
              <AccordionItem key={item.q} value={`faq-${idx}`} className="border-border/60">
                <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
