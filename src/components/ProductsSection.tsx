import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Thermometer, Droplets, Zap, Sun, TestTube, Fan, Lightbulb, Settings, Beaker, FlaskConical } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

// Device images
import airintelImg from "@/assets/devices/airintel.png";
import hydrolevelImg from "@/assets/devices/hydrolevel.png";
import powertraceImg from "@/assets/devices/powertrace.png";
import lightsenseImg from "@/assets/devices/lightsense.png";
import aquasenseImg from "@/assets/devices/aquasense.png";
import climatecoreImg from "@/assets/devices/climatecore.png";
import lumacontrolImg from "@/assets/devices/lumacontrol.png";
import flowlogicImg from "@/assets/devices/flowlogic.png";
import nutricoreImg from "@/assets/devices/nutricore.png";
import nutrisyncImg from "@/assets/devices/nutrisync.png";

const sensors = [
  {
    icon: Thermometer,
    name: "AeroSense",
    tagline: "Environmental Intelligence",
    description: "Monitors ambient temperature, humidity levels, and CO₂ concentration for optimal climate control",
    features: [
      "Temperature Monitoring (°C)",
      "Humidity Levels (%)",
      "CO₂ Concentration (ppm)",
      "Real-time Data Streaming",
      "Edge Computing Ready",
    ],
    image: airintelImg,
    color: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: Droplets,
    name: "AquaLevelX",
    tagline: "Water Level Precision",
    description: "Precise water level measurement in tanks with real-time volume tracking in litres",
    features: [
      "Ultrasonic Level Detection",
      "Real-time Volume Tracking",
      "Tank Capacity Monitoring",
      "Low Level Alerts",
      "Multi-tank Support",
    ],
    image: hydrolevelImg,
    color: "from-cyan-500/20 to-teal-500/20",
    iconColor: "text-cyan-500",
  },
  {
    icon: Zap,
    name: "WattCore",
    tagline: "Energy Optimization",
    description: "Continuous electricity consumption monitoring measured in kWh for energy optimization",
    features: [
      "Real-time kWh Monitoring",
      "Power Consumption Analytics",
      "Energy Cost Calculation",
      "Peak Usage Detection",
      "Efficiency Reports",
    ],
    image: powertraceImg,
    color: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
  },
  {
    icon: Sun,
    name: "LightSense",
    tagline: "Light Intelligence",
    description: "Accurate light intensity measurement in lux for photosynthesis and energy management",
    features: [
      "Lux Intensity Measurement",
      "PAR Light Monitoring",
      "DLI Calculation",
      "Spectrum Analysis",
      "Growth Optimization",
    ],
    image: lightsenseImg,
    color: "from-yellow-500/20 to-amber-500/20",
    iconColor: "text-yellow-500",
  },
  {
    icon: TestTube,
    name: "AquaAnalytics",
    tagline: "Water Quality Mastery",
    description: "Comprehensive water quality monitoring including EC, pH, dissolved oxygen, and temperature",
    features: [
      "EC Conductivity Monitoring",
      "pH Level Tracking",
      "Dissolved Oxygen (DO)",
      "Water Temperature",
      "Nutrient Balance Alerts",
    ],
    image: aquasenseImg,
    color: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-500",
  },
];

