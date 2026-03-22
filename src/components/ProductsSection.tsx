import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { 
  Zap, 
  Thermometer, 
  Droplets, 
  AlertTriangle, 
  Gauge, 
  Wind,
  Activity,
  Waves,
  Timer,
  Shield,
  Check,
  ArrowRight,
  Cpu,
  SlidersHorizontal,
  FileText,
  Building2,
  Smartphone,
  Wifi,
  LifeBuoy,
  Download
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { useLanguage } from "@/lib/language";

// Import product images
import irrivaImg from "@/assets/devices/irriva.png";
import climvaImg from "@/assets/devices/climatecore.jpg";
import flowvaImg from "@/assets/devices/hydrolevel.png";
import mainImage from "@/assets/devices/main_image.png";

// Core device portfolio
const productsEn = [
  {
    id: "irriva",
    name: "Smart Sinchai",
    tagline: "Smart Irrigation Controller",
    subtitle: "Irrigation Unit Automation",
    description: "Automates irrigation units for fields, CEA, parks, stadium turf, and landscaping sites. Smart Sinchai provides remote scheduling, runtime control, and protection logic for stable irrigation operations.",
    heroGradient: "from-emerald-500 via-green-500 to-teal-500",
    cardGradient: "from-emerald-500/20 via-green-500/10 to-transparent",
    glowColor: "shadow-emerald-500/30",
    accentColor: "text-emerald-400",
    bgPattern: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]",
    icon: Zap,
    image: irrivaImg,
    catalogUrl: "/catalogs/smart-sinchai-catalog.png",
    features: [
      { icon: Activity, label: "Zone-wise Control", desc: "Valve and line automation" },
      { icon: Timer, label: "Flexible Scheduling", desc: "Time and interval logic" },
      { icon: Gauge, label: "Runtime Tracking", desc: "Usage and cycle history" },
      { icon: AlertTriangle, label: "Fault Alerts", desc: "Dry run and anomaly alerts" },
      { icon: Shield, label: "Protection Logic", desc: "Auto cut-off safeguards" },
      { icon: Cpu, label: "Cloud + Edge", desc: "Reliable remote management" },
    ],
    specs: [
      "Single and multi-zone deployments",
      "LoRa and Wi-Fi connectivity",
      "Remote on/off and scheduling",
      "Event and fault log history",
      "IP-rated outdoor enclosures",
      "Works with field and landscape systems",
    ]
  },
  {
    id: "climva",
    name: "Vatavaran Monitor",
    tagline: "Climate Control Device",
    subtitle: "Temp • Humidity • CO2 + Actuation",
    description: "Measures temperature, humidity, and CO2 in real time, then controls fans, A/C units, and other climate controllers based on configured thresholds and schedules.",
    heroGradient: "from-sky-500 via-blue-500 to-indigo-500",
    cardGradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    glowColor: "shadow-sky-500/30",
    accentColor: "text-sky-400",
    bgPattern: "bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))]",
    icon: Thermometer,
    image: climvaImg,
    catalogUrl: "/catalogs/vatavaran-monitor-catalog.png",
    features: [
      { icon: Thermometer, label: "Temperature Sensing", desc: "Continuous monitoring" },
      { icon: Droplets, label: "Humidity Tracking", desc: "Accurate RH analytics" },
      { icon: Wind, label: "CO2 Monitoring", desc: "Real-time ppm visibility" },
      { icon: Activity, label: "Auto Actuation", desc: "Fan and A/C control logic" },
      { icon: AlertTriangle, label: "Threshold Alerts", desc: "Instant abnormal alerts" },
      { icon: Cpu, label: "Remote + Local Control", desc: "Cloud and edge modes" },
    ],
    specs: [
      "Temperature, humidity, and CO2 telemetry",
      "Fan and A/C relay/controller outputs",
      "Custom threshold and schedule logic",
      "LoRa and Wi-Fi connectivity",
      "Dashboard and mobile alerts",
    ]
  },
  {
    id: "flowva",
    name: "Pump Sathi",
    tagline: "Water Volume + Pump Control",
    subtitle: "Liter Measurement & Automation",
    description: "Measures water volume in liters and automates pump sets with tank-level logic. Pump Sathi helps reduce overflow, dry run risk, and manual switching effort.",
    heroGradient: "from-cyan-500 via-teal-500 to-emerald-500",
    cardGradient: "from-cyan-500/20 via-teal-500/10 to-transparent",
    glowColor: "shadow-cyan-500/30",
    accentColor: "text-cyan-400",
    bgPattern: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]",
    icon: Waves,
    image: flowvaImg,
    catalogUrl: "/catalogs/pump-sathi-catalog.png",
    features: [
      { icon: Waves, label: "Level Sensing", desc: "Continuous tank tracking" },
      { icon: Gauge, label: "Liter Calculation", desc: "Live volume estimation" },
      { icon: Zap, label: "Pump Set Control", desc: "Auto fill and refill cycles" },
      { icon: AlertTriangle, label: "Protection Alerts", desc: "Overflow and dry run alerts" },
      { icon: Shield, label: "Safety Interlocks", desc: "Pump protection controls" },
      { icon: Activity, label: "Usage Logs", desc: "Consumption and runtime trends" },
    ],
    specs: [
      "Tank level to liter conversion",
      "Pump ON/OFF automation outputs",
      "Configurable high/low thresholds",
      "LoRa and Wi-Fi connectivity",
      "Industrial and outdoor deployments",
    ]
  },
  {
    id: "customva",
    name: "CUSTOM IOT SOLUTIONS",
    tagline: "Built to Your Requirement",
    subtitle: "Custom Device + Control Engineering",
    description: "Need something specific? We design customized IoT products and automation panels for your use-case, communication protocol, and control sequence.",
    heroGradient: "from-orange-500 via-amber-500 to-yellow-500",
    cardGradient: "from-orange-500/20 via-amber-500/10 to-transparent",
    glowColor: "shadow-orange-500/30",
    accentColor: "text-orange-400",
    bgPattern: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]",
    icon: SlidersHorizontal,
    image: mainImage,
    catalogUrl: "/catalogs/custom-iot-solutions-catalog.txt",
    features: [
      { icon: Cpu, label: "Custom Hardware", desc: "Sensor and controller integration" },
      { icon: SlidersHorizontal, label: "Tailored Logic", desc: "Business-specific workflows" },
      { icon: Activity, label: "Protocol Support", desc: "LoRa, Wi-Fi, RS485 and more" },
      { icon: Shield, label: "Ruggedized Design", desc: "Field-ready enclosures" },
      { icon: Timer, label: "Commissioning Support", desc: "Deployment and handover" },
      { icon: AlertTriangle, label: "After-sales Support", desc: "Maintenance and upgrades" },
    ],
    specs: [
      "Requirement-driven architecture",
      "Flexible I/O and relay expansion",
      "Sensor fusion and control loops",
      "Dashboard and alert customization",
      "Pilot to scale rollout model",
    ]
  }
];

