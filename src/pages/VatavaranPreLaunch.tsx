import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  Cpu,
  CircleX,
  Factory,
  Fish,
  FlaskConical,
  Gauge,
  Leaf,
  MapPin,
  MonitorSmartphone,
  Rocket,
  SatelliteDish,
  ShieldCheck,
  Sprout,
  Sun,
  Thermometer,
  TimerReset,
  Warehouse,
  Waves,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoRequestDialog } from "@/components/DemoRequestDialog";

type UseCase = {
  label: string;
  image: string;
  icon: React.ComponentType<{ className?: string }>;
};

const useCases: UseCase[] = [
  {
    label: "Greenhouses",
    image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=80",
    icon: Leaf,
  },
  {
    label: "Net Houses",
    image: "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=900&q=80",
    icon: Sprout,
  },
  {
    label: "Vertical Farms",
    image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=900&q=80",
    icon: Factory,
  },
  {
    label: "CEA Farms",
    image: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=900&q=80",
    icon: Sun,
  },
  {
    label: "Hydroponics Systems",
    image: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=900&q=80",
    icon: Waves,
  },
  {
    label: "Aquaponics Systems",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80",
    icon: Fish,
  },
  {
    label: "Agri Storage Units",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
    icon: Warehouse,
  },
  {
    label: "Polyhouses",
    image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80",
    icon: CloudRain,
  },
  {
    label: "Poultry Farms",
    image: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=900&q=80",
    icon: Wind,
  },
  {
    label: "Dairy & Cattle Farms",
    image: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=900&q=80",
    icon: Gauge,
  },
  {
    label: "Mushroom Farms",
    image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80",
    icon: FlaskConical,
  },
  {
    label: "Open Field Precision Farming",
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80",
    icon: MapPin,
  },
];

const quickBenefits = [
  { title: "Temp + Humidity + CO2", subtitle: "Live climate data", icon: Thermometer },
  { title: "Auto Ventilation Control", subtitle: "Fan/A.C. response", icon: Wind },
  { title: "Instant Alerts", subtitle: "Threshold and fault alerts", icon: BellRing },
  { title: "Mobile & Web Dashboard", subtitle: "Anywhere visibility", icon: MonitorSmartphone },
  { title: "Works in Low Network", subtitle: "Built for rural signals", icon: Cpu },
  { title: "Built for Indian Farms", subtitle: "Practical field design", icon: ShieldCheck },
];

const proofPoints = [
  "Built for Indian farm and utility conditions",
  "Simple onboarding for non-technical operators",
  "Scales from a single farm to multi-site deployments",
];

const painPoints = [
  "Crop loss due to temperature/humidity fluctuations",
  "Manual monitoring causes time loss and human error",
  "Overwatering or under-ventilation impacts growth",
  "High electricity costs from non-optimized operation",
  "No real-time alerts for critical environmental changes",
];

const solutionPoints = [
  "Monitors temperature, humidity, and CO2 continuously",
  "Automatically controls fans, A/C, pumps, and foggers",
  "Works in remote locations with practical connectivity options",
  "Mobile dashboard + instant alerts for quicker action",
];

const directBenefits = ["Increase crop yield", "Reduce crop loss", "Save water usage", "Reduce electricity usage", "Automated climate control"];

const indirectBenefits = [
  "Better decisions through data insights",
  "Saves labor time and repeated site visits",
  "Improved farm profitability",
  "Supports sustainable farming practices",
  "Remote monitoring from anywhere",
];

const featurePoints = [
  "Real-time monitoring",
  "Auto ON/OFF control",
  "Custom threshold settings",
  "Mobile app + alerts",
  "Data analytics dashboard",
  "Solar-compatible system",
  "Works in low network connectivity",
];

const whyChoosePoints = [
  "Built for Indian farming conditions",
  "Easy installation for non-technical teams",
  "Affordable compared to imported systems",
  "Scalable from small farm to enterprise sites",
  "Local support and customization available",
];

