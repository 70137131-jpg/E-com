'use client';

import * as React from 'react';
import { Toaster as Sonner } from 'sonner';

/** Bottom-right on desktop, top on mobile (PRD 7.6). Auto-dismiss after 4s. */
export function Toaster() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return <Sonner position={isMobile ? 'top-center' : 'bottom-right'} duration={4000} closeButton />;
}
