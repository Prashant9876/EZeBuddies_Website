import { motion } from "framer-motion";
import { Mail, Phone, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import logo from "@/assets/devices/logo.png";
import { useLanguage } from "@/lib/language";

export function Footer() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const quickLinks = isHindi
    ? [
        { label: "होम", href: "#home" },
        { label: "उपयोग", href: "#use-cases" },
        { label: "हमारे बारे में", href: "#about" },
        { label: "समाधान", href: "#solutions" },
      ]
    : [
        { label: "Home", href: "#home" },
        { label: "Use-cases", href: "#use-cases" },
        { label: "About Us", href: "#about" },
        { label: "Solutions", href: "#solutions" },
      ];

  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-15 h-13 rounded-xl flex items-center justify-center">
                <img
                  src={logo}
                  alt="EzeBuddies Logo"
                  className="w-20 h-20 object-contain"
                />
              </div>
              <span className="font-display font-bold text-xl">EzeBuddies</span>
            </div>
            <p className="text-background/70 mb-6 leading-relaxed">
              {isHindi
                ? "हम ग्राहकों को भरोसेमंद IoT डिवाइस और इंजीनियरिंग सपोर्ट के साथ क्लाइमेट, सिंचाई और वाटर ऑपरेशन ऑटोमेट करने में मदद करते हैं।"
                : "We help customers automate climate, irrigation, and water operations with dependable IoT devices and tailored engineering support."}
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="font-display font-semibold text-lg mb-6">{isHindi ? "क्विक लिंक" : "Quick Links"}</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-background/70 hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="font-display font-semibold text-lg mb-6">{isHindi ? "प्रोडक्ट्स" : "Products"}</h4>
            <ul className="space-y-3">
              {(isHindi
                ? ["वातावरण मॉनिटर", "स्मार्ट सिंचाई", "पंप साथी", "कस्टम IoT सॉल्यूशन्स"]
                : ["Vatavaran Monitor", "Smart Sinchai", "Pump Sathi", "Custom IoT Solutions"]
              ).map((product) => (
                <li key={product}>
                  <a href="#products" className="text-background/70 hover:text-primary transition-colors">
                    {product}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <h4 className="font-display font-semibold text-lg mb-6">{isHindi ? "संपर्क करें" : "Contact Us"}</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <a href="mailto:contact@ezebuddies.com" className="text-background/70 hover:text-primary transition-colors">
                  contact@ezebuddies.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5" />
                <span className="text-background/70">+91 8757184033</span>
              </li>
            </ul>
          </motion.div>
        </div>

        <div className="border-t border-background/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-background/50 text-sm">
              {isHindi ? "© 2025 EzeBuddies. सर्वाधिकार सुरक्षित।" : "© 2025 EzeBuddies. All rights reserved."}
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-background/50 hover:text-background transition-colors">
                {isHindi ? "प्राइवेसी पॉलिसी" : "Privacy Policy"}
              </a>
              <a href="#" className="text-background/50 hover:text-background transition-colors">
                {isHindi ? "सेवा की शर्तें" : "Terms of Service"}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
