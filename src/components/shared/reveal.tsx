"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReducedMotion = useReducedMotion();

  // reduced-motion 존중: y-translate 스킵, opacity만 페이드
  const initial = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 };
  const target = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={inView ? target : {}}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.55,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: prefersReducedMotion ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}
