import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Users, Target, Wrench, GraduationCap, LifeBuoy, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { useLanguage } from "@/lib/language";

const solutionsEn = [
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

const solutionsHi = [
  { icon: Users, title: "कंसल्टेशन और साइट स्टडी", description: "सेटअप सुझाने से पहले हम ऑपरेशन, चुनौतियाँ और लक्ष्य समझते हैं।", features: ["यूज-केस मैपिंग", "साइट सीमाएँ", "आवश्यकता फाइनल"] },
  { icon: Target, title: "सॉल्यूशन ब्लूप्रिंट", description: "डिवाइस, कंट्रोल लॉजिक, कम्युनिकेशन और रोलआउट का स्पष्ट प्लान मिलता है।", features: ["डिवाइस आर्किटेक्चर", "कंट्रोल स्ट्रैटेजी", "डिप्लॉयमेंट रोडमैप"] },
  { icon: Wrench, title: "डिप्लॉयमेंट और कमिशनिंग", description: "हम थ्रेशोल्ड, शेड्यूल और नियम कॉन्फ़िगर करके वास्तविक ऑपरेशन वैलिडेट करते हैं।", features: ["ऑन-साइट सेटअप", "वर्कफ़्लो ट्यूनिंग", "एक्सेप्टेंस टेस्ट"] },
  { icon: GraduationCap, title: "टीम ट्रेनिंग", description: "ऑपरेटर और मैनेजर को डैशबोर्ड और कंट्रोल का प्रैक्टिकल प्रशिक्षण मिलता है।", features: ["ऑपरेटर ट्रेनिंग", "SOP गाइडेंस", "एस्केलेशन प्लेबुक"] },
  { icon: LifeBuoy, title: "सपोर्ट और मेंटेनेंस", description: "सिस्टम विश्वसनीय रहे इसके लिए हम ट्रबलशूटिंग और अपग्रेड सपोर्ट देते हैं।", features: ["रिमोट सपोर्ट", "हेल्थ चेक", "वर्ज़न अपग्रेड"] },
  { icon: TrendingUp, title: "ऑप्टिमाइजेशन और स्केल", description: "गो-लाइव के बाद दक्षता बढ़ाने और मल्टी-साइट विस्तार में मदद करते हैं।", features: ["परफॉर्मेंस रिव्यू", "ROI ट्रैकिंग", "मल्टी-साइट स्केलअप"] },
];

export function SolutionsSection() {
  const { language } = useLanguage();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const solutions = language === "hi" ? solutionsHi : solutionsEn;

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
            {language === "hi" ? "कस्टमर सक्सेस" : "Customer Success"}
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            {language === "hi" ? "हम आपके साथ कैसे काम करते हैं" : "How We Work With You"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === "hi"
              ? "रिस्क कम करने, अपनाने की गति बढ़ाने और बेहतर परिणाम देने वाला प्रैक्टिकल मॉडल।"
              : "A practical delivery model designed to reduce risk, speed up adoption, and maximize outcomes."}
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
                  {language === "hi" ? "डिलीवरी में शामिल →" : "Included in Delivery →"}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
