'use client';

/**
 * CareerForm 3D hero scene — native three.js (ThreeUI-inspired depth language).
 * Design rules applied (threejs + build-awwwards-quality-sites skills):
 *  - one clear responsibility: ambient depth behind the hero copy
 *  - capped device pixel ratio, paused offscreen/hidden, no per-frame allocation
 *  - static first frame under prefers-reduced-motion; graceful no-WebGL fallback
 *  - full disposal of geometry/materials/renderer + RAF/listener cleanup
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Hero3DScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || failed) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.055);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
    camera.position.set(0, 0, 11);

    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';

    const disposables: Array<{ dispose(): void }> = [];

    /* ---------- floating "PDS sheet" planes ---------- */
    const sheetGroup = new THREE.Group();
    scene.add(sheetGroup);

    const sheetPalette = [0x38bdf8, 0x22d3ee, 0x818cf8, 0xf59e0b, 0x34d399, 0xf8fafc];
    const sheetCount = window.innerWidth < 768 ? 9 : 15;

    for (let i = 0; i < sheetCount; i++) {
      const w = 0.9 + Math.random() * 0.5;
      const geo = new THREE.PlaneGeometry(w, w * 1.3, 1, 1);
      const isAccent = i % 4 === 0;
      const mat = new THREE.MeshStandardMaterial({
        color: isAccent ? sheetPalette[i % sheetPalette.length] : 0x0f172a,
        emissive: new THREE.Color(isAccent ? sheetPalette[i % sheetPalette.length] : 0x1e293b),
        emissiveIntensity: isAccent ? 0.55 : 0.22,
        metalness: 0.35,
        roughness: 0.35,
        transparent: true,
        opacity: isAccent ? 0.9 : 0.68,
        side: THREE.DoubleSide,
      });

      const sheet = new THREE.Mesh(geo, mat);
      const spread = 14;
      sheet.position.set(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * 8,
        -2 - Math.random() * 9
      );
      sheet.rotation.set(
        (Math.random() - 0.5) * 0.9,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 0.5
      );
      sheet.userData.floatSpeed = 0.25 + Math.random() * 0.5;
      sheet.userData.floatPhase = Math.random() * Math.PI * 2;
      sheet.userData.rotSpeed = 0.1 + Math.random() * 0.22;
      sheetGroup.add(sheet);
      disposables.push(geo, mat);
    }

    /* ---------- document rule-lines glow ---------- */
    const lineGeo = new THREE.PlaneGeometry(3.4, 0.035, 1, 1);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });
    const lineGroup = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, 1.6 - i * 0.42, -4.2);
      lineGroup.add(line);
    }
    scene.add(lineGroup);
    disposables.push(lineGeo, lineMat);

    /* ---------- starfield particles ---------- */
    const starCount = window.innerWidth < 768 ? 350 : 700;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 36;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      starPositions[i * 3 + 2] = -2 - Math.random() * 18;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.05,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    disposables.push(starGeo, starMat);

    /* ---------- lights ---------- */
    scene.add(new THREE.AmbientLight(0x334155, 1.1));
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    keyLight.position.set(4, 5, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xf59e0b, 0.55);
    rimLight.position.set(-6, -3, 2);
    scene.add(rimLight);

    /* ---------- pointer parallax ---------- */
    let targetX = 0;
    let targetY = 0;
    const onPointerMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    /* ---------- sizing ---------- */
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    /* ---------- render loop (paused when hidden/offscreen) ---------- */
    let raf = 0;
    let running = true;
    let visible = true;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const t = clock.getElapsedTime();

      sheetGroup.children.forEach((child) => {
        const s = child as THREE.Mesh & { userData: { floatSpeed: number; floatPhase: number; rotSpeed: number } };
        s.position.y += Math.sin(t * s.userData.floatSpeed + s.userData.floatPhase) * 0.0016;
        s.rotation.y += 0.0006 * s.userData.rotSpeed * 10;
        s.rotation.x += 0.0004 * s.userData.rotSpeed * 10;
      });
      stars.rotation.y = t * 0.008;
      lineGroup.position.y = Math.sin(t * 0.6) * 0.15;

      // eased pointer parallax
      camera.position.x += (targetX * 0.9 - camera.position.x) * 0.04;
      camera.position.y += (-targetY * 0.6 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, -2);

      renderer.render(scene, camera);
    };

    const animate = () => {
      if (!running) return;
      raf = requestAnimationFrame(animate);
      if (!visible || document.hidden) return;
      renderFrame();
    };

    if (reducedMotion) {
      renderFrame(); // single static frame, no RAF loop
    } else {
      raf = requestAnimationFrame(animate);
    }

    const onVisibility = () => {
      if (document.hidden) return;
      if (running && !reducedMotion) renderFrame();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 }
    );
    io.observe(mount);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [failed]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