const productsHi = [
  {
    ...productsEn[0],
    tagline: "स्मार्ट इरिगेशन कंट्रोलर",
    subtitle: "सिंचाई यूनिट ऑटोमेशन",
    description: "फील्ड, CEA, पार्क और लैंडस्केपिंग साइट्स के लिए सिंचाई ऑटोमेट करता है।",
    features: [
      { icon: Activity, label: "ज़ोन कंट्रोल", desc: "वाल्व और लाइन ऑटोमेशन" },
      { icon: Timer, label: "लचीला शेड्यूल", desc: "समय और अंतराल लॉजिक" },
      { icon: Gauge, label: "रनटाइम ट्रैकिंग", desc: "उपयोग और साइकिल हिस्ट्री" },
      { icon: AlertTriangle, label: "फॉल्ट अलर्ट", desc: "ड्राइ रन और एनोमली अलर्ट" },
      { icon: Shield, label: "प्रोटेक्शन लॉजिक", desc: "ऑटो कट-ऑफ" },
      { icon: Cpu, label: "क्लाउड + एज", desc: "विश्वसनीय रिमोट मैनेजमेंट" },
    ],
    specs: ["सिंगल/मल्टी-ज़ोन डिप्लॉयमेंट", "LoRa और Wi-Fi", "रिमोट ऑन/ऑफ और शेड्यूल", "इवेंट और फॉल्ट लॉग", "IP रेटेड एनक्लोजर", "फील्ड/लैंडस्केप सिस्टम सपोर्ट"],
  },
  {
    ...productsEn[1],
    tagline: "क्लाइमेट कंट्रोल डिवाइस",
    subtitle: "तापमान • आर्द्रता • CO2 + एक्ट्यूएशन",
    description: "तापमान, आर्द्रता और CO2 को रियल टाइम में मापता है और कंट्रोल करता है।",
    features: [
      { icon: Thermometer, label: "तापमान सेंसिंग", desc: "निरंतर मॉनिटरिंग" },
      { icon: Droplets, label: "आर्द्रता ट्रैकिंग", desc: "सटीक RH एनालिटिक्स" },
      { icon: Wind, label: "CO2 मॉनिटरिंग", desc: "रियल-टाइम ppm" },
      { icon: Activity, label: "ऑटो एक्ट्यूएशन", desc: "फैन और A/C कंट्रोल" },
      { icon: AlertTriangle, label: "थ्रेशोल्ड अलर्ट", desc: "तुरंत अलर्ट" },
      { icon: Cpu, label: "रिमोट + लोकल", desc: "क्लाउड और एज मोड" },
    ],
    specs: ["तापमान/आर्द्रता/CO2 टेलीमेट्री", "फैन/A.C. आउटपुट", "कस्टम थ्रेशोल्ड लॉजिक", "LoRa और Wi-Fi", "डैशबोर्ड और मोबाइल अलर्ट"],
  },
  {
    ...productsEn[2],
    tagline: "जल मात्रा + पंप कंट्रोल",
    subtitle: "लीटर मापन और ऑटोमेशन",
    description: "पानी की मात्रा (लीटर) मापता है और टैंक-लॉजिक से पंप ऑटोमेट करता है।",
    features: [
      { icon: Waves, label: "लेवल सेंसिंग", desc: "निरंतर टैंक ट्रैकिंग" },
      { icon: Gauge, label: "लीटर कैल्कुलेशन", desc: "लाइव वॉल्यूम" },
      { icon: Zap, label: "पंप कंट्रोल", desc: "ऑटो फिल और रिफिल" },
      { icon: AlertTriangle, label: "प्रोटेक्शन अलर्ट", desc: "ओवरफ्लो/ड्राइ रन" },
      { icon: Shield, label: "सेफ्टी इंटरलॉक्स", desc: "पंप सुरक्षा" },
      { icon: Activity, label: "उपयोग लॉग", desc: "कंजम्प्शन ट्रेंड्स" },
    ],
    specs: ["टैंक लेवल से लीटर कन्वर्ज़न", "पंप ON/OFF आउटपुट", "कन्फ़िगरेबल थ्रेशोल्ड", "LoRa और Wi-Fi", "इंडस्ट्रियल डिप्लॉयमेंट"],
  },
  {
    ...productsEn[3],
    name: "कस्टम IOT सॉल्यूशन्स",
    tagline: "आपकी आवश्यकता अनुसार",
    subtitle: "कस्टम डिवाइस + कंट्रोल इंजीनियरिंग",
    description: "हम आपके यूज-केस के लिए कस्टम IoT प्रोडक्ट और ऑटोमेशन पैनल डिज़ाइन करते हैं।",
    features: [
      { icon: Cpu, label: "कस्टम हार्डवेयर", desc: "सेंसर और कंट्रोलर इंटीग्रेशन" },
      { icon: SlidersHorizontal, label: "टेलर्ड लॉजिक", desc: "बिजनेस-विशिष्ट वर्कफ़्लो" },
      { icon: Activity, label: "प्रोटोकॉल सपोर्ट", desc: "LoRa, Wi-Fi, RS485 आदि" },
      { icon: Shield, label: "रग्ड डिज़ाइन", desc: "फील्ड-रेडी एनक्लोजर" },
      { icon: Timer, label: "कमिशनिंग सपोर्ट", desc: "डिप्लॉयमेंट और हैंडओवर" },
      { icon: AlertTriangle, label: "आफ्टर-सेल्स सपोर्ट", desc: "मेंटेनेंस और अपग्रेड" },
    ],
    specs: ["आवश्यकता-आधारित आर्किटेक्चर", "फ्लेक्सिबल I/O एक्सपेंशन", "कंट्रोल लूप्स", "डैशबोर्ड कस्टमाइजेशन", "पायलट से स्केल मॉडल"],
  },
];

