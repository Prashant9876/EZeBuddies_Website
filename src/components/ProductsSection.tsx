import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { 
  Zap, 
  Thermometer, 
  Droplets, 
  Sun, 
  AlertTriangle, 
  Gauge, 
  Wind,
  Activity,
  Waves,
  Lightbulb,
  Timer,
  Shield,
  Check,
  ArrowRight,
  Cpu
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

// Import product images
import irrivaImg from "@/assets/devices/irriva.png";
import climvaImg from "@/assets/devices/climatecore.jpg";
import flowvaImg from "@/assets/devices/hydrolevel.png";
import lumivaImg from "@/assets/devices/lumacontrol.jpg";
import nutrivaImg from "@/assets/devices/nutriva.png";

// Product packages for smart irrigation and fertigation
const products = [
  {
    id: "irriva",
    name: "IRRIVA",
    tagline: "Smart Motor Controller",
    subtitle: "Irrigation & Motor Intelligence",
    description: "Complete motor control package with intelligent monitoring for pumps and irrigation systems. Features Real-time voltage/current tracking, Dry run protection, and anomaly detection for reliable operation.",
    heroGradient: "from-emerald-500 via-green-500 to-teal-500",
    cardGradient: "from-emerald-500/20 via-green-500/10 to-transparent",
    glowColor: "shadow-emerald-500/30",
    accentColor: "text-emerald-400",
    bgPattern: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]",
    icon: Zap,
    image: irrivaImg,
    features: [
      { icon: Activity, label: "Motor ON/OFF Control", desc: "Remote motor switching" },
      { icon: Gauge, label: "Voltage Monitoring", desc: "Real-time V tracking" },
      { icon: Zap, label: "Current Consumption", desc: "Ampere measurement" },
      { icon: AlertTriangle, label: "Dry Run Detection", desc: "Anomaly protection" },
      { icon: Shield, label: "Overload Protection", desc: "Auto-cutoff safety" },
      { icon: Timer, label: "Scheduled Operation", desc: "Timer-based control" },
    ],
    specs: [
      "3-Phase & Single Phase Support",
      "0-440V Voltage Range",
      "0-80A Current Range", 
      "LoRa & WiFi Connectivity",
      "IP65 Weatherproof Rating",
      "Dry Run Protection",
      
    ]
  },
  {
    id: "nutriva",
    name: "NUTRIVA",
    tagline: "Smart Fertigation Controller",
    subtitle: "Precision Nutrition & Irrigation Intelligence",
    description: "Complete fertigation control package with intelligent nutrient dosing and irrigation management for modern farms and hydroponic systems. Features real-time EC/pH monitoring, automated nutrient mixing, and scheduled fertigation for precise and reliable crop nutrition.",
    heroGradient: "from-sky-500 via-blue-500 to-indigo-500",
    cardGradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    glowColor: "shadow-sky-500/30",
    accentColor: "text-sky-400",
    bgPattern: "bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))]",
    icon: Thermometer,
    image: nutrivaImg,
    features: [
      { icon: Thermometer, label: "Nutrient Dosing Control", desc: "Precise fertilizer injection automation" },
      { icon: Droplets, label: "EC & pHMonitoring ", desc: "Real-time Tracking" },
      { icon: Wind, label: "Scheduled Fertigation", desc: "Timer & stage-based nutrient delivery" },
      { icon: Activity, label: "Remote Control", desc: "Cloud-based monitoring & control" },
      { icon: AlertTriangle, label: "Anomaly Detection", desc: "Custom notifications" },
      { icon: Cpu, label: "Edge Computing", desc: "Local processing" },
    ],
    specs: [
      "Single & Multi-channel Dosing Support",
      "EC Range: 0–3 mS/cm",
      "pH Range: 0–14",
      "LoRa & WiFi Connectivity",
      "Manual & Automatic Operation Modes"
    ]
  },
  {
    id: "climva",
    name: "CLIMVA",
    tagline: "Climate Intelligence Hub",
    subtitle: "Temperature • Humidity • CO₂",
    description: "Advanced environmental monitoring package for greenhouses and controlled environments. Precision sensors deliver real-time climate data for optimal growing conditions.",
    heroGradient: "from-sky-500 via-blue-500 to-indigo-500",
    cardGradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    glowColor: "shadow-sky-500/30",
    accentColor: "text-sky-400",
    bgPattern: "bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))]",
    icon: Thermometer,
    image: climvaImg,
    features: [
      { icon: Thermometer, label: "Temperature Sensing", desc: "-40°C to 80°C range" },
      { icon: Droplets, label: "Humidity Monitoring", desc: "0-100% RH accuracy" },
      { icon: Wind, label: "CO₂ Concentration", desc: "0-5000ppm detection" },
      { icon: Activity, label: "Real-time Streaming", desc: "10-Minute intervals" },
      { icon: AlertTriangle, label: "Threshold Alerts", desc: "Custom notifications" },
      { icon: Cpu, label: "Edge Computing", desc: "Local processing" },
    ],
    specs: [
      "±0.2°C Temperature Accuracy",
      "±2% Humidity Accuracy",
      "NDIR CO₂ Sensor Technology",
      "LoRa & WiFi Connectivity",
      "5-Year Sensor Lifespan"
    ]
  },
  {
    id: "flowva",
    name: "FLOWVA",
    tagline: "Tank & Flow Automation",
    subtitle: "Water Level • Flow Control",
    description: "Intelligent water management system for tanks and reservoirs. Ultrasonic level sensing combined with automated pump control for efficient water distribution.",
    heroGradient: "from-cyan-500 via-teal-500 to-emerald-500",
    cardGradient: "from-cyan-500/20 via-teal-500/10 to-transparent",
    glowColor: "shadow-cyan-500/30",
    accentColor: "text-cyan-400",
    bgPattern: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]",
    icon: Waves,
    image: flowvaImg,
    features: [
      { icon: Waves, label: "Water Level Sensing", desc: "Ultrasonic precision" },
      { icon: Gauge, label: "Volume Calculation", desc: "Liters/gallons display" },
    
      { icon: Zap, label: "Pump Automation", desc: "Auto fill/drain" },
      { icon: AlertTriangle, label: "Overflow Protection", desc: "Smart cutoffs" },
    ],
    specs: [
      "0.5-6m Detection Range",
      "±3 cm Level Accuracy",
      "LoRa & WiFi Connectivity",
      "IP68 Submersible Option",
    ]
  },
  {
    id: "lumiva",
    name: "LUMIVA",
    tagline: "Hydroponics Light Control",
    subtitle: "Grow Light • Photoperiod • DLI",
    description: "Precision lighting controller designed for hydroponics and vertical farming. Intelligent spectrum management and photoperiod scheduling for maximum crop yield.",
    heroGradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    cardGradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    glowColor: "shadow-violet-500/30",
    accentColor: "text-violet-400",
    bgPattern: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]",
    icon: Sun,
    image: lumivaImg,
    features: [
      { icon: Sun, label: "Lux Measurement", desc: "0-200,000 lux range" },
      { icon: Lightbulb, label: "Grow Light Control", desc: "PWM dimming" },
      { icon: Timer, label: "Photoperiod Scheduling", desc: "Sunrise/sunset" },
      { icon: Activity, label: "DLI Calculation", desc: "Daily light integral" },
      { icon: Gauge, label: "Spectrum Analysis", desc: "PAR monitoring" },
      { icon: Cpu, label: "Zone Management", desc: "Multi-rack support" },
    ],
    specs: [
      "0-10V & PWM Dimming",
      "Up to 16 Light Zones",
      "PAR Sensor Integration",
      "Sunrise/Sunset Simulation",
      "DMX512 Protocol Support",
      "Energy Usage Analytics"
    ]
  }
];

