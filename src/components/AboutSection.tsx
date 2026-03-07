import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ShieldCheck, Lightbulb, Handshake } from "lucide-react";

const values = [
  {
    icon: ShieldCheck,
    title: "Reliability",
    description: "We engineer robust IoT devices and control systems designed for continuous field operation.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We constantly improve sensing, automation, and connectivity to solve real operational problems.",
  },
  {
    icon: Handshake,
    title: "Customization",
    description: "We work closely with customers to design and deploy tailored IoT products around their workflow.",
  },
];

export function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section id="about" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wider uppercase">
            About Us
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            About EzeBuddies
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            IoT automation products built for measurable operational outcomes
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="font-display text-2xl font-bold text-foreground mb-6">
              Our Mission
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              At EzeBuddies, we design, build, and deploy IoT automation devices for climate,
              irrigation, and water control. Our mission is to make operations easier by
              combining accurate sensing, reliable actuation, and clear remote visibility.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We support field agriculture, CEA facilities, parks, stadiums, campuses, and
              industrial utilities with both standard products and customized IoT solutions.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-3xl" />
            <img
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
              alt="Our Team"
              loading="lazy"
              decoding="async"
              className="relative rounded-3xl shadow-xl w-full object-cover aspect-video"
            />
          </motion.div>
        </div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="font-display text-2xl font-bold text-foreground text-center mb-12">
            Our Values
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="text-center group"
                >
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-10 h-10 text-primary" />
                  </div>
                  <h4 className="font-display text-lg font-semibold text-foreground mb-3">
                    {value.title}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
