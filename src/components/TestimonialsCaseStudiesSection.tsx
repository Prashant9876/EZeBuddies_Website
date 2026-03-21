import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { BadgeCheck, Quote, TrendingUp } from "lucide-react";
import { useLanguage } from "@/lib/language";

const testimonialsEn = [
  {
    quote:
      "With Smart Sinchai and Pump Sathi, we reduced manual irrigation rounds and got faster issue alerts.",
    name: "Operations Manager",
    org: "Regional Park Network",
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  },
  {
    quote:
      "Vatavaran Monitor gave us reliable climate visibility and helped stabilize our controlled environment.",
    name: "Facility Lead",
    org: "CEA Production Site",
    photo:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  },
  {
    quote:
      "Deployment and commissioning were smooth. The dashboard made it easy for our team to adopt quickly.",
    name: "Maintenance Head",
    org: "Utility Services Contractor",
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  },
];

const caseStudiesEn = [
  {
    title: "Park Irrigation Modernization",
    clientType: "Multi-site Urban Parks",
    outcomes: ["30% fewer manual interventions", "Centralized zone scheduling", "Faster anomaly response"],
  },
  {
    title: "CEA Climate Stabilization",
    clientType: "Controlled Environment Facility",
    outcomes: ["Continuous temp/humidity/CO2 tracking", "Automated fan and A/C control", "Reduced fluctuation windows"],
  },
];

const testimonialsHi = [
  {
    quote: "स्मार्ट सिंचाई और पंप साथी से हमारे मैनुअल राउंड कम हुए और अलर्ट तेजी से मिले।",
    name: "ऑपरेशन्स मैनेजर",
    org: "रीजनल पार्क नेटवर्क",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  },
  {
    quote: "वातावरण मॉनिटर ने हमें भरोसेमंद क्लाइमेट विजिबिलिटी दी और कंट्रोल्ड वातावरण स्थिर किया।",
    name: "फैसिलिटी लीड",
    org: "CEA प्रोडक्शन साइट",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  },
  {
    quote: "डिप्लॉयमेंट और कमिशनिंग बहुत स्मूद रहे। डैशबोर्ड से टीम ने जल्दी अपनाया।",
    name: "मेंटेनेंस हेड",
    org: "यूटिलिटी सर्विसेस कॉन्ट्रैक्टर",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  },
];

const caseStudiesHi = [
  {
    title: "पार्क सिंचाई आधुनिकीकरण",
    clientType: "मल्टी-साइट अर्बन पार्क्स",
    outcomes: ["30% कम मैनुअल हस्तक्षेप", "केंद्रीकृत ज़ोन शेड्यूलिंग", "तेज़ एनोमली रिस्पॉन्स"],
  },
  {
    title: "CEA क्लाइमेट स्टेबलाइज़ेशन",
    clientType: "कंट्रोल्ड एनवायरनमेंट फैसिलिटी",
    outcomes: ["निरंतर तापमान/आर्द्रता/CO2 ट्रैकिंग", "ऑटोमेटेड फैन और A/C कंट्रोल", "कम उतार-चढ़ाव समय"],
  },
];

export function TestimonialsCaseStudiesSection() {
  const { language } = useLanguage();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const testimonials = language === "hi" ? testimonialsHi : testimonialsEn;
  const caseStudies = language === "hi" ? caseStudiesHi : caseStudiesEn;

  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
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
            {language === "hi" ? "प्रभाव का प्रमाण" : "Proof of Impact"}
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            {language === "hi" ? "टेस्टिमोनियल्स और केस स्टडी" : "Testimonials & Case Studies"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {language === "hi"
              ? "हमारे IoT मॉनिटरिंग और ऑटोमेशन स्टैक का उपयोग करने वाली टीमों के वास्तविक परिणाम।"
              : "Real deployment outcomes from teams using our IoT monitoring and automation stack."}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {testimonials.map((item, index) => (
            <motion.div
              key={item.org}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.08 * index }}
              className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
            >
              <Quote className="w-5 h-5 text-primary mb-3" />
              <p className="text-sm text-foreground leading-relaxed mb-4">{item.quote}</p>
              <div className="flex items-center gap-3">
                <img
                  src={item.photo}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="w-11 h-11 rounded-full object-cover border border-border/60"
                />
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p>{item.org}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {caseStudies.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + 0.1 * index }}
              className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-xs uppercase tracking-wide text-primary font-semibold">
                  {language === "hi" ? "केस स्टडी" : "Case Study"}
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{item.clientType}</p>
              <ul className="space-y-2">
                {item.outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-center gap-2 text-sm text-foreground">
                    <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
