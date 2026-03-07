import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Users, Target, Wrench, GraduationCap, LifeBuoy, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";

const solutions = [
  {
    icon: Users,
    title: "Consultation & Site Study",
    description: "We understand your operation, pain points, and control goals before suggesting any setup.",
    features: ["Use-case mapping", "Site constraints", "Requirement finalization"],
  },
  {
    icon: Target,
    title: "Solution Blueprint",
    description: "You receive a clear plan covering device mix, control logic, communication, and rollout steps.",
    features: ["Device architecture", "Control strategy", "Deployment roadmap"],
  },
  {
    icon: Wrench,
    title: "Deployment & Commissioning",
    description: "Our team configures thresholds, schedules, and automation rules and validates real operation.",
    features: ["On-site setup", "Workflow tuning", "Acceptance testing"],
  },
  {
    icon: GraduationCap,
    title: "Team Training",
    description: "Operators and managers get practical training to confidently use dashboards and controls.",
    features: ["Operator training", "Standard SOP guidance", "Escalation playbook"],
  },
  {
    icon: LifeBuoy,
    title: "Support & Maintenance",
    description: "We provide troubleshooting, preventive checks, and upgrade support to keep systems reliable.",
    features: ["Remote support", "Health checks", "Version upgrades"],
  },
  {
    icon: TrendingUp,
    title: "Optimization & Scale",
    description: "After go-live, we help improve efficiency and expand successful deployments across sites.",
    features: ["Performance reviews", "ROI tracking", "Multi-site scale-up"],
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
            Customer Success
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            How We Work With You
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A practical delivery model designed to reduce risk, speed up adoption, and maximize outcomes.
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
                  Included in Delivery →
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
