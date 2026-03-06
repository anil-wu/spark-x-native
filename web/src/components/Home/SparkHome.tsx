"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  Globe,
  PlayCircle,
  Users,
  Wand2,
  Zap,
} from "lucide-react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  affectedByMouse: boolean;
};

const PARTICLE_COUNT = 150;
const MOUSE_EFFECT_RADIUS = 150;

function createParticle(width: number, height: number): Particle {
  const life = Math.random() * 0.5 + 0.5;
  return {
    x: Math.random() * width,
    y: height + Math.random() * 100,
    vx: (Math.random() - 0.5) * 2,
    vy: -Math.random() * 3 - 1,
    life,
    maxLife: life,
    size: Math.random() * 3 + 1,
    hue: Math.random() * 60 + 15,
    affectedByMouse: Math.random() > 0.7,
  };
}

type SparkHomeProps = {
  isAuthenticated: boolean;
};

export default function SparkHome({ isAuthenticated }: SparkHomeProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let width = 0;
    let height = 0;
    let rafId = 0;
    const particles: Particle[] = [];
    const mouse = { x: 0, y: 0 };

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const resetParticle = (particle: Particle) => {
      Object.assign(particle, createParticle(width, height));
    };

    const updateParticle = (particle: Particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.02;
      particle.life -= 0.005;

      if (particle.affectedByMouse) {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < MOUSE_EFFECT_RADIUS) {
          const force = (MOUSE_EFFECT_RADIUS - dist) / MOUSE_EFFECT_RADIUS;
          particle.vx -= (dx / dist) * force * 0.5;
          particle.vy -= (dy / dist) * force * 0.5;
          particle.life = Math.min(particle.maxLife, particle.life + 0.01);
        }
      }

      if (particle.life <= 0 || particle.y < -50) {
        resetParticle(particle);
      }
    };

    const drawParticle = (particle: Particle) => {
      const opacity = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = opacity;

      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size * 3,
      );
      gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, 1)`);
      gradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 50%, 0.5)`);
      gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 50%, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsla(${particle.hue}, 100%, 90%, ${opacity})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      if (Math.random() > 0.8) {
        ctx.strokeStyle = `hsla(${particle.hue}, 100%, 60%, ${opacity * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx * 5, particle.y - particle.vy * 5);
        ctx.stroke();
      }

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i += 1) {
        const p1 = particles[i];
        updateParticle(p1);
        drawParticle(p1);

        for (let j = i + 1; j < particles.length; j += 1) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.strokeStyle = `hsla(30, 100%, 50%, ${0.1 * (1 - dist / 100)})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      rafId = window.requestAnimationFrame(animate);
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) {
        mouse.x = touch.clientX;
        mouse.y = touch.clientY;
      }
    };

    resize();
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      particles.push(createParticle(width, height));
    }
    animate();

    window.addEventListener("resize", resize);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  const handleLoginClick = useCallback(() => {
    if (isAuthenticated) {
      router.push("/projects");
      return;
    }
    router.push("/login");
  }, [isAuthenticated, router]);

  const handleStartCreateClick = useCallback(() => {
    if (isAuthenticated) {
      router.push("/projects");
      return;
    }
    router.push("/login?mode=register");
  }, [isAuthenticated, router]);

  const handleShowDemo = useCallback(() => {
    const target = document.querySelector("#games");
    target?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      <main id="top" className="sparkx-home text-white antialiased">
        <canvas ref={canvasRef} id="spark-canvas" />
        <div className="hero-bg" />

        <nav className="nav-glass fixed left-0 top-0 z-50 w-full">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-20 items-center justify-between">
              <a href="#top" className="group flex cursor-pointer items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-yellow-400 shadow-lg shadow-orange-500/30 transition-transform duration-300 group-hover:rotate-12">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold tracking-tight">
                  Spark<span className="text-orange-400">X</span>
                </span>
              </a>

              <div className="hidden items-center space-x-8 md:flex">
                <a href="#top" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
                  首页
                </a>
                <a
                  href="#games"
                  className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
                >
                  游戏库
                </a>
                <a
                  href="#community"
                  className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
                >
                  社区
                </a>
                <a
                  href="#creators"
                  className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
                >
                  创作者
                </a>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="hidden text-sm font-medium text-gray-300 transition-colors hover:text-white sm:block"
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={handleStartCreateClick}
                  className="btn-glow rounded-full px-6 py-2.5 text-sm font-semibold text-white"
                >
                  开始创作
                </button>
              </div>
            </div>
          </div>
        </nav>

        <section className="relative z-10 flex min-h-screen items-center justify-center overflow-hidden pt-20">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2">
            <div className="pulse-ring h-full w-full" />
            <div className="pulse-ring h-full w-full" style={{ animationDelay: "1s" }} />
            <div className="pulse-ring h-full w-full" style={{ animationDelay: "2s" }} />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="animate-float mb-8 inline-flex items-center space-x-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
              <span className="text-sm text-gray-300">已有 10,000+ 创作者加入</span>
            </div>

            <h1 className="text-gradient mb-6 text-5xl font-black leading-tight tracking-tight sm:text-7xl lg:text-8xl">
              <span className="block">点燃创意的</span>
              <span className="mt-2 block text-white">数字火花</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-gray-400">
              SparkX 是下一代在线游戏创作平台。
              <br />
              从零开始构建你的游戏世界，或者探索无限可能的玩家创作宇宙。
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={handleStartCreateClick}
                className="btn-glow group flex items-center space-x-2 rounded-full px-8 py-4 text-lg font-semibold text-white"
              >
                <span>立即开始创作</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={handleShowDemo}
                className="btn-outline flex items-center space-x-2 rounded-full px-8 py-4 text-lg font-semibold text-white"
              >
                <PlayCircle className="h-5 w-5" />
                <span>观看演示</span>
              </button>
            </div>

            <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-8 border-t border-white/10 pt-10 md:grid-cols-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="mt-1 text-sm text-gray-500">原创游戏</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">2M+</div>
                <div className="mt-1 text-sm text-gray-500">活跃用户</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="mt-1 text-sm text-gray-500">在线稳定性</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">0</div>
                <div className="mt-1 text-sm text-gray-500">创作门槛</div>
              </div>
            </div>

            <div className="scroll-indicator absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-500">
              <ChevronDown className="h-6 w-6" />
            </div>
          </div>
        </section>

        <section id="games" className="relative z-10 bg-black/50 py-32 backdrop-blur-3xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-20 text-center">
              <h2 className="mb-6 text-3xl font-bold sm:text-5xl">
                为创意而生的<span className="text-orange-400">工具箱</span>
              </h2>
              <div className="gradient-line mx-auto mb-6 max-w-md" />
              <p className="text-lg text-gray-400">无需编程基础，人人都能成为游戏设计师</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="feature-card rounded-2xl p-8 text-center group">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-yellow-400/20 transition-transform group-hover:scale-110">
                  <Wand2 className="h-8 w-8 text-orange-400" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">AI 辅助创作</h3>
                <p className="leading-relaxed text-gray-400">
                  描述你的创意，AI 即刻生成游戏场景、角色和音效，让灵感瞬间具象化。
                </p>
              </div>

              <div id="community" className="feature-card rounded-2xl p-8 text-center group">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/20 to-pink-400/20 transition-transform group-hover:scale-110">
                  <Users className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">实时协作</h3>
                <p className="leading-relaxed text-gray-400">
                  与全球创作者实时协作，共同构建庞大的多人游戏世界，版本控制自动同步。
                </p>
              </div>

              <div id="creators" className="feature-card rounded-2xl p-8 text-center group">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-cyan-400/20 transition-transform group-hover:scale-110">
                  <Globe className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">一键发布</h3>
                <p className="leading-relaxed text-gray-400">
                  完成即可全球发布，支持 Web、iOS、Android 和主机平台，自动适配多端操作。
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative z-10 border-t border-white/10 bg-black py-12">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between px-4 sm:px-6 md:flex-row lg:px-8">
            <div className="mb-4 flex items-center space-x-2 md:mb-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-yellow-400">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">SparkX</span>
            </div>
            <div className="text-sm text-gray-500">© 2024 SparkX. 点燃每一个创意火花。</div>
          </div>
        </footer>

      </main>

      <style jsx global>{`
        .sparkx-home {
          margin: 0;
          overflow-x: hidden;
          background: #050505;
        }

        .sparkx-home * {
          font-family: "Inter", sans-serif;
        }

        #spark-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }

        .hero-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          background:
            radial-gradient(circle at 50% 50%, rgba(255, 119, 48, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 20% 30%, rgba(255, 200, 50, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(255, 100, 0, 0.08) 0%, transparent 40%),
            linear-gradient(to bottom, #0a0a0a 0%, #050505 100%);
        }

        .nav-glass {
          background: rgba(10, 10, 10, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .text-gradient {
          background: linear-gradient(135deg, #fff 0%, #ffaa50 50%, #ff7730 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 30px rgba(255, 119, 48, 0.3));
        }

        .btn-glow {
          background: linear-gradient(135deg, #ff7730 0%, #ff9a30 100%);
          box-shadow:
            0 0 20px rgba(255, 119, 48, 0.4),
            0 4px 20px rgba(255, 119, 48, 0.2);
          transition: all 0.3s ease;
        }

        .btn-glow:hover {
          transform: translateY(-2px);
          box-shadow:
            0 0 40px rgba(255, 119, 48, 0.6),
            0 8px 30px rgba(255, 119, 48, 0.3);
        }

        .btn-outline {
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-2px);
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .pulse-ring {
          position: absolute;
          border: 2px solid rgba(255, 119, 48, 0.5);
          border-radius: 50%;
          animation: pulse-ring 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        @keyframes bounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }

        .scroll-indicator {
          animation: bounce 2s infinite;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 119, 48, 0.3);
          transform: translateY(-5px);
        }

        .gradient-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 119, 48, 0.5), transparent);
        }
      `}</style>
    </>
  );
}