export default function VatavaranPreLaunch() {
  const [interestOpen, setInterestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stepWidth, setStepWidth] = useState(360);
  const sliderData = useMemo(() => [...useCases, ...useCases.slice(0, 4)], []);

  useEffect(() => {
    const setWidth = () => setStepWidth(window.innerWidth >= 768 ? 340 : 284);
    setWidth();
    window.addEventListener("resize", setWidth);
    return () => window.removeEventListener("resize", setWidth);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % useCases.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#e8f2f9]">
      <div className="pointer-events-none absolute inset-0 bg-tech-grid opacity-20" />
      <div className="pointer-events-none absolute -top-28 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute top-28 -right-20 h-[24rem] w-[24rem] rounded-full bg-accent/20 blur-3xl" />

      <main className="container relative z-10 mx-auto space-y-16 px-6 py-12 md:space-y-20 md:py-16">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#8fc5e6]/50 bg-gradient-to-br from-[#d8eefb] via-[#eaf6fd] to-[#ffffff] p-6 shadow-[0_18px_60px_-26px_rgba(8,92,156,0.45)] md:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#2ea8ff]/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-8 h-44 w-44 rounded-full border border-[#2f97d8]/20 bg-white/60 blur-2xl" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.08fr_1fr] lg:gap-10">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary shadow-sm">
                <Rocket className="w-3.5 h-3.5" />
                Vatavaran Monitor Pre-Launch
              </span>
              <h1 className="font-display text-4xl font-bold leading-tight text-[#0d3556] md:text-5xl lg:text-6xl">
                Automate Farm Climate.
                <span className="block text-primary">Increase Control. Reduce Risk.</span>
              </h1>
              <p className="max-w-xl text-lg text-[#35556f]">
                Monitor temperature, humidity, and CO2 in real time, then run fan/A.C. automation from one practical control stack.
                Built for modern operations across farming and utility environments.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "LoRa + Wi-Fi", icon: SatelliteDish },
                  { label: "Smart Alerts", icon: BellRing },
                  { label: "Automation Ready", icon: TimerReset },
                ].map((chip) => {
                  const ChipIcon = chip.icon;
                  return (
                    <span key={chip.label} className="inline-flex items-center gap-2 rounded-full border border-[#89bada] bg-white/85 px-3 py-1.5 text-xs font-semibold text-[#1f5479]">
                      <ChipIcon className="h-3.5 w-3.5" />
                      {chip.label}
                    </span>
                  );
                })}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="shadow-lg shadow-primary/25" onClick={() => setInterestOpen(true)}>
                  Get Early Access
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                {/* <Button size="lg" variant="outline" className="bg-white/80" onClick={() => setInterestOpen(true)}>
                  Join Pilot Program
                </Button> */}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative overflow-hidden rounded-[1.75rem] border border-[#87c1e4] bg-white p-3 shadow-[0_24px_55px_-28px_rgba(6,67,112,0.45)]"
            >
              <div className="pointer-events-none absolute right-5 top-4 inline-flex rounded-full border border-[#8cc5e7]/70 bg-white/90 px-3 py-1 text-xs font-semibold text-[#1f587f]">
                Launching Soon
              </div>
              <img
                src="/catalogs/vatavaran-monitor-catalog.png"
                alt="Vatavaran Monitor launch visual"
                className="h-full w-full rounded-[1.1rem] object-cover"
                loading="eager"
                fetchPriority="high"
              />
            </motion.div>
          </div>
          <div
            className="pointer-events-none absolute -bottom-12 left-0 h-20 w-full bg-[#e8f2f9]"
            style={{ clipPath: "polygon(0 22%, 100% 0, 100% 100%, 0 100%)" }}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#9fcae4] bg-white/90 p-5 shadow-sm md:p-6">
            <h2 className="font-display mb-3 text-2xl font-bold text-[#0f3f63] md:text-3xl">Farming Pain Points</h2>
            <div className="space-y-2.5">
              {painPoints.map((point) => (
                <div key={point} className="flex items-start gap-2.5 rounded-lg bg-[#f4fbff] px-3 py-2.5">
                  <CircleX className="mt-0.5 h-4 w-4 text-[#d34b4b]" />
                  <p className="text-sm text-[#2f566f]">{point}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-[#0d6ca8]">Farming should not depend on guesswork anymore.</p>
          </div>
          <div className="rounded-2xl border border-[#9fcae4] bg-white/90 p-5 shadow-sm md:p-6">
            <h2 className="font-display mb-3 text-2xl font-bold text-[#0f3f63] md:text-3xl">One Device. Full Climate Control.</h2>
            <div className="space-y-2.5">
              {solutionPoints.map((point) => (
                <div key={point} className="flex items-start gap-2.5 rounded-lg bg-[#f4fbff] px-3 py-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#0d6ca8]" />
                  <p className="text-sm text-[#2f566f]">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative rounded-[2rem] border border-[#9fcae4] bg-white/80 p-5 shadow-[0_14px_42px_-26px_rgba(13,84,129,0.42)] md:p-7">
          <div className="mb-5">
            <h2 className="font-display mb-2 text-3xl font-bold text-[#0f3f63] md:text-4xl">Where You Can Use It</h2>
            <p className="text-[#3d637d]">From small farms to large agri-enterprises.</p>
          </div>

          <div className="relative h-[212px] overflow-hidden rounded-2xl md:h-[232px]">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
            <motion.div
              className="flex w-max gap-5"
              animate={{ x: -activeIndex * stepWidth }}
              transition={{ duration: 0.72, ease: "easeInOut" }}
            >
              {sliderData.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={`${item.label}-${idx}`}
                    whileHover={{ y: -5 }}
                    className="w-[264px] overflow-hidden rounded-[1.2rem] border border-[#9ac9e7] bg-card shadow-[0_18px_42px_-24px_rgba(7,86,135,0.5)] md:w-[320px]"
                  >
                    <div className="relative h-[146px] md:h-[160px]">
                      <img
                        src={item.image}
                        alt={item.label}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = "/catalogs/vatavaran-monitor-catalog.png";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#032d4a]/75 via-[#0a4f77]/30 to-transparent" />
                    </div>
                    <div className="flex items-center gap-2.5 p-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-xs font-semibold text-[#12476a] md:text-sm">{item.label}</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
          <div
            className="pointer-events-none absolute -bottom-12 left-0 h-20 w-full bg-[#e8f2f9]"
            style={{ clipPath: "polygon(0 0, 100% 28%, 100% 100%, 0 100%)" }}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickBenefits.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-start gap-3 rounded-xl border border-[#a4cee6] bg-white/90 p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#12476a]">{item.title}</p>
                  <p className="text-xs text-[#50718a]">{item.subtitle}</p>
                </div>
              </motion.div>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#a4cee6] bg-white/90 p-5 shadow-sm">
            <h3 className="font-display mb-3 text-xl font-bold text-[#0f3f63] md:text-2xl">Direct Benefits</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {directBenefits.map((point) => (
                <div key={point} className="flex items-center gap-2 rounded-lg border border-[#d1e8f6] bg-[#f6fcff] px-3 py-2 text-sm text-[#234f6c]">
                  <CheckCircle2 className="h-4 w-4 text-[#0d6ca8]" />
                  {point}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#a4cee6] bg-white/90 p-5 shadow-sm">
            <h3 className="font-display mb-3 text-xl font-bold text-[#0f3f63] md:text-2xl">Indirect Benefits</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {indirectBenefits.map((point) => (
                <div key={point} className="flex items-center gap-2 rounded-lg border border-[#d1e8f6] bg-[#f6fcff] px-3 py-2 text-sm text-[#234f6c]">
                  <BadgeCheck className="h-4 w-4 text-[#0d6ca8]" />
                  {point}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#9fcae4] bg-white/90 p-5 shadow-sm">
            <h3 className="font-display mb-3 text-xl font-bold text-[#0f3f63] md:text-2xl">Features Made Simple</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {featurePoints.map((point) => (
                <div key={point} className="flex items-center gap-2 rounded-lg bg-[#f3faff] px-3 py-2 text-sm text-[#2b5875]">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {point}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#9fcae4] bg-white/90 p-5 shadow-sm">
            <h3 className="font-display mb-3 text-xl font-bold text-[#0f3f63] md:text-2xl">Why Choose Us</h3>
            <div className="space-y-2">
              {whyChoosePoints.map((point) => (
                <div key={point} className="flex items-start gap-2 rounded-lg bg-[#f3faff] px-3 py-2 text-sm text-[#2b5875]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-[#0d6ca8]" />
                  {point}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-[#0d6ca8]">Not just IoT. Built for real farm conditions.</p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#8ac0e0] bg-gradient-to-r from-[#1a88cb] to-[#0d6ca8] p-6 text-white shadow-[0_20px_48px_-26px_rgba(5,77,124,0.55)] md:p-8">
          <h3 className="font-display mb-2 text-2xl font-bold md:text-3xl">Early Access & Pilot Program</h3>
          <p className="mb-5 max-w-2xl text-white/90">
            Limited slots are open. Register interest to get priority onboarding and pilot support.
          </p>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {["Limited pilot slots", "Priority support", "Early adopter pricing"].map((point, index) => (
              <div key={point} className="rounded-xl border border-white/35 bg-white/15 px-3 py-3 text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4" />
                  <span>{point}</span>
                </span>
              </div>
            ))}
          </div>
          {/* <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="bg-white text-[#0d6ca8] hover:bg-white/90" onClick={() => setInterestOpen(true)}>
              Join Early Access
            </Button>
            <Button variant="outline" className="border-white/70 bg-transparent text-white hover:bg-white/15" onClick={() => setInterestOpen(true)}>
              Request Consultation
            </Button>
          </div> */}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {proofPoints.map((point, idx) => (
            <motion.div
              key={point}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl border border-[#a8d0e8] bg-white/85 p-5 shadow-sm"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#9cc8e5] bg-[#e8f5fd] text-[#1d6c9e]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-[#164c70]">{point}</p>
            </motion.div>
          ))}
        </section>

        <section className="rounded-2xl border border-[#9fcae4] bg-white/90 p-6 shadow-sm">
          <h3 className="font-display mb-2 text-2xl font-bold text-[#0f3f63]">Built to Build Trust</h3>
          <p className="mb-4 text-sm text-[#4c718a]">Tested in real farm environments, engineered by IoT teams, and backed by Agronomist experts.</p>
          <div className="grid gap-3 md:grid-cols-3">
            {["Tested in real farm environments", "Built by Engineers", "Backed by Agronomist experts"].map((item) => (
              <div key={item} className="rounded-xl border border-[#c9e2f2] bg-[#f4fbff] px-4 py-3 text-sm font-semibold text-[#22506d]">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-[#9bc9e5] bg-white/90 p-6 shadow-[0_14px_38px_-26px_rgba(7,88,136,0.46)] md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-display mb-1 text-xl font-bold text-[#0f3f63] md:text-2xl">Ready to Move From Manual to Smart?</h3>
              <p className="text-[#456881]">Contact us for demo scheduling and deployment planning.</p>
              <p className="mt-1 text-sm text-[#5c7a91]">Email: contact@ezebuddies.com | Website: www.ezebuddies.com</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* <Button className="min-w-[160px]" onClick={() => setInterestOpen(true)}>
                I&apos;m Interested
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button> */}
              <Button variant="outline" className="bg-white" asChild>
                <a href="tel:+918757184033">+91 8757184033</a>
              </Button>
              <Button variant="outline" className="bg-white" asChild>
                <a href="https://wa.me/918757184033" target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <DemoRequestDialog
        open={interestOpen}
        onOpenChange={setInterestOpen}
        requestFor="PRELAUNCH_EARLY_ACCESS_REQUEST"
      />
    </div>
  );
}
