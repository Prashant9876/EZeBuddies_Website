import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Building2, Factory, Landmark, Sprout, Trees, Waves, Warehouse } from "lucide-react";

const industries = [
  { icon: Sprout, name: "CEA & Greenhouses", color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
  { icon: Trees, name: "Parks & Landscaping", color: "bg-amber-500/10", iconColor: "text-amber-500" },
  { icon: Landmark, name: "Stadium Turf", color: "bg-green-500/10", iconColor: "text-green-500" },
  { icon: Waves, name: "Water Systems", color: "bg-cyan-500/10", iconColor: "text-cyan-500" },
  { icon: Factory, name: "Industrial Utilities", color: "bg-pink-500/10", iconColor: "text-pink-500" },
  { icon: Building2, name: "Commercial Buildings", color: "bg-blue-500/10", iconColor: "text-blue-500" },
  { icon: Warehouse, name: "Warehouses & Campuses", color: "bg-orange-500/10", iconColor: "text-orange-500" },
];

export function IndustriesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wider uppercase">
            Industries We Serve
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for Real-world Operations
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            IoT automation systems designed for agriculture, infrastructure, and utility environments
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {industries.map((industry, index) => {
            const Icon = industry.icon;
            return (
              <motion.div
                key={industry.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="group bg-card rounded-2xl p-6 text-center hover:bg-secondary/50 transition-all duration-300 border border-transparent hover:border-primary/20 cursor-pointer"
              >
                <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl ${industry.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 ${industry.iconColor}`} />
                </div>
                <h3 className="font-medium text-sm text-foreground">
                  {industry.name}
                </h3>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
