import { motion } from 'framer-motion';

export function BackgroundOrbs() {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute -right-16 -top-20 z-0 aspect-square w-72 rounded-full bg-cyan-300/30 blur-[90px]"
        animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 16 }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -left-20 z-0 aspect-square w-72 rounded-full bg-emerald-300/30 blur-[90px]"
        animate={{ x: [0, -30, 0], y: [0, 24, 0] }}
        transition={{ repeat: Infinity, duration: 18 }}
      />
    </>
  );
}
