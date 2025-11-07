import { motion } from "framer-motion";

export function Card({ children, className = "" }: any) {
  return (
    <div
      className={
        "rounded-2xl border border-white/10 bg-white/80 dark:bg-neutral-900/80 shadow-2xl " +
        className
      }
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: any) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    primary:
      "bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-500",
    ghost:
      "bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-blue-600 dark:text-blue-400",
    outline:
      "border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5",
    success:
      "bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500",
  };
  return (
    <button type={type} onClick={onClick} className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Backdrop({ onClose }: { onClose?: () => void }) {
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  );
}