type ProductType = typeof products[0];

function ProductDetailDialog({ 
  product, 
  open, 
  onOpenChange 
}: { 
  product: ProductType | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) {
  if (!product) return null;
  const Icon = product.icon;

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
          
          {/* Features Grid */}
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${product.heroGradient}`} />
              Key Capabilities
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
                    className="p-3 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors group"
                  >
                    <FeatureIcon className={`w-5 h-5 ${product.accentColor} mb-2 group-hover:scale-110 transition-transform`} />
                    <span className="text-sm font-medium text-foreground block">{feature.label}</span>
                    <span className="text-xs text-muted-foreground">{feature.desc}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Technical Specs */}
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${product.heroGradient}`} />
              Technical Specifications
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {product.specs.map((spec, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2 p-2 rounded-lg"
                >
                  <Check className={`w-4 h-4 ${product.accentColor} shrink-0`} />
                  <span className="text-sm text-foreground">{spec}</span>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* CTA */}
          <div className="pt-4 border-t border-border flex gap-3">
            <Button className={`flex-1 bg-gradient-to-r ${product.heroGradient} text-white hover:opacity-90`}>
              Request Quote
            </Button>
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductCard({ 
  product, 
  index, 
  onViewDetails 
}: { 
  product: ProductType; 
  index: number; 
  onViewDetails: (product: ProductType) => void 
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
      {/* Glow Effect */}
      <motion.div 
        className={`absolute -inset-1 rounded-3xl bg-gradient-to-r ${product.heroGradient} opacity-0 blur-xl transition-opacity duration-500`}
        animate={{ opacity: isHovered ? 0.3 : 0 }}
      />
      
      <div className={`relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all duration-500 ${product.glowColor} hover:shadow-2xl`}>
        {/* Header with Product Image */}
        <div className={`relative h-48 overflow-hidden`}>
          {/* Product Image */}
          <img 
            src={product.image} 
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t ${product.cardGradient} opacity-90`} />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          
          {/* Floating particles */}
          <motion.div
            animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className={`absolute top-6 right-6 w-3 h-3 rounded-full bg-gradient-to-r ${product.heroGradient}`}
          />
          <motion.div
            animate={{ y: [0, 10, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
            className={`absolute top-16 right-16 w-2 h-2 rounded-full bg-gradient-to-r ${product.heroGradient}`}
          />
          
          {/* Icon and Title */}
          <motion.div 
            className="absolute bottom-4 left-6 right-6 flex items-center gap-4"
            animate={isHovered ? { scale: 1.02 } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${product.heroGradient} flex items-center justify-center shadow-lg shrink-0`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground tracking-tight">
                {product.name}
              </h3>
              <span className={`text-xs font-semibold ${product.accentColor} uppercase tracking-wider`}>
                {product.tagline}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          <p className="text-sm text-muted-foreground mb-5 line-clamp-2">
            {product.description}
          </p>

          {/* Features pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {product.features.slice(0, 4).map((feature, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: index * 0.1 + i * 0.05 + 0.3 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 text-xs font-medium text-foreground border border-border/50"
              >
                <feature.icon className={`w-3 h-3 ${product.accentColor}`} />
                {feature.label}
              </motion.span>
            ))}
          </div>

          <Button 
            className={`w-full bg-gradient-to-r ${product.heroGradient} text-white hover:opacity-90 transition-opacity group/btn`}
            onClick={() => onViewDetails(product)}
          >
            <span>Explore {product.name}</span>
            <motion.span 
              className="ml-2"
              animate={isHovered ? { x: 4 } : { x: 0 }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductsSection() {
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true });
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewDetails = (product: ProductType) => {
    setSelectedProduct(product);
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
            <span className="text-sm font-semibold text-primary">IntelliControl</span>
          </motion.div>
          
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              Intelligent
            </span>{" "}
            Control Systems
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Four integrated product packages designed for modern agriculture. From motor control to climate monitoring, 
            water management to lighting automation — everything you need for precision farming.
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
      />
    </section>
  );
}
