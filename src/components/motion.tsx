import { motion, type HTMLMotionProps } from 'framer-motion';
import React from 'react';

// Staggered container for lists
export const MotionList = ({ children, className, ...props }: HTMLMotionProps<'div'>) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: 0.06 } },
    }}
    {...props}
  >
    {children}
  </motion.div>
);

// Individual list item with fade-up
export const MotionItem = ({ children, className, ...props }: HTMLMotionProps<'div'>) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
    }}
    {...props}
  >
    {children}
  </motion.div>
);

// Page-level fade in
export const PageTransition = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {children}
  </motion.div>
);

// Card hover effect wrapper
export const HoverCard = ({ children, className, ...props }: HTMLMotionProps<'div'>) => (
  <motion.div
    className={className}
    whileHover={{ y: -2, boxShadow: '0 8px 25px -8px hsl(var(--foreground) / 0.08)' }}
    whileTap={{ scale: 0.985 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    {...props}
  >
    {children}
  </motion.div>
);

// Animated tab indicator (underline style)
export const TabIndicator = motion.div;

// Scale-in for badges/chips
export const ScaleIn = ({ children, className, ...props }: HTMLMotionProps<'span'>) => (
  <motion.span
    className={className}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    {...props}
  >
    {children}
  </motion.span>
);
