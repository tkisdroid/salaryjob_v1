"use client";

import { motion } from "framer-motion";

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (d: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: d * 0.15, duration: 0.8, ease: "easeInOut" as const },
      opacity: { delay: d * 0.15, duration: 0.3 },
    },
  }),
};

const svgProps = { viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
const strokeProps = {
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconOneTap({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.circle cx="12" cy="12" r="9" {...strokeProps} variants={draw} custom={0} />
      <motion.path d="M12 7v5l3 3" {...strokeProps} variants={draw} custom={1} />
      <motion.path d="M18 16l2.5 2.5" {...strokeProps} strokeWidth={2} variants={draw} custom={2} />
      <motion.circle cx="21" cy="19" r="1" fill="currentColor" variants={draw} custom={2} />
    </motion.svg>
  );
}

export function IconNearby({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" {...strokeProps} variants={draw} custom={0} />
      <motion.circle cx="12" cy="9" r="2.5" {...strokeProps} variants={draw} custom={1} />
      <motion.circle cx="12" cy="9" r="5" {...strokeProps} strokeWidth={1} opacity={0.3} variants={draw} custom={2} />
    </motion.svg>
  );
}

export function IconInstantPay({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.rect x="2" y="6" width="20" height="14" rx="3" {...strokeProps} variants={draw} custom={0} />
      <motion.path d="M2 10h20" {...strokeProps} variants={draw} custom={1} />
      <motion.circle cx="17" cy="15" r="2" {...strokeProps} variants={draw} custom={2} />
      <motion.path d="M17 14v2" {...strokeProps} variants={draw} custom={2} />
    </motion.svg>
  );
}

export function IconVerified({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.path d="M12 2l7 4v5c0 5.25-3.5 8.25-7 10-3.5-1.75-7-4.75-7-10V6l7-4z" {...strokeProps} variants={draw} custom={0} />
      <motion.path d="M9 12l2 2 4-4" {...strokeProps} strokeWidth={2} variants={draw} custom={1} />
    </motion.svg>
  );
}

export function IconExplore({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.circle cx="11" cy="11" r="7" {...strokeProps} variants={draw} custom={0} />
      <motion.path d="M16.5 16.5L21 21" {...strokeProps} strokeWidth={2} variants={draw} custom={1} />
      <motion.circle cx="11" cy="11" r="2" {...strokeProps} strokeWidth={1} variants={draw} custom={2} />
    </motion.svg>
  );
}

export function IconApply({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6z" {...strokeProps} variants={draw} custom={0} />
      <motion.path d="M19 2v3M20.5 3.5h-3" {...strokeProps} strokeWidth={1.5} variants={draw} custom={1} />
    </motion.svg>
  );
}

export function IconCheckin({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.rect x="3" y="3" width="7" height="7" rx="1" {...strokeProps} variants={draw} custom={0} />
      <motion.rect x="14" y="3" width="7" height="7" rx="1" {...strokeProps} variants={draw} custom={0} />
      <motion.rect x="3" y="14" width="7" height="7" rx="1" {...strokeProps} variants={draw} custom={0} />
      <motion.rect x="5" y="5" width="3" height="3" rx="0.5" fill="currentColor" variants={draw} custom={1} />
      <motion.rect x="16" y="5" width="3" height="3" rx="0.5" fill="currentColor" variants={draw} custom={1} />
      <motion.rect x="5" y="16" width="3" height="3" rx="0.5" fill="currentColor" variants={draw} custom={1} />
      <motion.path d="M14 14h7M14 17.5h4M17.5 14v7" {...strokeProps} strokeWidth={1.5} variants={draw} custom={2} />
    </motion.svg>
  );
}

export function IconSettlement({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.path d="M4 4h16v16l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L4 20V4z" {...strokeProps} variants={draw} custom={0} />
      <motion.path d="M8 8h8M8 11h6M8 14h4" {...strokeProps} strokeWidth={1.5} variants={draw} custom={1} />
      <motion.path d="M14 13l1.5 1.5 3-3" {...strokeProps} strokeWidth={2} variants={draw} custom={2} />
    </motion.svg>
  );
}

export function IconTeam({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.circle cx="9" cy="7" r="3" {...strokeProps} variants={draw} custom={0} />
      <motion.path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" {...strokeProps} variants={draw} custom={1} />
      <motion.circle cx="17" cy="8" r="2.5" {...strokeProps} strokeWidth={1.5} variants={draw} custom={1} />
      <motion.path d="M21 21v-1.5a3 3 0 00-3-3h-1" {...strokeProps} strokeWidth={1.5} variants={draw} custom={2} />
    </motion.svg>
  );
}

export function IconManage({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.circle cx="12" cy="12" r="9" {...strokeProps} variants={draw} custom={0} />
      <motion.path d="M8 12l3 3 5-5" {...strokeProps} strokeWidth={2} variants={draw} custom={1} />
    </motion.svg>
  );
}

export function IconStore({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.path d="M3 9l1.5-5h15L21 9" {...strokeProps} variants={draw} custom={0} />
      <motion.path d="M3 9h18v12H3V9z" {...strokeProps} variants={draw} custom={0} />
      <motion.path d="M3 9c0 1.5 1.2 2.5 2.5 2.5S8 10.5 8 9" {...strokeProps} strokeWidth={1.2} variants={draw} custom={1} />
      <motion.path d="M8 9c0 1.5 1.2 2.5 2.5 2.5S13 10.5 13 9" {...strokeProps} strokeWidth={1.2} variants={draw} custom={1} />
      <motion.path d="M13 9c0 1.5 1.2 2.5 2.5 2.5S18 10.5 18 9" {...strokeProps} strokeWidth={1.2} variants={draw} custom={1} />
      <motion.rect x="9" y="15" width="6" height="6" rx="0.5" {...strokeProps} strokeWidth={1.2} variants={draw} custom={2} />
    </motion.svg>
  );
}

export function IconSparkle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <motion.svg {...svgProps} className={className} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" {...strokeProps} strokeWidth={1.5} variants={draw} custom={0} />
      <motion.path d="M18 14l1 2.5L22 18l-3 1.5-1 2.5-1-2.5L14 18l3-1.5z" {...strokeProps} strokeWidth={1.2} variants={draw} custom={1} />
    </motion.svg>
  );
}
