import React, { useRef, useEffect, useMemo } from 'react';
import { isPalmOpen } from '../lib/handUtils';

interface AuraCanvasProps {
  results: any;
  faceResults: any;
  awakened: boolean;
  divineStrike: boolean;
  shield: boolean;
}

enum EnergyType {
  ARCANE,
  REACTOR,
  FUSION,
  SPARK,
  PLASMA
}

class Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  isProjectile: boolean;
  type: EnergyType;

  constructor(x: number, y: number, color: string, speedMult: number = 1, baseVelocity: {x: number, y: number} = {x: 0, y: 0}, isProjectile: boolean = false, type: EnergyType = EnergyType.REACTOR) {
    this.x = x;
    this.y = y;
    this.z = Math.random() * 400 - 200;
    this.isProjectile = isProjectile;
    this.type = type;
    const angle = Math.random() * Math.PI * 2;
    
    let speed = (Math.random() * 3 + (isProjectile ? 12 : 1)) * speedMult;
    
    if (type === EnergyType.ARCANE) {
        this.vx = (Math.cos(angle) * speed * 0.5) + baseVelocity.x * 2;
        this.vy = (Math.sin(angle) * speed * 0.5) + baseVelocity.y * 2;
        this.vz = (Math.random() - 0.5) * speed * 2;
    } else if (type === EnergyType.SPARK) {
        this.vx = (Math.cos(angle) * speed * 5) + baseVelocity.x * 12;
        this.vy = (Math.sin(angle) * speed * 5) + baseVelocity.y * 12;
        this.vz = (Math.random() - 0.5) * speed * 6;
    } else if (type === EnergyType.PLASMA) {
        this.vx = (Math.cos(angle) * speed) + baseVelocity.x;
        this.vy = (Math.sin(angle) * speed) + baseVelocity.y;
        this.vz = (Math.random() - 0.5) * 8;
    } else {
        this.vx = (Math.cos(angle) * speed) + baseVelocity.x * (isProjectile ? 25 : 5);
        this.vy = (Math.sin(angle) * speed) + baseVelocity.y * (isProjectile ? 25 : 5) - (isProjectile ? 0 : 1);
        this.vz = (Math.random() - 0.5) * speed * 2;
    }
    
    this.size = Math.random() * (isProjectile ? 8 : 3) + (isProjectile ? 4 : 0.5);
    if (type === EnergyType.SPARK) this.size = Math.random() * 2 + 1;
    if (type === EnergyType.PLASMA) this.size = isProjectile ? (Math.random() * 4 + 6) : (Math.random() * 2 + 1);
    
    this.color = color;
    this.maxLife = isProjectile ? 100 : (Math.random() * 40 + 30);
    this.life = this.maxLife;
  }

  update() {
    if (this.type === EnergyType.ARCANE && !this.isProjectile) {
        const dx = this.vx;
        this.vx -= this.vy * 0.12;
        this.vy += dx * 0.12;
    }
    
    if (this.type === EnergyType.SPARK) {
        this.vy += 0.35;
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.vz *= 0.92;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
    
    if (this.isProjectile || this.type === EnergyType.PLASMA) {
        this.vx *= 1.03;
        this.vy *= 1.03;
    }
    this.life--;
  }

  draw(ctx: CanvasRenderingContext2D, awakened: boolean, w: number, h: number) {
    const opacity = (this.life / this.maxLife) * 1.5;
    
    // 3D Perspective Mapping
    const perspective = 1200;
    const scale = perspective / (perspective + this.z);
    if (scale <= 0) return;

    const screenX = (this.x - w/2) * scale + w/2;
    const screenY = (this.y - h/2) * scale + h/2;
    const currentSize = this.size * scale;

    ctx.globalAlpha = Math.min(opacity, 1);
    
    if (this.isProjectile || this.type === EnergyType.SPARK || this.type === EnergyType.PLASMA) {
        ctx.shadowBlur = (awakened ? 60 : 40) * scale;
        ctx.shadowColor = this.type === EnergyType.PLASMA ? '#22d3ee' : this.color;
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    
    if (this.isProjectile) {
        const angle = Math.atan2(this.vy, this.vx);
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(angle);
        ctx.ellipse(0, 0, currentSize * 4, currentSize, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else if (this.type === EnergyType.SPARK) {
        const prevScale = perspective / (perspective + this.z - this.vz * 1.5);
        const prevX = (this.x - this.vx * 1.5 - w/2) * prevScale + w/2;
        const prevY = (this.y - this.vy * 1.5 - h/2) * prevScale + h/2;
        
        ctx.lineCap = 'round';
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(prevX, prevY);
        ctx.lineWidth = currentSize;
        ctx.strokeStyle = this.color;
        ctx.stroke();
        ctx.beginPath();
    } else if (this.type === EnergyType.PLASMA) {
        const angle = Math.atan2(this.vy, this.vx);
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(angle);
        
        const trailLength = currentSize * 8;
        const grad = ctx.createLinearGradient(-trailLength, 0, 0, 0);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, 'rgba(34, 211, 238, 0.5)');
        grad.addColorStop(1, '#fff');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(-trailLength/2, 0, trailLength / 2, currentSize * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#22d3ee';
        ctx.beginPath();
        ctx.ellipse(0, 0, currentSize, currentSize * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        ctx.beginPath();
    } else {
        ctx.arc(screenX, screenY, currentSize, 0, Math.PI * 2);
    }
    
    if (this.type !== EnergyType.SPARK && this.type !== EnergyType.PLASMA && !this.isProjectile) {
        ctx.fill();
    }
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

export const AuraCanvas: React.FC<AuraCanvasProps> = ({ results, faceResults, awakened, divineStrike, shield }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rotationRef = useRef(0);
  const shieldRadius = useRef(0);
  const prevPositions = useRef<{[key: string]: {x: number, y: number, z: number, angle?: number, velocityAngle?: number}}>({});
  const circularProgress = useRef<{[key: string]: number}>({ 'Left': 0, 'Right': 0 });
  const thrustCooldown = useRef<{[key: string]: number}>({ 'Left': 0, 'Right': 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const w = canvas.width = window.innerWidth;
      const h = canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      rotationRef.current += awakened ? 0.05 : 0.02;

      if (results && results.multiHandLandmarks) {
        const hands = results.multiHandLandmarks;
        const handData = hands.map((landmarks, index) => {
          const currentX = (1 - (landmarks[0].x + landmarks[9].x) / 2) * w;
          const currentY = ((landmarks[0].y + landmarks[9].y) / 2) * h;
          const label = results.multiHandedness[index].label;
          const zDepth = Math.sqrt(Math.pow(landmarks[0].x - landmarks[9].x, 2) + Math.pow(landmarks[0].y - landmarks[9].y, 2));
          
          const prev = prevPositions.current[label] || { x: currentX, y: currentY, z: zDepth };
          const velocity = {
            x: (currentX - prev.x) / w,
            y: (currentY - prev.y) / h
          };
          const thrustZ = zDepth - prev.z;

          // --- Rotation Detection ---
          const currentAngle = Math.atan2(currentY - h/2, currentX - w/2);
          const prevAngle = prev.angle !== undefined ? prev.angle : currentAngle;
          let deltaAngle = currentAngle - prevAngle;
          
          // Normalize deltaAngle to [-PI, PI]
          if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
          if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

          const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
          
          // If moving significantly
          if (speed > 0.005) {
              // Positive deltaAngle means clockwise (in screen coords where Y is down)
              // Wait, in screen coords: X right, Y down.
              // Standard Math.atan2 with Y down:
              // Right: 0, Down: PI/2, Left: PI, Up: -PI/2
              // Clockwise rotation: 0 -> PI/2 -> PI -> -PI/2 -> 0. 
              // This is increasing angle (0 -> 1.57 -> 3.14 -> -1.57 -> 0).
              if (deltaAngle > 0.02) {
                  circularProgress.current[label] = Math.min(circularProgress.current[label] + deltaAngle, Math.PI * 2);
              } else {
                  circularProgress.current[label] = Math.max(circularProgress.current[label] - 0.1, 0);
              }
          } else {
              circularProgress.current[label] = Math.max(circularProgress.current[label] - 0.05, 0);
          }

          prevPositions.current[label] = { x: currentX, y: currentY, z: zDepth, angle: currentAngle };

          return {
            landmarks,
            isOpen: isPalmOpen(landmarks),
            center: { x: currentX, y: currentY },
            velocity,
            thrustZ,
            zDepth,
            label,
            deltaAngle
          };
        });

        const bothOpen = handData.length === 2 && handData[0].isOpen && handData[1].isOpen;

        handData.forEach(hand => {
          const { center, landmarks, isOpen, velocity, zDepth } = hand;

          if (isOpen) {
            const intensity = awakened ? 3.0 : 1.8;
            const coreSize = 55 * intensity * (zDepth * 10);
            const speedXY = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

            // 1. ARCANE & MANDALA LAYER (Aggressive)
            ctx.save();
            const rot = rotationRef.current;
            const handIntensity = awakened ? 1.8 : 1.2;
            
            // Energy Spikes
            ctx.beginPath();
            ctx.strokeStyle = awakened ? 'rgba(167, 139, 250, 0.4)' : 'rgba(34, 211, 238, 0.4)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 12; i++) {
                const angle = rot * 3 + (i / 12) * Math.PI * 2;
                const spikeLen = coreSize * (1.1 + Math.random() * 0.4);
                ctx.moveTo(center.x, center.y);
                ctx.lineTo(center.x + Math.cos(angle) * spikeLen, center.y + Math.sin(angle) * spikeLen);
            }
            ctx.stroke();

            const drawHandRing = (radius: number, rotation: number, lineDash: number[], lineWidth: number, opacity: number) => {
                ctx.save();
                ctx.beginPath();
                ctx.translate(center.x, center.y);
                ctx.rotate(rotation);
                ctx.strokeStyle = awakened ? `rgba(167, 139, 250, ${opacity})` : `rgba(34, 211, 238, ${opacity})`;
                ctx.lineWidth = lineWidth;
                if (lineDash.length > 0) ctx.setLineDash(lineDash);
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            };

            drawHandRing(coreSize + 15, rot * 2, [], 3, 0.8 * handIntensity);
            drawHandRing(coreSize + 35, -rot * 1.2, [15, 5], 1, 0.4 * handIntensity);
            drawHandRing(coreSize + 60, rot * 0.7, [5, 15], 1, 0.3 * handIntensity);

            // Sharp Runes
            const handRuneCount = 8;
            ctx.font = 'bold 15px serif';
            ctx.fillStyle = awakened ? 'rgba(167, 139, 250, 0.9)' : 'rgba(34, 211, 238, 0.9)';
            ctx.textAlign = 'center';
            for (let i = 0; i < handRuneCount; i++) {
                const angle = rot + (i / handRuneCount) * Math.PI * 2;
                const rx = center.x + Math.cos(angle) * (coreSize + 25);
                const ry = center.y + Math.sin(angle) * (coreSize + 25);
                ctx.save();
                ctx.translate(rx, ry);
                ctx.rotate(angle + Math.PI / 2);
                const runes = ['ϟ', 'Δ', 'χ', 'Φ', 'Ψ', 'Ω', 'Ξ', 'Σ'];
                ctx.fillText(runes[i % runes.length], 0, 0);
                ctx.restore();
            }

            // Octagon Fractal
            ctx.beginPath();
            ctx.strokeStyle = awakened ? 'rgba(167, 139, 250, 0.5)' : 'rgba(34, 211, 238, 0.5)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
                const angle = -rot * 0.5 + (i / 8) * Math.PI * 2;
                const x = center.x + Math.cos(angle) * (coreSize + 45);
                const y = center.y + Math.sin(angle) * (coreSize + 45);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            // 2. CORE LAYER (Volatile)
            ctx.save();
            ctx.shadowBlur = 60 * handIntensity;
            ctx.shadowColor = awakened ? '#a78bfa' : '#22d3ee';
            
            const glowGradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, coreSize * 1.8);
            glowGradient.addColorStop(0, '#fff');
            glowGradient.addColorStop(0.2, awakened ? '#c4b5fd' : '#e0f2fe');
            glowGradient.addColorStop(0.5, awakened ? '#8b5cf6' : '#0ea5e9');
            glowGradient.addColorStop(0.8, awakened ? 'rgba(139, 92, 246, 0.4)' : 'rgba(14, 165, 233, 0.4)');
            glowGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(center.x, center.y, coreSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(center.x, center.y, coreSize * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 3. VOLATILE LIGHTNING
            if (Math.random() > (awakened ? 0.3 : 0.6)) {
              ctx.save();
              ctx.beginPath();
              ctx.strokeStyle = '#fff'; 
              ctx.lineWidth = 2;
              ctx.shadowBlur = 20;
              ctx.shadowColor = awakened ? '#a78bfa' : '#22d3ee';
              
              for (let j = 0; j < 3; j++) {
                let lx = center.x;
                let ly = center.y;
                ctx.moveTo(lx, ly);
                for (let k = 0; k < 6; k++) {
                  lx += (Math.random() - 0.5) * coreSize * 0.9;
                  ly += (Math.random() - 0.5) * coreSize * 0.9;
                  ctx.lineTo(lx, ly);
                }
                ctx.stroke();
              }
              ctx.restore();
            }

            const pCount = awakened ? 8 : 4;
            for (let i = 0; i < pCount; i++) {
                particles.current.push(new Particle(center.x + (Math.random() - 0.5) * 60, center.y + (Math.random() - 0.5) * 60, awakened ? '#a78bfa' : '#22d3ee', intensity, velocity, false, EnergyType.ARCANE));
            }
          }
        });

        if (bothOpen) {
          const h1 = handData[0].center;
          const h2 = handData[1].center;
          const dist = Math.sqrt(Math.pow(h1.x - h2.x, 2) + Math.pow(h1.y - h2.y, 2));
          const midX = (h1.x + h2.x) / 2;
          const midY = (h1.y + h2.y) / 2;
          const intensity = awakened ? 2 : 1;
          const combinedVelX = handData[0].velocity.x + handData[1].velocity.x;
          const combinedVelY = handData[0].velocity.y + handData[1].velocity.y;
          const speed = Math.sqrt(combinedVelX * combinedVelX + combinedVelY * combinedVelY);
          
          if (speed > 0.08) {
             ctx.save();
             ctx.shadowBlur = 50;
             ctx.shadowColor = awakened ? '#fff' : '#22d3ee';
             const beamGrad = ctx.createLinearGradient(midX, midY, midX + combinedVelX * 1000, midY + combinedVelY * 1000);
             beamGrad.addColorStop(0, '#fff');
             beamGrad.addColorStop(0.5, '#22d3ee');
             beamGrad.addColorStop(1, 'transparent');
             ctx.beginPath();
             ctx.lineWidth = 20 * intensity;
             ctx.lineCap = 'round';
             ctx.strokeStyle = beamGrad;
             ctx.moveTo(midX, midY);
             ctx.lineTo(midX + combinedVelX * 500, midY + combinedVelY * 500);
             ctx.stroke();
             ctx.restore();
             for(let i=0; i < (awakened ? 6 : 3); i++) {
                particles.current.push(new Particle(midX, midY, '#fff', 3, { x: combinedVelX, y: combinedVelY }, true, EnergyType.FUSION));
             }
          }

          if (dist < 500 || awakened) {
            const orbSize = (awakened ? 150 : (500 - dist) / 3) * intensity;
            const orbGrad = ctx.createRadialGradient(midX, midY, 0, midX, midY, orbSize);
            orbGrad.addColorStop(0, '#fff');
            orbGrad.addColorStop(0.3, '#22d3ee');
            orbGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = orbGrad;
            ctx.beginPath();
            ctx.arc(midX, midY, orbSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
            ctx.moveTo(h1.x, h1.y);
            ctx.bezierCurveTo(midX, midY - 100, midX, midY + 100, h2.x, h2.y);
            ctx.stroke();

            if (divineStrike) {
              const beamWidth = awakened ? 120 : 60;
              const beamHeight = midY;
              const beamGlow = ctx.createLinearGradient(midX - beamWidth, 0, midX + beamWidth, 0);
              beamGlow.addColorStop(0.5, 'rgba(251, 191, 36, 0.4)');
              ctx.fillStyle = beamGlow;
              ctx.fillRect(midX - beamWidth, 0, beamWidth * 2, beamHeight);
              ctx.fillStyle = '#fff';
              ctx.fillRect(midX - (awakened ? 15 : 8), 0, (awakened ? 30 : 16), beamHeight);
            }
          }
        }

        if (shield && handData.length === 2) {
          const midX = (handData[0].center.x + handData[1].center.x) / 2;
          const midY = (handData[0].center.y + handData[1].center.y) / 2;
          shieldRadius.current = Math.min(shieldRadius.current + 15, 320); // Slightly larger
          
          const pulse = Math.sin(Date.now() / 200) * 0.1 + 1; // Pulse factor
          const rot = rotationRef.current;

          const drawMandalaRing = (radius: number, rotation: number, lineDash: number[], lineWidth: number, opacity: number, segments: number = 0) => {
              ctx.save();
              ctx.beginPath();
              ctx.translate(midX, midY);
              ctx.rotate(rotation);
              ctx.strokeStyle = `rgba(251, 191, 36, ${opacity})`;
              ctx.lineWidth = lineWidth;
              if (lineDash.length > 0) ctx.setLineDash(lineDash);
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.stroke();

              if (segments > 0) {
                  ctx.beginPath();
                  for (let i = 0; i < segments; i++) {
                      const angle = (i / segments) * Math.PI * 2;
                      const x = Math.cos(angle) * radius;
                      const y = Math.sin(angle) * radius;
                      ctx.moveTo(x * 0.85, y * 0.85);
                      ctx.lineTo(x * 1.15, y * 1.15);
                  }
                  ctx.stroke();
              }
              ctx.restore();
          };

          // 1. Center Glow and Pulsing Core
          const radialGlow = ctx.createRadialGradient(midX, midY, 0, midX, midY, shieldRadius.current * pulse);
          radialGlow.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
          radialGlow.addColorStop(0.4, 'rgba(251, 191, 36, 0.08)');
          radialGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = radialGlow;
          ctx.beginPath();
          ctx.arc(midX, midY, shieldRadius.current * pulse, 0, Math.PI * 2);
          ctx.fill();

          // 2. Main Mandala Rings (Enhanced Complexity)
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#fbbf24';

          drawMandalaRing(shieldRadius.current * 1.05, rot, [], 4, 0.8, 32); // Outer notched ring
          drawMandalaRing(shieldRadius.current * 0.95, -rot * 0.6, [25, 15], 1, 0.6); // Heavy dashed
          drawMandalaRing(shieldRadius.current * 0.88, rot * 1.5, [5, 20], 2, 0.4); // Fast dots
          drawMandalaRing(shieldRadius.current * 0.7, -rot * 0.4, [], 1, 0.3, 12); // Inner notches
          drawMandalaRing(shieldRadius.current * 0.4, rot * 2.2, [2, 4], 1, 0.5); // Core detail

          // 3. Geometric Fractals (Rotating Square/Hexagon)
          ctx.save();
          ctx.translate(midX, midY);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
          
          // Rotating Diamond
          ctx.beginPath();
          ctx.rotate(-rot * 0.8);
          for (let i = 0; i < 4; i++) {
              const angle = (i / 4) * Math.PI * 2;
              const x = Math.cos(angle) * shieldRadius.current * 0.9;
              const y = Math.sin(angle) * shieldRadius.current * 0.9;
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();

          // Rotating Hexagon
          ctx.beginPath();
          ctx.rotate(rot * 1.2);
          for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2;
              const x = Math.cos(angle) * shieldRadius.current * 0.75;
              const y = Math.sin(angle) * shieldRadius.current * 0.75;
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();

          // 4. Mystical Runes
          const runeCount = 12;
          ctx.font = 'bold 18px serif';
          ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
          ctx.textAlign = 'center';
          for (let i = 0; i < runeCount; i++) {
              const angle = rot + (i / runeCount) * Math.PI * 2;
              const x = midX + Math.cos(angle) * (shieldRadius.current * 0.98);
              const y = midY + Math.sin(angle) * (shieldRadius.current * 0.98);
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(angle + Math.PI / 2);
              const runes = ['🜁', '🜂', '🜃', '🜄', '🜅', '🜆', '🜇', '🜈', '🜉', '🜊', '🜋', '🜌'];
              ctx.fillText(runes[i % runes.length], 0, 0);
              ctx.restore();
          }

          // 5. Constant Edge Embers
          if (Math.random() > 0.6) {
              const angle = Math.random() * Math.PI * 2;
              const ex = midX + Math.cos(angle) * shieldRadius.current;
              const ey = midY + Math.sin(angle) * shieldRadius.current;
              particles.current.push(new Particle(
                  ex, ey, '#fbbf24', 0.8, 
                  { x: Math.cos(angle) * 0.02, y: Math.sin(angle) * 0.02 }, 
                  false, EnergyType.SPARK
              ));
          }

          // Particle Deflection logic with Reactivity
          particles.current.forEach(p => {
            const dx = p.x - midX;
            const dy = p.y - midY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < shieldRadius.current) {
               const angle = Math.atan2(dy, dx);
               p.vx = Math.cos(angle) * 14;
               p.vy = Math.sin(angle) * 14;
               p.x = midX + Math.cos(angle) * (shieldRadius.current + 8);
               p.y = midY + Math.sin(angle) * (shieldRadius.current + 8);
               p.life = Math.min(p.life, 15);

               // Emit impact sparks
               for (let i = 0; i < 2; i++) {
                   particles.current.push(new Particle(
                       p.x, p.y, '#fef3c7', 2, 
                       { x: p.vx * 0.1, y: p.vy * 0.1 }, 
                       false, EnergyType.SPARK
                   ));
               }
            }
          });
        } else {
          shieldRadius.current = Math.max(shieldRadius.current - 20, 0);
        }
      }

      // Optimized Particle Management
      particles.current = particles.current.filter(p => p.life > 0);
      
      // Limit total particles to 120 for performance
      if (particles.current.length > 120) {
        particles.current = particles.current.slice(-120);
      }

      // Sort only every other frame or if count is small
      if (particles.current.length < 80) {
        particles.current.sort((a, b) => b.z - a.z);
      }
      
      particles.current.forEach(p => {
        if (awakened && results && results.multiHandLandmarks) {
          results.multiHandLandmarks.forEach((_, idx) => {
            const label = results.multiHandedness[idx].label;
            const h = prevPositions.current[label];
            if (h) {
              const dx = h.x - p.x;
              const dy = h.y - p.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < 40000) {
                const force = (1 - Math.sqrt(distSq) / 200) * 0.3;
                p.vx += dx * force * 0.15;
                p.vy += dy * force * 0.15;
              }
            }
          });
        }
        p.update();
        p.draw(ctx, awakened, w, h);
      });

      // Simple Vignette (Optimized)
      if (awakened) {
        const vignGrad = ctx.createRadialGradient(w/2, h/2, h/2, w/2, h/2, w*0.8);
        vignGrad.addColorStop(0, 'transparent');
        vignGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vignGrad;
        ctx.fillRect(0, 0, w, h);
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [results, faceResults, awakened, divineStrike, shield]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-40 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
