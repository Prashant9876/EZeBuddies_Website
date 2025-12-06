import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "./ui/button";
import { FloatingLeaves } from "./FloatingLeaves";
import { DemoRequestDialog } from "./DemoRequestDialog";

export function HeroSection() {
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  return (
    <section id="home" className="relative min-h-screen bg-hero-gradient overflow-hidden pt-20">
      <FloatingLeaves />
      
      {/* Decorative circles */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6"
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium text-primary">Smart IoT Solutions</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 text-balance"
            >
              Smart Agriculture Powered by{" "}
              <span className="gradient-text">IoT Automation</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              At the forefront of IoT innovation, we create intelligent solutions that connect 
              people, devices, and processes. Harness data and automation to streamline operations 
              and achieve transformative results.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
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

            {/* Stats */}
            
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="relative"
          >
            <div className="relative animate-float">
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-3xl" />
              <img
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
                alt="Smart Farm with IoT Sensors"
                className="relative rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
              />
              
              {/* Floating Cards */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute -left-6 top-1/4 glass-card p-4 animate-float-slow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-lg">🌡️</span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Temperature</div>
                    <div className="font-semibold text-foreground">24.5°C</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className="absolute -right-6 bottom-1/4 glass-card p-4 animate-float-delayed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <span className="text-lg">💧</span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Humidity</div>
                    <div className="font-semibold text-foreground">68%</div>
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
