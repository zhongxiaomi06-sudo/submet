import { useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import GamePage from './pages/GamePage';

function PosterPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const streams = useMemo(() => {
    return Array.from({ length: 90 }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.08 + Math.random() * 0.35,
      len: 0.05 + Math.random() * 0.18,
      w: 0.6 + Math.random() * 1.8,
      alpha: 0.08 + Math.random() * 0.35,
      hueShift: (Math.random() - 0.5) * 18,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#060b14');
      bg.addColorStop(0.55, '#070a12');
      bg.addColorStop(1, '#03060c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const vignette = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.7);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      for (const s of streams) {
        s.y += dt * s.speed;
        if (s.y - s.len > 1.05) {
          s.y = -Math.random() * 0.2;
          s.x = Math.random();
        }

        const x = s.x * w;
        const y = s.y * h;
        const len = s.len * h;

        const hue = 210 + s.hueShift;
        const grad = ctx.createLinearGradient(x, y - len, x, y);
        grad.addColorStop(0, `rgba(59,130,246,0)`);
        grad.addColorStop(0.6, `rgba(59,130,246,${s.alpha * 0.6})`);
        grad.addColorStop(1, `hsla(${hue}, 90%, 65%, ${s.alpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.w;
        ctx.beginPath();
        ctx.moveTo(x, y - len);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(124,58,237,0.05)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [streams]);

  return (
    <div
      className="relative min-h-screen bg-gray-950 text-gray-100 overflow-hidden select-none"
      onClick={() => navigate('/home')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate('/home');
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute inset-0 opacity-[0.22] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.35),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(124,58,237,0.26),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -inset-24 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(59,130,246,0.0),rgba(59,130,246,0.18),rgba(124,58,237,0.16),rgba(59,130,246,0.0))] blur-3xl animate-[spin_18s_linear_infinite]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.06),transparent)] opacity-30 animate-[scan_4.5s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="h-px w-14 bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
            <div className="mx-3 text-[10px] tracking-[0.55em] text-blue-300/70">SUBNET</div>
            <div className="h-px w-14 bg-gradient-to-r from-transparent via-purple-400/70 to-transparent" />
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-blue-400 to-purple-300 drop-shadow-[0_0_22px_rgba(59,130,246,0.35)]">
              submet
            </span>
            <span className="mx-3 text-gray-600/50">·</span>
            <span className="text-gray-100 drop-shadow-[0_0_26px_rgba(124,58,237,0.22)]">暗流</span>
          </h1>

          <p className="mt-5 text-lg md:text-xl text-gray-300/90">
            胜利者只有一个人吗。
          </p>
        </div>

        <div className="absolute bottom-8 text-xs text-gray-500/80 tracking-wide">
          HTML5 · CSS3 · JavaScript (ES6+)
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-30%); }
          50% { transform: translateY(30%); }
          100% { transform: translateY(-30%); }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PosterPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
      <Route path="/room/:roomId/game" element={<GamePage />} />
    </Routes>
  );
}