type ProductType = typeof products[0];

const productUseCases: Record<string, string[]> = {
  irriva: ["Field irrigation lines", "Parks and landscaping zones", "Stadium turf schedules"],
  climva: ["CEA and greenhouse climate", "HVAC monitoring zones", "Controlled utility rooms"],
  flowva: ["Tank and sump monitoring", "Pump set automation", "Water distribution points"],
  customva: ["Site-specific process control", "Protocol integration projects", "Custom panel deployments"],
};

const productUseCasesHi: Record<string, string[]> = {
  irriva: ["फील्ड सिंचाई लाइनें", "पार्क और लैंडस्केपिंग", "स्टेडियम टर्फ शेड्यूल"],
  climva: ["CEA और ग्रीनहाउस क्लाइमेट", "HVAC मॉनिटरिंग", "कंट्रोल्ड यूटिलिटी रूम"],
  flowva: ["टैंक और सम्प मॉनिटरिंग", "पंप ऑटोमेशन", "वॉटर डिस्ट्रीब्यूशन पॉइंट"],
  customva: ["साइट-विशिष्ट कंट्रोल", "प्रोटोकॉल इंटीग्रेशन", "कस्टम पैनल डिप्लॉयमेंट"],
};

function ProductDetailDialog({ 
  product, 
  open, 
  onOpenChange,
  initialSection,
  isHindi,
}: { 
  product: ProductType | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  initialSection: "overview" | "specs";
  isHindi: boolean;
}) {
  const specsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!product) return;
    if (initialSection !== "specs") return;
    const timer = setTimeout(() => {
      specsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(timer);
  }, [open, initialSection, product]);

  if (!product) return null;
  const Icon = product.icon;
  const useCases = (isHindi ? productUseCasesHi : productUseCases)[product.id] ?? [isHindi ? "कस्टम डिप्लॉयमेंट" : "Custom deployment"];
  const snapshotCards = [
    { icon: Building2, label: isHindi ? "डिप्लॉयमेंट टाइप" : "Deployment Type", value: product.subtitle },
    { icon: Wifi, label: isHindi ? "कनेक्टिविटी" : "Connectivity", value: "LoRa + Wi-Fi" },
    { icon: Smartphone, label: isHindi ? "रिमोट एक्सेस" : "Remote Access", value: isHindi ? "मोबाइल + वेब डैशबोर्ड" : "Mobile + Web Dashboard" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Hero Header with Image */}
        <div className={`relative bg-gradient-to-br ${product.heroGradient} overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
          
          <div className="relative z-10 grid md:grid-cols-2 gap-6 p-6 md:p-8">
            {/* Product Info */}
            <DialogHeader className="flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30"
                >
                  <Icon className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
                    {product.tagline}
                  </span>
                  <DialogTitle className="font-display text-3xl font-bold text-white">
                    {product.name}
                  </DialogTitle>
                  <span className="text-white/70 text-sm">{product.subtitle}</span>
                </div>
              </div>
              <p className="text-white/90 text-sm md:text-base leading-relaxed">
                {product.description}
              </p>
            </DialogHeader>
            
            {/* Product Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                <img 
                  src={product.image} 
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-48 md:h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium border border-white/30">

                  </span>
                  <span className={`px-3 py-1 rounded-full bg-gradient-to-r ${product.heroGradient} text-white text-xs font-semibold`}>
                    {product.name}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <DialogDescription className="sr-only">
            {product.description}
          </DialogDescription>

          {/* Snapshot Cards */}
          <div className="grid md:grid-cols-3 gap-3">
            {snapshotCards.map((card) => {
              const SnapshotIcon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${product.heroGradient} flex items-center justify-center`}>
                      <SnapshotIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Capability Cards */}
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${product.heroGradient}`} />
              {isHindi ? "मुख्य क्षमताएँ" : "Key Capabilities"}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {product.features.map((feature, i) => {
                const FeatureIcon = feature.icon;
                return (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-2xl bg-muted/40 border border-border/60 hover:border-primary/40 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-r ${product.heroGradient} flex items-center justify-center`}>
                        <FeatureIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${product.accentColor}`}>
                        {isHindi ? "क्षमता" : "Capability"}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground block mb-1">{feature.label}</span>
                    <span className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Specs Cards */}
          <div ref={specsRef}>
            <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${product.heroGradient}`} />
              {isHindi ? "तकनीकी विनिर्देश" : "Technical Specifications"}
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              {product.specs.map((spec, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card"
                >
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-r ${product.heroGradient} flex items-center justify-center shrink-0`}>
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-foreground leading-relaxed">{spec}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Best-fit Use Cases */}
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${product.heroGradient}`} />
              {isHindi ? "सर्वोत्तम उपयोग" : "Best-fit Use Cases"}
            </h4>
            <div className="grid md:grid-cols-3 gap-3">
              {useCases.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-xl border border-border/60 bg-muted/40 p-3"
                >
                  <p className="text-sm text-foreground">{item}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="pt-4 border-t border-border flex gap-3">
            {/* <Button className={`flex-1 bg-gradient-to-r ${product.heroGradient} text-white hover:opacity-90`}>
              Request Quote
            </Button>
            <Button variant="outline" className="border-border/70">
              <LifeBuoy className="w-4 h-4" />
              Talk to Expert
            </Button> */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductCard({ 
  product, 
  index, 
  onViewDetails,
  isHindi,
}: { 
  product: ProductType; 
  index: number; 
  onViewDetails: (product: ProductType, section: "overview" | "specs") => void;
  isHindi: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const Icon = product.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15 }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className={`absolute -inset-1 rounded-3xl bg-gradient-to-r ${product.heroGradient} opacity-0 blur-xl transition-opacity duration-500`}
        animate={{ opacity: isHovered ? 0.3 : 0 }}
      />

      <div className="relative rounded-3xl overflow-hidden border border-border/60 bg-card shadow-sm hover:shadow-2xl transition-all duration-500">
        <div className="relative h-52 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/35 to-transparent" />
          <div className={`absolute inset-0 bg-gradient-to-br ${product.cardGradient} opacity-30`} />

          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <span className="text-[10px] tracking-wide uppercase font-semibold px-3 py-1 rounded-full bg-white/85 text-slate-800 border border-white/80">
              {isHindi ? "डिप्लॉयमेंट बीटा" : "Beta Deployment"}
            </span>
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${product.heroGradient} flex items-center justify-center shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>

          <motion.div
            className="absolute left-5 right-5 bottom-4"
            animate={isHovered ? { y: -2 } : { y: 0 }}
          >
            <div>
              <h3 className="font-display text-2xl font-bold text-white leading-tight">
                {product.name}
              </h3>
              <span className="text-xs font-semibold text-white/85 uppercase tracking-wider">
                {product.tagline}
              </span>
            </div>
          </motion.div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground`}>
              {isHindi ? "उपयुक्त" : "Ideal for"}
            </span>
            <span className={`text-xs font-semibold ${product.accentColor}`}>{product.subtitle}</span>
          </div>

          <p className="text-sm text-muted-foreground mb-5 line-clamp-3">
            {product.description}
          </p>

          <div className="grid grid-cols-1 gap-2 mb-5">
            {product.features.slice(0, 3).map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: index * 0.1 + i * 0.05 + 0.3 }}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-3 py-2"
              >
                <Check className={`w-4 h-4 shrink-0 ${product.accentColor}`} />
                <span className="text-xs font-medium text-foreground">{feature.label}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              className={`flex-1 h-11 rounded-xl bg-gradient-to-r ${product.heroGradient} text-white hover:opacity-90 transition-opacity group/btn shadow-md`}
              onClick={() => onViewDetails(product, "overview")}
            >
              <span>{isHindi ? "विवरण देखें" : "View Details"}</span>
              <motion.span className="ml-2" animate={isHovered ? { x: 4 } : { x: 0 }}>
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Button>
            <Button
              variant="secondary"
              className="h-11 rounded-xl border border-border/70 bg-muted/70 hover:bg-muted text-foreground"
              asChild
            >
              <a href={product.catalogUrl} download>
                <Download className="w-4 h-4" />
                {isHindi ? "कैटलॉग डाउनलोड" : "Download Catalog"}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductsSection() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const products = isHindi ? productsHi : productsEn;
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true });
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSection, setDialogSection] = useState<"overview" | "specs">("overview");

  const handleViewDetails = (product: ProductType, section: "overview" | "specs") => {
    setSelectedProduct(product);
    setDialogSection(section);
    setDialogOpen(true);
  };

  return (
    <section id="products" className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjEiIGZpbGw9ImN1cnJlbnRDb2xvciIgZmlsbC1vcGFjaXR5PSIwLjA1Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isHeaderInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">
              {isHindi ? "आज ही डिप्लॉय करने योग्य प्रोडक्ट्स" : "Products You Can Deploy Today"}
            </span>
          </motion.div>
          
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              {isHindi ? "प्रोडक्शन-रेडी" : "Production-ready"}
            </span>{" "}
            {isHindi ? "IoT डिवाइस पोर्टफोलियो" : "IoT Device Portfolio"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {isHindi
              ? "तेज़ ऑटोमेशन लाभ के लिए वातावारण मॉनिटर, स्मार्ट सिंचाई और पंप साथी डिप्लॉय करें, या अपने वर्कफ़्लो और साइट अनुसार कस्टम बिल्ड रिक्वेस्ट करें।"
              : "Deploy Vatavaran Monitor, Smart Sinchai, and Pump Sathi for rapid automation gains, or request a custom build tailored to your workflow, site conditions, and control architecture."}
          </p>
        </motion.div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {products.map((product, index) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              index={index} 
              onViewDetails={handleViewDetails}
              isHindi={isHindi}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center mt-16"
        >
        </motion.div>
      </div>

      <ProductDetailDialog 
        product={selectedProduct} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        initialSection={dialogSection}
        isHindi={isHindi}
      />
    </section>
  );
}