const actuators = [
  {
    icon: Fan,
    name: "AeroControl",
    tagline: "Atmospheric Control",
    description: "Automated control of fans, air conditioning units, and air pumps to maintain ideal atmospheric conditions",
    features: [
      "Fan Speed Automation",
      "AC Unit Control",
      "Air Pump Management",
      "Temperature-based Logic",
      "Energy-efficient Operation",
    ],
    image: climatecoreImg,
    color: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-500",
  },
  {
    icon: Lightbulb,
    name: "LiteNode",
    tagline: "Intelligent Lighting",
    description: "Intelligent lighting management for rack systems and grow lights with programmable scheduling",
    features: [
      "Rack Lighting Control",
      "Grow Light Management",
      "Programmable Scheduling",
      "Spectrum Adjustment",
      "Photoperiod Automation",
    ],
    image: lumacontrolImg,
    color: "from-purple-500/20 to-violet-500/20",
    iconColor: "text-purple-500",
  },
  {
    icon: Settings,
    name: "HydroDrive",
    tagline: "Water Management",
    description: "Precision control of irrigation pumps, drainage systems, and solenoid valves for water management",
    features: [
      "Irrigation Pump Control",
      "Drainage Automation",
      "Solenoid Valve Management",
      "Flow Rate Monitoring",
      "Scheduled Watering",
    ],
    image: flowlogicImg,
    color: "from-teal-500/20 to-cyan-500/20",
    iconColor: "text-teal-500",
  },
  {
    icon: Beaker,
    name: "DoseMaster",
    tagline: "Fertigation Excellence",
    description: "Advanced EC and pH fertigation controller ensuring optimal nutrient delivery",
    features: [
      "EC-based Dosing",
      "pH Level Control",
      "Nutrient Mix Automation",
      "Precision Injection",
      "Recipe Management",
    ],
    image: nutricoreImg,
    color: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-500",
  },
  // {
  //   icon: FlaskConical,
  //   name: "NutriSync",
  //   tagline: "Automated Balancing",
  //   description: "Fully automated pH balancing and nutrient dosing system with precision injection",
  //   features: [
  //     "Auto pH Balancing",
  //     "Nutrient Dosing",
  //     "Precision Injection",
  //     "Real-time Adjustments",
  //     "Multi-zone Support",
  //   ],
  //   image: nutrisyncImg,
  //   color: "from-lime-500/20 to-green-500/20",
  //   iconColor: "text-lime-500",
  // },
];

function ProductCard({ product, index }: { product: typeof sensors[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const Icon = product.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-border/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${product.color} z-10`} />
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-20" />
        
        {/* Floating Icon */}
        <motion.div 
          className={`absolute bottom-4 right-4 w-12 h-12 rounded-xl bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg z-30`}
          animate={isHovered ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Icon className={`w-6 h-6 ${product.iconColor}`} />
        </motion.div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        <div className="mb-3">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            {product.tagline}
          </span>
        </div>
        
        <h3 className="font-display text-xl font-bold text-foreground mb-2">
          {product.name}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {product.description}
        </p>

        <ul className="space-y-2 mb-5">
          {product.features.slice(0, 4).map((feature, i) => (
            <motion.li 
              key={i} 
              className="flex items-center gap-2 text-sm text-muted-foreground"
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: index * 0.1 + i * 0.05 + 0.3 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span>{feature}</span>
            </motion.li>
          ))}
        </ul>

        <Button variant="default" size="sm" className="w-full group/btn">
          <span>View Details</span>
          <motion.span 
            className="ml-2"
            animate={isHovered ? { x: 4 } : { x: 0 }}
          >
            →
          </motion.span>
        </Button>
      </div>
    </motion.div>
  );
}

export function ProductsSection() {
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true });

  return (
    <section id="products" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wider uppercase">
            Precision Monitoring & Control Systems
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Smart Sensing & Actuation Devices
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Five specialized sensors and five powerful actuators deliver comprehensive environmental monitoring with precision accuracy
          </p>
        </motion.div>

        <Tabs defaultValue="sensors" className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="glass px-2 py-6">
              <TabsTrigger value="sensors" className="px-6 py-2.5 text-sm font-medium">
                <TestTube className="w-4 h-4 mr-2" />
                Sensors (5)
              </TabsTrigger>
              <TabsTrigger value="actuators" className="px-6 py-2.5 text-sm font-medium">
                <Settings className="w-4 h-4 mr-2" />
                Actuators (5)
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="sensors">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {sensors.map((product, index) => (
                <ProductCard key={product.name} product={product} index={index} />
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="actuators">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {actuators.map((product, index) => (
                <ProductCard key={product.name} product={product} index={index} />
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
