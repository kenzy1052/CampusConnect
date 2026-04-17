import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const getScrollKey = (location) => `${location.pathname}${location.search}`;

export default function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollPositionsRef = useRef(new Map());

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return undefined;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    const currentKey = getScrollKey(location);
    const scrollPositions = scrollPositionsRef.current;

    const frame = window.requestAnimationFrame(() => {
      if (navigationType === "POP") {
        const savedScrollPosition = scrollPositions.get(currentKey) ?? 0;
        window.scrollTo(0, savedScrollPosition);
        return;
      }

      window.scrollTo(0, 0);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      scrollPositions.set(currentKey, window.scrollY);
    };
  }, [location, navigationType]);

  return null;
}
