import { useState, useEffect } from 'react';

export function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    // If the target isn't a number, just return it directly
    if (typeof target !== 'number') return;
    
    let animationFrameId;
    const start = performance.now();
    
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic: starts fast, slows down at the end
      const eased = 1 - Math.pow(1 - progress, 3); 
      
      setVal(Math.floor(eased * target));
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        // Ensure we hit exactly the target value at the end
        setVal(target);
      }
    };
    
    animationFrameId = requestAnimationFrame(tick);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration]);

  return typeof target === 'number' ? val : target;
}