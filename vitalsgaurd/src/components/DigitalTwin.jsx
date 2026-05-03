import React, { useRef, useState, Suspense, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Html, Environment, Float } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';
import { normalizeRegion } from '../track5/digitalTwin/digitalTwinMapper';

// ─────────────────────────────────────────────────────────────────────────────
// MARKER POSITIONS are defined in MODEL-SPACE (0 = feet, 3.6 = top of head).
// These are absolute, hardcoded values that bypass all bounding-box math,
// because the bounding box approach had a reliable feedback loop issue.
// ─────────────────────────────────────────────────────────────────────────────
const MODEL_HEIGHT = 3.6;
const MARKER_POSITIONS = {
  heart: [MODEL_HEIGHT * 0.08, MODEL_HEIGHT * 0.76, MODEL_HEIGHT * 0.10],
  lungs: [MODEL_HEIGHT * -0.05, MODEL_HEIGHT * 0.72, MODEL_HEIGHT * 0.10],
  body: [MODEL_HEIGHT * 0.02, MODEL_HEIGHT * 0.58, MODEL_HEIGHT * 0.10],
  brain: [0, MODEL_HEIGHT * 0.96, 0],
};

// ── Real-time ECG Trace ───────────────────────────────────────────────────────
function EcgTrace({ scanData, color = '#38bdf8' }) {
  const [points, setPoints] = useState([]);
  const requestRef = useRef();
  const startTime = useRef(Date.now());
  const bpmRef = useRef(scanData?.vitals?.heart_rate || 72);

  // Sync ref with live props for the animation loop
  useEffect(() => {
    bpmRef.current = scanData?.vitals?.heart_rate || 72;
  }, [scanData?.vitals?.heart_rate]);

  const animate = () => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    const frequency = bpmRef.current / 60;
    const newPoints = [];
    
    // Using 300 points for a wider, more detailed graph
    for (let x = 0; x <= 300; x += 2) {
      const timeOffset = elapsed - (x / 300) * 2;
      let y = 0;
      const phase = (timeOffset * frequency) % 1;
      
      // Clinical-style waveform with calibrated peaks for high visibility
      if (phase < 0.1) y = Math.sin(phase * Math.PI * 10) * 20; // P-wave
      else if (phase > 0.12 && phase < 0.16) y = (phase - 0.14) * 850; // QRS complex
      else if (phase >= 0.16 && phase < 0.2) y = (0.18 - phase) * 850;
      else if (phase > 0.25 && phase < 0.45) y = Math.sin((phase - 0.25) * Math.PI * 5) * 40; // T-wave
      
      newPoints.push(`${x},${50 - y}`);
    }
    setPoints(newPoints);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []); // Only run once on mount

  return (
    <div style={{ 
      position: 'absolute', 
      bottom: 15, 
      right: 15, 
      width: 320, 
      height: 120, 
      background: 'radial-gradient(circle at center, #0a192f 0%, #020617 100%)', 
      backdropFilter: 'blur(12px)', 
      borderRadius: 16, 
      padding: 12, 
      border: `1px solid ${color}44`, 
      overflow: 'hidden', 
      pointerEvents: 'none', 
      boxShadow: `0 0 30px ${color}22, inset 0 0 20px ${color}11`, 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      {/* Mesh Overlay Background */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        opacity: 0.15, 
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
        zIndex: 0
      }} />
      
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        fontSize: '0.75rem', 
        color, 
        textTransform: 'uppercase', 
        marginBottom: 8, 
        opacity: 1, 
        letterSpacing: 2, 
        fontWeight: '900', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        textShadow: `0 0 10px ${color}`
      }}>
        <span>Live ECG Track</span>
        <span style={{ fontSize: '0.85rem', background: `${color}22`, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${color}33` }}>
          {status} {Math.round(scanData?.vitals?.heart_rate || 0)} BPM
        </span>
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <svg width="290" height="70" viewBox="0 0 300 100" preserveAspectRatio="none" style={{ overflow: 'visible', filter: `drop-shadow(0 0 5px ${color})` }}>
          {/* Neon Glow Layers */}
          <polyline fill="none" stroke={color} strokeWidth="5" points={points.join(' ')} strokeLinejoin="round" opacity="0.1" />
          <polyline fill="none" stroke={color} strokeWidth="3" points={points.join(' ')} strokeLinejoin="round" opacity="0.3" />
          <polyline fill="none" stroke="#fff" strokeWidth="1.5" points={points.join(' ')} strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ── Pulsing anomaly sphere ────────────────────────────────────────────────────
function PulsingNode({ color, onClick, hovered, onHover, onUnhover }) {
  const ringRef = useRef();
  const innerRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) ringRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.25);
    if (innerRef.current) innerRef.current.material.emissiveIntensity = 3 + Math.sin(t * 5) * 2;
  });

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={onHover} onPointerOut={onUnhover}>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.10, 0.015, 8, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.6} />
      </mesh>
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial color={hovered ? '#ffffff' : color} emissive={color} emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── Info Card ─────────────────────────────────────────────────────────────────
function InfoPanel({ scanData, label, color, onClose }) {
  const displayLabel = scanData?.ui_label || scanData?.condition || label || 'Anomaly Detected';
  const consensus = scanData?.consensus || scanData?.description || 'AI analysis flags a health anomaly.';
  const confidence = scanData?.lstm_result?.confidence
    ? Math.round(scanData.lstm_result.confidence * 100)
    : (scanData?.confidence ? Math.round(scanData.confidence * 100) : 'N/A');

  return (
    <Html position={[0.4, 0.15, 0]} distanceFactor={4} zIndexRange={[100, 0]}>
      <div style={{ width: 260, background: 'rgba(7,13,30,0.98)', backdropFilter: 'blur(28px)', borderRadius: 12, border: `1px solid ${color}55`, borderLeft: `4px solid ${color}`, padding: 16, color: 'white', boxShadow: '0 25px 60px rgba(0,0,0,0.95)', userSelect: 'none', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: '0.85rem', color, textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1.3, fontWeight: 600 }}>{displayLabel}</h4>
          <span style={{ cursor: 'pointer', color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }} onClick={onClose}>✕</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '0 0 12px', lineHeight: 1.6 }}>{consensus}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', background: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: 4 }}>
          <span style={{ color: '#64748b' }}>RISK CONFIDENCE</span>
          <span style={{ color: '#38bdf8', fontWeight: 800 }}>{confidence}%</span>
        </div>
      </div>
    </Html>
  );
}

// ── Human Model ───────────────────────────────────────────────────────────────
function HumanModel({ scanData, isScanning }) {
  const [showInfo, setShowInfo] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState([0, 0, 0]);

  const obj = useLoader(OBJLoader, '/models/human.obj');
  const groupRef = useRef();
  const primRef = useRef();

  // Apply material once
  useEffect(() => {
    obj.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          wireframe: true, color: '#38bdf8', transparent: true,
          opacity: 0.18, emissive: new THREE.Color('#0ea5e9'), emissiveIntensity: 0.6
        });
      }
    });
  }, [obj]);

  // Measure AFTER the primitive is mounted using a real RAF tick
  // to guarantee the model's matrix world is fully committed.
  useEffect(() => {
    let rafId;
    const measure = () => {
      if (!primRef.current) { rafId = requestAnimationFrame(measure); return; }
      // Temporarily reset to identity for a clean measurement
      primRef.current.scale.set(1, 1, 1);
      primRef.current.position.set(0, 0, 0);
      primRef.current.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(primRef.current);
      const sz = new THREE.Vector3();
      const ctr = new THREE.Vector3();
      box.getSize(sz);
      box.getCenter(ctr);

      const s = MODEL_HEIGHT / sz.y;
      setScale(s);
      setOffset([-ctr.x * s, -box.min.y * s, -ctr.z * s]);
      setModelReady(true);
    };
    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [obj]);

  useFrame(({ clock }) => {
    if (groupRef.current && !scanData) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.08;
    }
  });

  const activeRegionKey = normalizeRegion(scanData);
  const markerPos = MARKER_POSITIONS[activeRegionKey] || null;

  const glowClr = scanData?.heatmap_colour || '#ef4444';
  const labels = { heart: 'Cardiac Region', lungs: 'Pulmonary Region', body: 'Systemic Health', brain: 'Neurological Analysis' };

  return (
    <group ref={groupRef}>
      <primitive
        ref={primRef}
        object={obj}
        scale={modelReady ? scale : 0.001}
        position={modelReady ? offset : [0, 0, 0]}
      />

      {modelReady && markerPos && !isScanning && (
        <group position={markerPos}>
          <PulsingNode
            color={glowClr}
            hovered={hovered}
            onHover={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
            onUnhover={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
            onClick={() => setShowInfo(v => !v)}
          />
          {showInfo && (
            <InfoPanel
              scanData={scanData}
              label={labels[activeRegionKey] || 'Anomaly Detection'}
              color={glowClr}
              onClose={() => setShowInfo(false)}
            />
          )}
        </group>
      )}
    </group>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function DigitalTwin({ scanData, isScanning }) {
  const accentColor = '#3b82f6'; // Professional Institutional Blue

  return (
    <div style={{ width: '100%', height: 520, position: 'relative', overflow: 'hidden', background: 'radial-gradient(ellipse at center, #070e1b 0%, #01040a 100%)', borderRadius: 20, border: '1px solid rgba(56,189,248,0.1)' }}>
      {isScanning && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(10px)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(56,189,248,0.05)', borderTopColor: '#38bdf8', animation: 'dt-spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
            <p style={{ color: '#38bdf8', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>Syncing Telemetry</p>
          </div>
        </div>
      )}

      <EcgTrace scanData={scanData} color={accentColor} />

      <div className="dt-canvas" style={{ width: '100%', height: '100%' }}>
        <Canvas camera={{ position: [0, 1.8, 6], fov: 40 }} dpr={[1, 2]}>
          <ambientLight intensity={0.7} />
          <pointLight position={[10, 15, 10]} intensity={2} color="#0ea5e9" />
          <Suspense fallback={<Html center><p style={{ color: '#38bdf8', letterSpacing: 2 }}>INITIALIZING MODEL...</p></Html>}>
            <Float speed={1} rotationIntensity={0.2} floatIntensity={0.25}>
              <group position={[0, -1.2, 0]}>
                <HumanModel scanData={scanData} isScanning={isScanning} />
              </group>
            </Float>
            <Environment preset="night" />
          </Suspense>
          <OrbitControls enablePan minDistance={1.5} maxDistance={25}
            autoRotate={!scanData && !isScanning} autoRotateSpeed={0.6}
            target={[0, 0.8, 0]} />
        </Canvas>
      </div>

      <style>{`
        @keyframes dt-spin { to { transform: rotate(360deg); } }
        .dt-canvas canvas { cursor: grab; }
        .dt-canvas canvas:active { cursor: grabbing; }
      `}</style>
    </div>
  );
}