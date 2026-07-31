"use client";

import { motion } from "framer-motion";
import { ShieldOff, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export function NotActivatedPage() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center text-center max-w-md px-6"
      >

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-8"
        >
          <div className="relative">
            <div className="h-28 w-28 rounded-full bg-gold/10 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-gold/15 flex items-center justify-center">
                <ShieldOff className="h-10 w-10 text-gold" />
              </div>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-orange-500/15 flex items-center justify-center"
            >
              <span className="text-orange-500 text-sm font-bold">!</span>
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="text-2xl font-semibold text-foreground mb-3"
        >
          Portal Access Restricted
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="text-muted-foreground text-sm leading-relaxed mb-2"
        >
          Your access to this portal has been disabled by your administrator.
          You cannot access any part of the application until access is
          re-enabled. Please contact your HR department or administrator.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="text-muted-foreground/70 text-xs mb-8"
        >
          Your account remains active — only portal access has been restricted.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => signOut({ callbackUrl: "/signin" })}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
