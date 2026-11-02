"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import Orb from "@/components/ui/Orb";

function KineticOrbitalSculpture() {
  const rootGroupRef = useRef<THREE.Group>(null);
  const goldOrbGroupRef = useRef<THREE.Group>(null);
  const roseOrbGroupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const equatorialRingRef = useRef<THREE.Mesh>(null);
  const dustPointsRef = useRef<THREE.Points>(null);

  // Pre-generate 220 procedural orbital stardust points (zero external assets)
  const dustGeometry = useMemo(() => {
    const count = 220;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.8 + ((i * 19) % 100) * 0.032;
      const theta = i * 0.42;
      const phi = ((i * 31) % 100) * 0.031 - 1.5;
      positions[i * 3] = r * Math.cos(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.sin(phi) * 0.75;
      positions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      dustGeometry.dispose();
    };
  }, [dustGeometry]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.getElapsedTime();

    // Smooth inertial camera parallax following cursor
    const targetCamX = state.pointer.x * 0.65;
    const targetCamY = state.pointer.y * 0.45;
    state.camera.position.x = THREE.MathUtils.damp(
      state.camera.position.x,
      targetCamX,
      3.2,
      dt
    );
    state.camera.position.y = THREE.MathUtils.damp(
      state.camera.position.y,
      targetCamY,
      3.2,
      dt
    );
    state.camera.lookAt(0, 0, 0);

    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.y = THREE.MathUtils.damp(
        rootGroupRef.current.rotation.y,
        state.pointer.x * 0.35 + t * 0.12,
        2.5,
        dt
      );
      rootGroupRef.current.rotation.x = THREE.MathUtils.damp(
        rootGroupRef.current.rotation.x,
        -state.pointer.y * 0.22,
        2.5,
        dt
      );
    }

    // Dual glowing orbs orbiting a shared center of gravity
    if (goldOrbGroupRef.current) {
      goldOrbGroupRef.current.position.x = Math.cos(t * 0.55) * 1.12;
      goldOrbGroupRef.current.position.y = Math.sin(t * 0.75) * 0.34;
      goldOrbGroupRef.current.position.z = Math.sin(t * 0.55) * 0.55;
      const pulse = 1 + Math.sin(t * 1.8) * 0.04;
      goldOrbGroupRef.current.scale.setScalar(pulse);
    }

    if (roseOrbGroupRef.current) {
      roseOrbGroupRef.current.position.x = Math.cos(t * 0.55 + Math.PI) * 1.12;
      roseOrbGroupRef.current.position.y = Math.sin(t * 0.75 + Math.PI) * 0.34;
      roseOrbGroupRef.current.position.z = Math.sin(t * 0.55 + Math.PI) * 0.55;
      const pulse = 1 + Math.cos(t * 1.6) * 0.04;
      roseOrbGroupRef.current.scale.setScalar(pulse);
    }

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 0.14;
      outerRingRef.current.rotation.x = Math.PI * 0.28 + Math.sin(t * 0.3) * 0.08;
    }

    if (innerRingRef.current) {
      innerRingRef.current.rotation.y = -t * 0.22;
      innerRingRef.current.rotation.x = -Math.PI * 0.18 + Math.cos(t * 0.25) * 0.06;
    }

    if (equatorialRingRef.current) {
      equatorialRingRef.current.rotation.z = -t * 0.09;
    }

    if (dustPointsRef.current) {
      dustPointsRef.current.rotation.y = t * 0.06;
    }
  });

  return (
    <group ref={rootGroupRef}>
      {/* Warm & Cool studio lighting rig */}
      <ambientLight intensity={0.45} color="#F4EFE6" />
      <hemisphereLight args={["#E8D5A8", "#121214", 0.7]} />
      <pointLight position={[3.5, 3, 4]} intensity={22} color="#C9A96E" distance={14} />
      <pointLight position={[-3.5, -2.5, 3]} intensity={14} color="#E7B7A8" distance={12} />

      {/* 150 drifting golden Sparkles from @react-three/drei */}
      <Sparkles
        count={150}
        scale={[9, 6, 5]}
        size={1.9}
        speed={0.28}
        opacity={0.75}
        color="#C9A96E"
      />
      <Sparkles
        count={90}
        scale={[7, 5, 4]}
        size={1.3}
        speed={0.18}
        opacity={0.5}
        color="#E7B7A8"
      />

      {/* Additional 220 procedural stardust particles */}
      <points ref={dustPointsRef} geometry={dustGeometry}>
        <pointsMaterial
          size={0.028}
          color="#E8D5A8"
          transparent
          opacity={0.55}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Primary Gold Orb Assembly (multi-part group) */}
      <Float speed={1.5} rotationIntensity={0.35} floatIntensity={0.45}>
        <group ref={goldOrbGroupRef}>
          {/* Inner glowing core */}
          <mesh>
            <icosahedronGeometry args={[0.58, 5]} />
            <meshStandardMaterial
              color="#C9A96E"
              emissive="#C9A96E"
              emissiveIntensity={0.48}
              roughness={0.18}
              metalness={0.85}
            />
          </mesh>
          {/* Geodesic wireframe cage */}
          <mesh scale={1.12}>
            <icosahedronGeometry args={[0.58, 2]} />
            <meshStandardMaterial
              color="#E8D5A8"
              emissive="#C9A96E"
              emissiveIntensity={0.25}
              wireframe
              transparent
              opacity={0.32}
              roughness={0.45}
              metalness={0.6}
            />
          </mesh>
          {/* Precision collar ring */}
          <mesh rotation={[Math.PI / 2.4, 0.3, 0]}>
            <torusGeometry args={[0.78, 0.008, 16, 72]} />
            <meshStandardMaterial
              color="#E8D5A8"
              emissive="#C9A96E"
              emissiveIntensity={0.6}
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>
        </group>
      </Float>

      {/* Secondary Rose Quartz Orb Assembly (multi-part group) */}
      <Float speed={1.3} rotationIntensity={0.4} floatIntensity={0.5}>
        <group ref={roseOrbGroupRef}>
          <mesh>
            <icosahedronGeometry args={[0.46, 5]} />
            <meshStandardMaterial
              color="#E7B7A8"
              emissive="#E7B7A8"
              emissiveIntensity={0.42}
              roughness={0.22}
              metalness={0.78}
            />
          </mesh>
          <mesh scale={1.14}>
            <icosahedronGeometry args={[0.46, 2]} />
            <meshStandardMaterial
              color="#F4EFE6"
              emissive="#E7B7A8"
              emissiveIntensity={0.2}
              wireframe
              transparent
              opacity={0.28}
              roughness={0.5}
              metalness={0.5}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 3, -0.4, 0]}>
            <torusGeometry args={[0.64, 0.007, 16, 64]} />
            <meshStandardMaterial
              color="#E7B7A8"
              emissive="#E7B7A8"
              emissiveIntensity={0.5}
              roughness={0.25}
              metalness={0.85}
            />
          </mesh>
        </group>
      </Float>

      {/* Outer Kinetic Wireframe Torus */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[2.15, 0.38, 18, 72]} />
        <meshStandardMaterial
          color="#C9A96E"
          emissive="#C9A96E"
          emissiveIntensity={0.18}
          wireframe
          transparent
          opacity={0.14}
          roughness={0.4}
          metalness={0.7}
        />
      </mesh>

      {/* Inner Precision Astrolabe Ring */}
      <mesh ref={innerRingRef}>
        <torusGeometry args={[1.65, 0.01, 16, 120]} />
        <meshStandardMaterial
          color="#E8D5A8"
          emissive="#C9A96E"
          emissiveIntensity={0.45}
          transparent
          opacity={0.45}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Equatorial Rose Ring */}
      <mesh ref={equatorialRingRef} rotation={[Math.PI / 2.1, 0.15, 0]}>
        <torusGeometry args={[2.55, 0.006, 12, 120]} />
        <meshStandardMaterial
          color="#E7B7A8"
          emissive="#E7B7A8"
          emissiveIntensity={0.35}
          transparent
          opacity={0.28}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

export default function HeroScene() {
  const [canRenderWebGL, setCanRenderWebGL] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCanRenderWebGL(false);
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) {
        setCanRenderWebGL(false);
      } else {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    } catch {
      setCanRenderWebGL(false);
    }
  }, []);

  if (!canRenderWebGL) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <Orb color="#C9A96E" size={320} className="-translate-x-20 -translate-y-6 opacity-60" />
        <Orb color="#E7B7A8" size={280} className="translate-x-20 translate-y-8 opacity-50" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <Suspense fallback={null}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
          camera={{ position: [0, 0, 6.2], fov: 45 }}
        >
          <KineticOrbitalSculpture />
        </Canvas>
      </Suspense>
    </div>
  );
}
