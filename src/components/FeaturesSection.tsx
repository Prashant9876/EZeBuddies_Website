import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  LineChart,
  Bell,
  RefreshCw,
  Bot,
  Users,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: LineChart,
    title: "Real-time Dashboards",
    description: "Monitor device telemetry and control status in real time with clear visuals.",
  },
  {
    icon: Bell,
    title: "Alerts & Notifications",
    description: "Get instant alerts for threshold breaches, failures, and runtime anomalies.",
  },
  {
    icon: RefreshCw,
    title: "OTA Firmware Updates",
    description: "Push secure firmware updates to deployed controllers without onsite visits.",
  },
  {
    icon: Bot,
    title: "Device Automation",
    description: "Create logic-driven automation flows between sensors, relays, and actuators.",
  },
  {
    icon: Users,
    title: "User Management",
    description: "Assign role-based access for teams, operators, and maintenance staff.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Generate operational reports for compliance, cost tracking, and optimization.",
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative bg-card rounded-2xl p-6 text-center hover:bg-secondary/50 transition-all duration-300 border border-transparent hover:border-primary/20"
    >
      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">
        {feature.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

export function FeaturesSection() {
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true });

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wider uppercase">
            Why Customers Choose Us
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for Daily Operations
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We focus on outcomes your team sees every day: fewer failures, faster response, and better control.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
