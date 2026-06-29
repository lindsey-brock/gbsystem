import { useEffect, useRef } from "react";

// Same ribbon-wave animation as the marketing site (docs/index.html).
export function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, t = 0;
    let frame = 0;
    const RIBBONS_LEFT = 22;
    const RIBBONS_RIGHT = 22;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function leftY(x: number, i: number, t: number) {
      const norm = x / W;
      const base = H * (0.05 + (i / RIBBONS_LEFT) * 0.55);
      const wave1 = Math.sin(norm * Math.PI * 1.8 + t * 0.007 + i * 0.18) * H * 0.12;
      const wave2 = Math.sin(norm * Math.PI * 3.2 + t * 0.011 + i * 0.09) * H * 0.05;
      const bulge = Math.sin(norm * Math.PI) * H * 0.08;
      return base + wave1 + wave2 + bulge;
    }

    function rightY(x: number, i: number, t: number) {
      const norm = x / W;
      const base = H * (-0.1 + (i / RIBBONS_RIGHT) * 0.65);
      const wave1 = Math.sin(norm * Math.PI * 2.1 - t * 0.009 + i * 0.22) * H * 0.13;
      const wave2 = Math.sin(norm * Math.PI * 4.0 - t * 0.013 + i * 0.11) * H * 0.04;
      const pull = norm * norm * H * 0.35;
      return base + wave1 + wave2 + pull;
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const STEPS = 3;

      for (let i = 0; i < RIBBONS_LEFT; i++) {
        const alpha = 0.55 + (i / RIBBONS_LEFT) * 0.45;
        ctx.beginPath();
        for (let x = 0; x <= W; x += STEPS) {
          const y = leftY(x, i, t);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(140,70,255,${alpha})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      for (let i = 0; i < RIBBONS_RIGHT; i++) {
        const alpha = 0.55 + (i / RIBBONS_RIGHT) * 0.45;
        ctx.beginPath();
        for (let x = 0; x <= W; x += STEPS) {
          const y = rightY(x, i, t);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(140,70,255,${alpha})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      t++;
      frame = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 size-full"
      aria-hidden="true"
    />
  );
}
