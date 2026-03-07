import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Building2, Egg, Factory, Landmark, Milk, PawPrint, Sprout, Trees, Waves } from "lucide-react";

const useCases = [
  {
    icon: Sprout,
    title: "Field & CEA",
    summary: "Automate irrigation and climate routines with fewer manual interventions.",
    segment: "Agriculture",
    accent: "from-emerald-500 to-teal-500",
    chip: "High ROI",
    image:
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: Trees,
    title: "Parks & Landscaping",
    summary: "Schedule irrigation and monitor pump operations across distributed green areas.",
    segment: "Public Infra",
    accent: "from-lime-500 to-emerald-500",
    chip: "Distributed Sites",
    image:
      "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: Landmark,
    title: "Stadium Turf",
    summary: "Maintain consistent turf conditions with reliable cycle control and alerts.",
    segment: "Sports Infra",
    accent: "from-amber-500 to-orange-500",
    chip: "Precision Cycles",
    image:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: Waves,
    title: "Water Infrastructure",
    summary: "Track tank levels in liters and prevent overflow or dry-run pump events.",
    segment: "Utilities",
    accent: "from-cyan-500 to-sky-500",
    chip: "Safety First",
    image:
      "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: Building2,
    title: "Campuses & Buildings",
    summary: "Centralize utility monitoring and automate repetitive control tasks.",
    segment: "Facilities",
    accent: "from-violet-500 to-indigo-500",
    chip: "Centralized Ops",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: Factory,
    title: "Industrial Utilities",
    summary: "Run process utilities with telemetry-backed logic and alarm escalation.",
    segment: "Industry",
    accent: "from-slate-600 to-slate-800",
    chip: "Process Reliability",
    image:
      "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: Egg,
    title: "Poultry Farms",
    summary: "Monitor environment and automate water/airflow systems for better flock management.",
    segment: "Livestock",
    accent: "from-yellow-500 to-amber-500",
    chip: "Flock Comfort",
    image:
      "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: Milk,
    title: "Cow & Buffalo Dairy Farms",
    summary: "Automate utility operations and monitor climate/water systems across dairy facilities.",
    segment: "Livestock",
    accent: "from-blue-500 to-cyan-500",
    chip: "Dairy Utility Control",
    image:
      "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: PawPrint,
    title: "Goat & Sheep Farms",
    summary: "Use remote monitoring and scheduled controls for sheds, water units, and farm operations.",
    segment: "Livestock",
    accent: "from-fuchsia-500 to-rose-500",
    chip: "Shed Automation",
    image:
      "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: Waves,
    title: "Fisheries & Aquaculture",
    summary: "Track water infrastructure, automate pump cycles, and improve pond-level management.",
    segment: "Aquaculture",
    accent: "from-sky-500 to-blue-600",
    chip: "Pond Management",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80",
  },
];

export function CustomerUseCasesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const marqueeCards = [...useCases, ...useCases];

  return (
    <section id="use-cases" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid opacity-20" />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wider uppercase">
            Customer Use-cases
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Where You Can Use Our Devices
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Flexible deployment models for agriculture, livestock management, infrastructure, and utility applications.
          </p>
        </motion.div>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-14 bg-gradient-to-l from-background to-transparent z-10" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="overflow-hidden"
          >
            <motion.div
              className="flex gap-5 w-max"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
            >
              {marqueeCards.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={`${item.title}-${index}`}
                    className="relative w-[300px] md:w-[340px] rounded-3xl border border-border/60 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/50 to-slate-900/75" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_55%)]" />
                    <div className={`h-1.5 bg-gradient-to-r ${item.accent}`} />
                    <div className="relative z-10 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.accent} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border border-white/20 bg-white/10 text-white/90 backdrop-blur-sm">
                          {item.segment}
                        </span>
                      </div>
                      <h3 className="font-display text-xl font-semibold text-white mb-2 leading-tight">{item.title}</h3>
                      <p className="text-sm text-white/80 leading-relaxed min-h-[66px]">{item.summary}</p>
                      <div className="mt-4 pt-4 border-t border-white/15">
                        <span className={`text-xs font-semibold bg-gradient-to-r ${item.accent} bg-clip-text text-transparent`}>
                          {item.chip}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
