import React, { useEffect, useRef } from 'react';

interface ParticlesProps {
  mode: 'light' | 'dark';
}

export default function Particles({ mode }: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d')!; // non-null - bail earlier if context missing

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    // particles
    const N = Math.max(40, Math.floor((window.innerWidth * window.innerHeight) / 80000));
    const particles: any[] = [];
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2 + 0.5,
      });
    }

    function colorForMode() {
      if (mode === 'light') return 'rgba(11,103,208,0.12)'; // bluish subtle
      return 'rgba(104,163,255,0.14)';
    }

    function animate() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const col = colorForMode();
      // background subtle gradient overlay
      const grad = ctx.createLinearGradient(0, 0, window.innerWidth, window.innerHeight);
      if (mode === 'light') {
        grad.addColorStop(0, 'rgba(245,247,251,0.6)');
        grad.addColorStop(1, 'rgba(255,255,255,0.3)');
      } else {
        grad.addColorStop(0, 'rgba(7,16,38,0.6)');
        grad.addColorStop(1, 'rgba(3,8,20,0.6)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // draw lines
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
        if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.strokeStyle = col;
            ctx.globalAlpha = 0.8 * (1 - d / 120);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.closePath();
          }
        }
      }

      // draw points
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.fillStyle = mode === 'light' ? 'rgba(11,103,208,0.9)' : 'rgba(104,163,255,0.95)';
        ctx.globalAlpha = 1;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [mode]);

  return null;
}
