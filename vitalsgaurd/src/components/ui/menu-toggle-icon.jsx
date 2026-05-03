import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export const MenuToggleIcon = ({ open, className, duration = 300 }) => {
  const variant = open ? "open" : "closed"
  const transition = { duration: duration / 1000 }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("overflow-visible", className)}
    >
      <motion.line
        x1="4"
        y1="6"
        x2="20"
        y2="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        variants={{
          closed: { rotate: 0, y: 0 },
          open: { rotate: 45, y: 6 },
        }}
        animate={variant}
        transition={transition}
      />
      <motion.line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        variants={{
          closed: { opacity: 1 },
          open: { opacity: 0 },
        }}
        animate={variant}
        transition={transition}
      />
      <motion.line
        x1="4"
        y1="18"
        x2="20"
        y2="18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        variants={{
          closed: { rotate: 0, y: 0 },
          open: { rotate: -45, y: -6 },
        }}
        animate={variant}
        transition={transition}
      />
    </svg>
  )
}
