import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Play, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { FloatingLeaves } from "./FloatingLeaves";
import { DemoRequestDialog } from "./DemoRequestDialog";
import { ConsultationCardSection } from "./ConsultationCardSection";
import mainImage from "@/assets/devices/main_image.png";

export function HeroSection() {
  const [consultantDialogOpen, setConsultantDialogOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);

  // Rotating device telemetry
  const sensorCards = [
    { icon: "🌡️", label: "Temperature", value: "26.1°C", bg: "bg-primary/20" },
    { icon: "💧", label: "Humidity", value: "61%", bg: "bg-blue-400/20" },
    { icon: "🫧", label: "CO2", value: "812 ppm", bg: "bg-cyan-400/20" },
    { icon: "🌀", label: "Fan", value: "ON", bg: "bg-green-500/20" },
    { icon: "❄️", label: "A/C", value: "AUTO", bg: "bg-indigo-400/20" },
    { icon: "🚿", label: "Irrigation", value: "SCHEDULED", bg: "bg-emerald-500/20" },
    { icon: "💧", label: "Pump", value: "RUNNING", bg: "bg-sky-400/20" },
    { icon: "📏", label: "Tank Level", value: "2,450 L", bg: "bg-teal-400/20" },
  ];
  const trustPoints = [
    "Built for outdoor and industrial environments",
    "Remote monitoring with instant alerting",
    "Custom hardware and firmware available",
  ];
  const highlightStats = [
    { label: "Core Product", value: "3+" },
    { label: "Use-cases Covered", value: "25+" },
    { label: "Custom Build Support", value: "End-to-End" },
  ];

  const [indexLeft, setIndexLeft] = useState(0);
  const [indexRight, setIndexRight] = useState(1);

  // Rotate every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIndexLeft((prev) => (prev + 1) % sensorCards.length);
      setIndexRight((prev) => (prev + 1) % sensorCards.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="home" className="relative min-h-screen bg-hero-gradient overflow-hidden pt-20">
      <FloatingLeaves />

      {/* Decorative circles */}
      <div className="absolute inset-0 bg-tech-grid opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 py-20 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* TEXT CONTENT */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
              className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6"
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium text-primary">Customer-first Industrial IoT</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
            >
              Automate Critical Operations with
              <span className="gradient-text"> Monitoring & Control</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0"
            >
              We help teams reduce manual operations and prevent failures with purpose-built IoT
              devices. Vatavaran Monitor, Smart Sinchai, and Pump Sathi give you live visibility and automation for
              climate, irrigation, and water systems, with custom integrations when needed.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className="grid sm:grid-cols-3 gap-3 mb-8 max-w-2xl mx-auto lg:mx-0"
            >
              {highlightStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-3">
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
                </div>
              ))}
            </motion.div>

            <motion.ul
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className="space-y-2 mb-8"
            >
              {trustPoints.map((point) => (
                <li key={point} className="flex items-center gap-2 text-sm text-muted-foreground justify-center lg:justify-start">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </motion.ul>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button variant="hero" size="xl" className="group" onClick={() => setConsultantDialogOpen(true)}>
                Talk to Our IoT Consultant
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="glass" size="xl" className="group" asChild>
                <a href="#products">
                  <Play className="w-5 h-5" />
                  Explore Solution
                </a>
              </Button>
              <Button variant="outline" size="xl" className="group" onClick={() => setQuoteDialogOpen(true)}>
                <ShieldCheck className="w-5 h-5" />
                Request Custom Solution
              </Button>
            </motion.div>
          </motion.div>

          {/* HERO IMAGE WITH FLOATING ROTATING CARDS */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 2, ease: "easeOut", delay: 1 }}
            className="relative"
          >
            <div className="relative animate-float">
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-3xl" />

              <img
                src={mainImage}
                alt="IoT automation devices and telemetry dashboard"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="relative rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
              />

              {/* LEFT ROTATING CARD */}
              <motion.div
                key={indexLeft}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 2 }}
                className="absolute -left-6 top-1/4 glass-card p-4 animate-float-slow hidden sm:block"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${sensorCards[indexLeft].bg}`}>
                    <span className="text-lg">{sensorCards[indexLeft].icon}</span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{sensorCards[indexLeft].label}</div>
                    <div className="font-semibold text-foreground">{sensorCards[indexLeft].value}</div>
                  </div>
                </div>
              </motion.div>

              {/* RIGHT ROTATING CARD */}
              <motion.div
                key={indexRight}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 2 }}
                className="absolute -right-6 bottom-1/4 glass-card p-4 animate-float-delayed hidden sm:block"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${sensorCards[indexRight].bg}`}>
                    <span className="text-lg">{sensorCards[indexRight].icon}</span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{sensorCards[indexRight].label}</div>
                    <div className="font-semibold text-foreground">{sensorCards[indexRight].value}</div>
                  </div>
                </div>
              </motion.div>

            </div>
          </motion.div>

        </div>
      </div>

      <ConsultationCardSection open={consultantDialogOpen} onOpenChange={setConsultantDialogOpen} />
      <DemoRequestDialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen} />
    </section>
  );
}
