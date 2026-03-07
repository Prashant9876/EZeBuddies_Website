import { motion } from "framer-motion";

const particles = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  size: Math.random() * 18 + 8,
  left: Math.random() * 100,
  delay: Math.random() * 10,
  duration: Math.random() * 10 + 15,
  rotation: Math.random() * 360,
}));

export function FloatingLeaves() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute text-primary/20"
          initial={{
            top: -50,
            left: `${particle.left}%`,
            rotate: particle.rotation,
          }}
          animate={{
            top: "110%",
            left: `${particle.left + (Math.random() - 0.5) * 20}%`,
            rotate: particle.rotation + 720,
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "linear",
          }}
          style={{ fontSize: particle.size }}
        >
          •
        </motion.div>
      ))}
    </div>
  );
}
