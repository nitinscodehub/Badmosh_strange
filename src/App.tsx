import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Holistic, Results as HolisticResults } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { AuraCanvas } from './components/AuraCanvas';
import { isPalmOpen } from './lib/handUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Mic, Volume2, ShieldAlert as AlertCircle, Play } from 'lucide-react';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [handResults, setHandResults] = useState<any>(null);
  const [faceResults, setFaceResults] = useState<any>(null);
  const [isAwakened, setIsAwakened] = useState(false);
  const [isDivineStrike, setIsDivineStrike] = useState(false);
  const [isShieldActive, setIsShieldActive] = useState(false);
  
  const steadyStartTime = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ... (rest of the code needs to be updated to map Holistic results to old states)

  // Divine Strike Audio Effect
  const playDivineSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    
    // Master envelope for smooth fade in/out
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.8); // Smooth swell
    masterGain.gain.setValueAtTime(0.2, ctx.currentTime + 2.0);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.0); // Gentle fade out
    masterGain.connect(ctx.destination);

    // Harmonic frequencies for a "choir" chord (A Major-ish)
    const baseFreq = 220; // A3
    const intervals = [1, 1.25, 1.5, 2, 2.5, 3]; // Root, Major Third, Fifth, Octave...
    
    intervals.forEach((interval) => {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      const detune = (Math.random() - 0.5) * 5; // Subtle detuning for chorus effect
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * interval + detune, ctx.currentTime);
      
      // Add a subtle vibrato to each "voice"
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.value = 4.5 + Math.random(); 
      vibratoGain.gain.value = 2 + Math.random() * 2;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      voiceGain.gain.value = 0.1 / intervals.length;
      
      osc.connect(voiceGain);
      voiceGain.connect(masterGain);
      
      vibrato.start();
      osc.start();
      
      vibrato.stop(ctx.currentTime + 3);
      osc.stop(ctx.currentTime + 3);
    });

    // Add a high-shelf shimmer
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = 'sine'; // Using sine for pure air tone
    noise.frequency.setValueAtTime(1760, ctx.currentTime); // High A
    noiseGain.gain.setValueAtTime(0, ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 1.5);
    noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
    
    noise.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
    noise.stop(ctx.currentTime + 3);
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        if (transcript.includes('awaken')) {
          setIsAwakened(true);
          setTimeout(() => setIsAwakened(false), 5000); // 2x effect briefly
        }
      };

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.start();
      return () => recognition.stop();
    }
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;

    const holistic = new Holistic({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
    });

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      refineFaceLandmarks: true,
    });

    holistic.onResults((results: HolisticResults) => {
      // 1. Map Holistic to Face results
      if (results.faceLandmarks) {
        const mappedFaceResults = { multiFaceLandmarks: [results.faceLandmarks] };
        setFaceResults(mappedFaceResults);
      } else {
        setFaceResults(null);
      }

      // 2. Map Holistic to Hand results
      const multiHandLandmarks = [];
      const multiHandedness = [];
      if (results.leftHandLandmarks) {
        multiHandLandmarks.push(results.leftHandLandmarks);
        multiHandedness.push({ label: 'Left' });
      }
      if (results.rightHandLandmarks) {
        multiHandLandmarks.push(results.rightHandLandmarks);
        multiHandedness.push({ label: 'Right' });
      }

      const mappedHandResults = {
        multiHandLandmarks,
        multiHandedness
      };
      
      setHandResults(mappedHandResults);
      if (!isReady && (results.leftHandLandmarks || results.rightHandLandmarks)) setIsReady(true);

      const hasTwoHands = multiHandLandmarks.length === 2;

      // Divine Strike check
      if (isAwakened && !isDivineStrike && hasTwoHands) {
        const h1 = multiHandLandmarks[0];
        const h2 = multiHandLandmarks[1];
        const dist = Math.sqrt(Math.pow(h1[0].x - h2[0].x, 2) + Math.pow(h1[0].y - h2[0].y, 2));
        if (dist < 0.15) {
          setIsDivineStrike(true);
          playDivineSound();
          setTimeout(() => setIsDivineStrike(false), 3000);
        }
      }

      // Shield check
      if (hasTwoHands) {
        const h1_open = isPalmOpen(multiHandLandmarks[0]);
        const h2_open = isPalmOpen(multiHandLandmarks[1]);
        if (h1_open && h2_open) {
          if (steadyStartTime.current === null) {
            steadyStartTime.current = Date.now();
          } else if (Date.now() - steadyStartTime.current > 2000) {
            if (!isShieldActive) setIsShieldActive(true);
          }
        } else {
          steadyStartTime.current = null;
          if (isShieldActive) setIsShieldActive(false);
        }
      } else {
        steadyStartTime.current = null;
        if (isShieldActive) setIsShieldActive(false);
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await holistic.send({ image: videoRef.current });
        }
      },
      width: 1280,
      height: 720,
    });

    camera.start().catch((err) => {
      console.error(err);
      setError("Failed to access camera. Please ensure permissions are granted.");
    });

    return () => {
      camera.stop();
      holistic.close();
    };
  }, []);

  return (
    <div id="app-container" className="relative w-full h-screen bg-black overflow-hidden font-sans text-white">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 atmosphere pointer-events-none opacity-40" />

      {/* Camera Feed (Hidden or Mirrored/Subtle) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-30 mirrored grayscale"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />

      {/* AR Overlay Layer */}
      <AuraCanvas 
        results={handResults} 
        faceResults={faceResults}
        awakened={isAwakened} 
        divineStrike={isDivineStrike} 
        shield={isShieldActive} 
      />

      {/* UI Controls */}
      <div className="absolute top-8 left-8 z-50">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-2"
        >
          <h1 className="text-4xl font-light tracking-tighter uppercase italic serif">
            Badmosh<span className="text-orange-500 font-bold ml-1">Strange</span>
          </h1>
          <p className="text-xs tracking-[0.2em] text-white/50 uppercase font-medium">
            Eternal Mystic Weaver v2.0
          </p>
        </motion.div>
      </div>

      {/* Status Bar */}
      <div className="absolute top-8 right-8 z-50 flex items-center gap-6 bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-70">
            {isReady ? 'Core Ignited' : 'Heating Coils'}
          </span>
        </div>
        <div className="w-[1px] h-4 bg-white/20" />
        <div className="flex items-center gap-2">
          <Mic className={`w-4 h-4 ${isListening ? 'text-orange-400' : 'text-white/30'}`} />
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-70">
            {isListening ? 'Awaiting "Awaken"' : 'Voice Offline'}
          </span>
        </div>
      </div>

      {/* Divine Strike Indicator */}
      <AnimatePresence>
        {isDivineStrike && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-white text-9xl font-serif italic font-black tracking-[0.5em] uppercase blur-md"
            >
              DIVINE
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interaction Hints */}
      <AnimatePresence>
        {!handResults?.multiHandLandmarks?.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 text-center"
          >
            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-8 py-4 rounded-2xl">
              <Sparkles className="w-6 h-6 text-orange-400 mx-auto mb-3" />
              <p className="text-sm font-medium tracking-wide">Raise palms to ignite the Badmosh Strange</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60]">
          <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 px-6 py-3 rounded-full flex items-center gap-3 text-red-200">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Global CSS for Atmosphere */}
      <style>{`
        .atmosphere {
          background: 
            radial-gradient(circle at 50% 30%, #3a15aa22 0%, transparent 60%),
            radial-gradient(circle at 10% 80%, #7c3aed22 0%, transparent 50%);
          filter: blur(60px);
        }
        .mirrored {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
