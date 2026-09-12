"use client";

import { motion } from "framer-motion";
import { cn, EASE_EXPO } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  blur?: number;
  duration?: number;
  once?: boolean;
};

/** Scroll-triggered reveal: translate + blur dissolve on a long expo curve. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 32,
  blur = 12,
  duration = 0.95,
  once = true,
}: RevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y, filter: `blur(${blur}px)` }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-90px 0px -90px 0px" }}
      transition={{ duration, delay, ease: EASE_EXPO }}
    >
      {children}
    </motion.div>
  );
}

/** Parent for staggered children. Pair with <RevealChild />. */
export function RevealGroup({
  children,
  className,
  stagger = 0.09,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealChild({
  children,
  className,
  y = 26,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, y, filter: "blur(10px)" },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.9, ease: EASE_EXPO },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
