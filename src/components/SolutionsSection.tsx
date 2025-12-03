import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Thermometer, CloudRain, Activity, Zap, Shield, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const solutions = [
  {
    icon: Thermometer,
    title: "Climate Control",
    description: "Automated temperature and humidity management for optimal growing conditions.",
    features: ["Smart ventilation", "Heating automation", "Cooling systems"],
  },
  {
    icon: CloudRain,
    title: "Smart Irrigation",
    description: "Precision watering based on soil moisture and weather data.",
    features: ["Drip irrigation", "Sprinkler control", "Fertigation"],
  },
  {
    icon: Activity,
    title: "Crop Monitoring",
    description: "Real-time monitoring of plant health and growth metrics.",
    features: ["NDVI analysis", "Growth tracking", "Disease detection"],
  },
  {
    icon: Zap,
    title: "Energy Management",
    description: "Optimize energy consumption across your farm operations.",
    features: ["Solar integration", "Load balancing", "Cost analytics"],
  },
  {
    icon: Globe,
    title: "Remote Access",
    description: "Control and monitor your farm from anywhere in the world.",
    features: ["Mobile app", "Web dashboard"],
  },
];

export function SolutionsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section id="solutions" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wider uppercase">
            Solutions
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Complete Farm Solutions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            End-to-end IoT solutions designed to address every aspect of modern farming
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solutions.map((solution, index) => {
            const Icon = solution.icon;
            return (
              <motion.div
                key={solution.title}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group bg-card rounded-2xl p-6 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-primary" />
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {solution.title}
                  </h3>
                  {solution.title.toLowerCase().includes("crop") && (
                    <Badge variant="outline">Coming soon</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {solution.description}
                </p>

                <ul className="space-y-2 mb-5">
                  {solution.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button variant="ghost" size="sm" className="p-0 h-auto text-primary hover:text-primary/80">
                  Learn more →
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
