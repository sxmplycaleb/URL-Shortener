import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 120);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!visible) return null;

  return (
    <Tooltip label="Back to top">
      <Button
        aria-label="Back to top"
        className="fixed bottom-5 right-5 z-40 h-11 w-11 rounded-full shadow-panel transition-all sm:bottom-6 sm:right-6"
        size="icon"
        type="button"
        onClick={scrollToTop}
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}
