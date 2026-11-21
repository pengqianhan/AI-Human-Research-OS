import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});

/** Show a short note at the bottom of the window, e.g. why a control is not available yet. */
export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}

/** Holds the one toast of the app; it is announced politely to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((next: string) => {
    setMessage(next);
    setVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), 2800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={
          "pointer-events-none fixed bottom-[26px] left-1/2 z-50 max-w-[min(560px,90vw)] -translate-x-1/2 rounded-[10px] bg-night px-4 py-[9px] text-[13px] text-on-night shadow-sh3 transition-[opacity,transform] duration-200 " +
          (visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0")
        }
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}
