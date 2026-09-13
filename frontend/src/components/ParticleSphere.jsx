import { useRef, useEffect } from 'react';

export default function ParticleSphere() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0; 

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouse);
    
    window.addEventListener('mouseout', () => {
      mouse.current.x = -1000;
      mouse.current.y = -1000;
    });

    const PARTICLES = 100;
    const particles = [];

    for (let i = 0; i < PARTICLES; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        
        // --- VISUALS ---
        baseLength: 4 + Math.random() * 8, 
        phase: Math.random() * Math.PI * 2, 
        pulseSpeed: 0.5 + Math.random() * 1.5, 
        baseHue: 240, 
        hueRange: 50 + Math.random() * 30, 
        opacity: 0.1 + Math.random() * 0.5,
        
        // --- UNIQUE PHYSICS TRAITS ---
        mass: 0.5 + Math.random() * 1.5,
        // Some particles are fast "darters", others are slow "floaters"
        swimSpeed: 0.01 + Math.random() * 0.045, 
        // Some make wide lazy arcs, some make tight quick turns
        swimFreq: 0.1 + Math.random() * 0.8,
        // Some glide forever (0.995), some slow down fast (0.975)
        friction: 0.975 + Math.random() * 0.02 
      });
    }

    const animate = () => {
      time += 0.016; 

      ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Size Pulse & Color Shift
        const sizeMultiplier = 1 + Math.sin(time * p.pulseSpeed + p.phase) * 0.6;
        const dynamicBaseLength = Math.max(1, p.baseLength * sizeMultiplier);
        const currentHue = p.baseHue + Math.sin(time * (p.pulseSpeed * 0.5) + p.phase) * p.hueRange;

        // 2. Mouse Collision (Snowplow Effect)
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          const force = (150 - dist) / 150;
          p.vx += (dx / dist) * force * 1.5 * p.mass;
          p.vy += (dy / dist) * force * 1.5 * p.mass;
        }

        // 3. Independent Smooth Swimming
        // Instead of hardcoded numbers, we use the particle's unique traits
        p.vx += Math.cos(time * p.swimFreq + p.phase) * p.swimSpeed;
        p.vy += Math.sin(time * p.swimFreq + p.phase) * p.swimSpeed;

        // 4. Unique Space Friction
        p.vx *= p.friction;
        p.vy *= p.friction;

        // Apply Velocity
        p.x += p.vx;
        p.y += p.vy;

        // Wall Collisions
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -1; }

        // --- DRAWING ---
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const angle = Math.atan2(p.vy, p.vx);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.beginPath();
        
        const currentLength = dynamicBaseLength + (speed * 2); 
        ctx.moveTo(-currentLength / 2, 0);
        ctx.lineTo(currentLength / 2, 0);

        ctx.strokeStyle = `hsla(${currentHue}, 80%, 65%, ${p.opacity})`;
        ctx.lineWidth = Math.max(0.5, 1.5 * sizeMultiplier);
        ctx.stroke();
        ctx.restore();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: '#050505',
      }}
    />
  );
}