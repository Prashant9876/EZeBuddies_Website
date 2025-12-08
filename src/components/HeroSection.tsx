import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "./ui/button";
import { FloatingLeaves } from "./FloatingLeaves";
import { DemoRequestDialog } from "./DemoRequestDialog";
import mainImage from "@/assets/devices/main_image.png";

export function HeroSection() {
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  // Rotating sensor data
  const sensorCards = [
    { icon: "🌡️", label: "Temperature", value: "24.5°C", bg: "bg-primary/20" },
    { icon: "💧", label: "Humidity", value: "68%", bg: "bg-blue-400/20" },
    { icon: "⚡", label: "EC", value: "1.8 mS/cm", bg: "bg-green-400/20" },
    { icon: "🧪", label: "pH", value: "6.7", bg: "bg-purple-400/20" },
    { icon: "🌬️", label: "DO", value: "7.2 mg/L", bg: "bg-cyan-400/20" },
    { icon: "🚿", label: "Irrigation", value: "ON", bg: "bg-green-500/20" },
    { icon: "💡", label: "Light", value: "OFF", bg: "bg-yellow-400/20" }
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
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 py-20 lg:py-32">
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
              <span className="text-sm font-medium text-primary">Smart IoT Solutions</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
            >
              Smart Agriculture Powered by{" "}
              <span className="gradient-text">IoT Automation</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0"
            >
              At the forefront of IoT innovation, we create intelligent solutions that connect 
              people, devices, and processes. Harness data and automation to streamline operations 
              and achieve transformative results.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button variant="hero" size="xl" className="group" onClick={() => setDemoDialogOpen(true)}>
                Get Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="glass" size="xl" className="group" asChild>
                <a href="#products">
                  <Play className="w-5 h-5" />
                  View Products
                </a>
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
                alt="Smart Farm with IoT Sensors"
                className="relative rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
              />

              {/* LEFT ROTATING CARD */}
              <motion.div
                key={indexLeft}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 2 }}
                className="absolute -left-6 top-1/4 glass-card p-4 animate-float-slow"
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
                className="absolute -right-6 bottom-1/4 glass-card p-4 animate-float-delayed"
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

      <DemoRequestDialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen} />
    </section>
  );
}
