"use client";

import React, { useEffect, useRef } from "react";

export default function FluidDotMatrixCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Epicenter of breathing wave/shockwave tracking the mouse
    const epicenter = {
      x: width * 0.5,
      y: height * 0.5,
      targetX: width * 0.5,
      targetY: height * 0.5,
    };

    const mouse = {
      x: width * 0.5,
      y: height * 0.5,
      active: false,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
      epicenter.targetX = e.clientX;
      epicenter.targetY = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
        epicenter.targetX = e.touches[0].clientX;
        epicenter.targetY = e.touches[0].clientY;
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      epicenter.targetX = width * 0.5;
      epicenter.targetY = height * 0.5;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      epicenter.targetX = width * 0.5;
      epicenter.targetY = height * 0.5;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    // Initialize 3D particles on a concentric sphere cloud with high density
    const particles: {
      x: number; // Current physical X
      y: number; // Current physical Y
      theta: number; // polar angle around Y axis
      phi: number;   // azimuthal angle
      layerRadius: number; // radius multiplier (concentric shells)
      baseSize: number;
      speedOffset: number;
      pulseOffset: number;
      pulseSpeed: number;
      damping: number;
      colorType: number; // 0 = Cyan, 1 = Sky, 2 = Indigo
    }[] = [];

    const particleCount = 750;
    // Giant breathing sphere field
    const baseSphereRadius = Math.min(width, height) * 0.50;

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const layerRadius = 0.35 + (i % 4) * 0.22; // 4 layers: 0.35, 0.57, 0.79, 1.01

      particles.push({
        x: width * 0.5,
        y: height * 0.5,
        theta,
        phi,
        layerRadius,
        baseSize: 0.5 + Math.random() * 1.1, // Smaller, crisper stars
        speedOffset: 0.5 + Math.random() * 1.0,
        pulseOffset: Math.random() * Math.PI * 2,
        pulseSpeed: 1.0 + Math.random() * 2.0,
        damping: 0.04 + Math.random() * 0.05,
        colorType: i % 3,
      });
    }

    let time = 0;
    let rotX = 0;
    let rotY = 0;
    let isFirstFrame = true;

    const render = () => {
      // Slow breathing cycle speed
      time += 0.008;

      // Slow Y and X rotation for the organic sphere structure
      rotX += 0.002;
      rotY += 0.003;

      // Ease the epicenter center towards cursor target
      epicenter.x += (epicenter.targetX - epicenter.x) * 0.06;
      epicenter.y += (epicenter.targetY - epicenter.y) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // Deep celestial black background
      ctx.fillStyle = "#070A13";
      ctx.fillRect(0, 0, width, height);

      const perspective = 550;

      particles.forEach((p) => {
        // Slow living organism waves
        const wave = Math.sin(p.phi * 3.5 + time * 2.0) * Math.cos(p.theta * 2.0 - time * 1.5) * 25 * p.speedOffset;
        const breathe = Math.sin(time * 1.6 + p.layerRadius * 4.0) * 15;
        const r = (p.layerRadius * baseSphereRadius) + wave + breathe;

        // Unrotated 3D coordinates on sphere
        const x3d = Math.cos(p.theta) * Math.sin(p.phi) * r;
        const y3d = Math.sin(p.theta) * Math.sin(p.phi) * r;
        const z3d = Math.cos(p.phi) * r;

        // Apply 3D Y-rotation
        let x = x3d * Math.cos(rotY) - z3d * Math.sin(rotY);
        let z = x3d * Math.sin(rotY) + z3d * Math.cos(rotY);

        // Apply 3D X-rotation
        const y = y3d * Math.cos(rotX) - z * Math.sin(rotX);
        z = y3d * Math.sin(rotX) + z * Math.cos(rotX);

        // Projected 2D screen coordinates relative to the epicenter
        const scale = perspective / (perspective + z);
        const projX = epicenter.x + x * scale;
        const projY = epicenter.y + y * scale;

        // Initialize positions on the first frame
        if (isFirstFrame) {
          p.x = projX;
          p.y = projY;
        }

        // Apply easing towards target projected coordinates
        p.x += (projX - p.x) * p.damping;
        p.y += (projY - p.y) * p.damping;

        // Calculate distance from epicenter for radial breathing and shockwave effect
        const dx = p.x - epicenter.x;
        const dy = p.y - epicenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 1. Slow shockwave radial ripple (slow wave movement pushing outwards/pulling inwards)
        const rippleFactor = Math.sin(time * 1.6 - dist * 0.005) * 16.0;
        const finalX = p.x + (dx / (dist || 1)) * rippleFactor;
        const finalY = p.y + (dy / (dist || 1)) * rippleFactor;

        // 2. Slow breathing size wave (close points shrink while outer grow, then vice versa) with reduced max expansion
        const sizeFactor = 1.0 + Math.sin(time * 1.6 - dist * 0.005) * 0.35;
        const size = Math.max(0.4, p.baseSize * scale * sizeFactor * (z > 0 ? 0.75 : 1.25));

        // Twinkling stars: fade out/in smoothly
        const twinkleFactor = Math.sin(time * p.pulseSpeed + p.pulseOffset);
        let alpha = 0.45 + twinkleFactor * 0.65; // Range: -0.2 to 1.1
        if (alpha < 0.08) alpha = 0; // Turn off completely

        // Depth-based opacity
        const depthFactor = (0.5 + (z / baseSphereRadius) * 0.45) * scale;
        const opacity = Math.min(Math.max(alpha * depthFactor, 0), 1.0);

        // Render point if visible
        if (opacity > 0) {
          let pointColor: string;
          if (p.colorType === 0) {
            pointColor = `rgba(56, 189, 248, ${opacity})`; // Cyan
          } else if (p.colorType === 1) {
            pointColor = `rgba(129, 140, 248, ${opacity})`; // Light Indigo
          } else {
            pointColor = `rgba(147, 197, 253, ${opacity})`; // Sky Blue
          }

          // Draw crisp solid dot
          ctx.beginPath();
          ctx.arc(finalX, finalY, size, 0, Math.PI * 2);
          ctx.fillStyle = pointColor;
          ctx.fill();
        }
      });

      isFirstFrame = false;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
    />
  );
}
