import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export type Breakpoint = "mobile" | "tablet" | "desktop";

function getBreakpoint(width: number): Breakpoint {
  if (width < 640) return "mobile";
  if (width < TABLET_BREAKPOINT) return "tablet";
  return "desktop";
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>("desktop");

  React.useEffect(() => {
    const onChange = () => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    const mobileMql = window.matchMedia("(max-width: 639px)");
    const tabletMql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);

    mobileMql.addEventListener("change", onChange);
    tabletMql.addEventListener("change", onChange);
    onChange();

    return () => {
      mobileMql.removeEventListener("change", onChange);
      tabletMql.removeEventListener("change", onChange);
    };
  }, []);

  return breakpoint;
}
