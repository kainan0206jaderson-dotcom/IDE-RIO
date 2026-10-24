import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Project } from '../data/types';
import { palette, scene as SC } from '../design/tokens';

/**
 * Abertura em primeira pessoa: a câmera atravessa a porta do escritório,
 * caminha até a mesa e desce o olhar para os sketchbooks. Ao final, entrega a cena ao carrossel.
 */
const WALK = 6.2; // segundos

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function plankTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const g = cv.getContext('2d')!;
  const a = new THREE.Color(SC.floor);
  const b = new THREE.Color(SC.floorDark);
  for (let i = 0; i < 8; i++) {
    const c = a.clone().lerp(b, ((i * 37) % 10) / 22);
    g.fillStyle = '#' + c.getHexString();
    g.fillRect(0, i * 64, 512, 64);
    g.fillStyle = 'rgba(0,0,0,.18)';
    g.fillRect(0, i * 64, 512, 2);
    g.fillRect(((i * 173) % 400) + 40, i * 64, 2, 64);
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `rgba(0,0,0,${0.03 + ((k * 7) % 5) / 100})`;
      g.fillRect(0, i * 64 + ((k * 13) % 62), 512, 1);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 4);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function posterTexture(title: string) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 640;
  const g = cv.getContext('2d')!;
  g.fillStyle = SC.paper;
  g.fillRect(0, 0, 512, 640);
  const cols = Object.values(palette).map((c) => c.hex);
  cols.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(48, 64 + i * 88, 416, 76);
  });
  g.fillStyle = SC.desk;
  g.font = '700 34px Archivo, Arial, sans-serif';
  g.fillText(title, 48, 600);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function box(w: number, h: number, d: number, color: string | THREE.Material, rough = 0.8) {
  const m = typeof color === 'string' ? new THREE.MeshStandardMaterial({ color, roughness: rough }) : color;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function buildRoom(projects: Project[]) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SC.fog);
  scene.fog = new THREE.Fog(SC.fog, 9, 22);

  // chão e paredes
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 12), new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.75 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: SC.wall, roughness: 0.95 });
  const shadeMat = new THREE.MeshStandardMaterial({ color: SC.wallShade, roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), wallMat);
  back.position.set(0, 1.6, -5);
  back.receiveShadow = true;
  scene.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.2), shadeMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-4.5, 1.6, 1);
  left.receiveShadow = true;
  scene.add(left);
  const right = left.clone();
  right.rotation.y = -Math.PI / 2;
  right.position.x = 4.5;
  scene.add(right);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9, 12), new THREE.MeshBasicMaterial({ color: SC.wallShade }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.2, 1);
  scene.add(ceil);
  // rodapé
  const base = box(9, 0.1, 0.03, SC.wallShade);
  base.position.set(0, 0.05, -4.98);
  scene.add(base);

  // porta de entrada (a câmera passa por ela)
  const frameMat = new THREE.MeshStandardMaterial({ color: SC.desk, roughness: 0.6 });
  const doorWall = new THREE.Group();
  const dl = box(3.6, 3.2, 0.12, wallMat);
  dl.position.set(-2.4, 1.6, 0);
  const dr = dl.clone();
  dr.position.x = 2.4;
  const dt = box(1.2, 1.0, 0.12, wallMat);
  dt.position.set(0, 2.7, 0);
  const jl = box(0.06, 2.2, 0.16, frameMat);
  jl.position.set(-0.6, 1.1, 0);
  const jr = jl.clone();
  jr.position.x = 0.6;
  const jt = box(1.26, 0.06, 0.16, frameMat);
  jt.position.set(0, 2.2, 0);
  doorWall.add(dl, dr, dt, jl, jr, jt);
  doorWall.position.z = 4.2;
  scene.add(doorWall);

  // janela na parede do fundo
  const win = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), new THREE.MeshBasicMaterial({ color: SC.sky, toneMapped: false }));
  win.add(glass);
  for (const [w, h, x, y] of [
    [1.9, 0.05, 0, 0.72],
    [1.9, 0.05, 0, -0.72],
    [0.05, 1.5, -0.93, 0],
    [0.05, 1.5, 0.93, 0],
    [0.03, 1.4, 0, 0],
    [1.8, 0.03, 0, 0],
  ] as const) {
    const b = box(w, h, 0.06, frameMat);
    b.position.set(x, y, 0.02);
    win.add(b);
  }
  win.position.set(-1.7, 1.85, -4.97);
  scene.add(win);

  // quadro com a paleta da interface
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshBasicMaterial({ map: posterTexture('IDEÁRIO'), toneMapped: false }));
  poster.position.set(1.4, 1.75, -4.96);
  scene.add(poster);
  const pframe = box(0.86, 1.06, 0.02, frameMat);
  pframe.position.set(1.4, 1.75, -4.98);
  scene.add(pframe);

  // estante na parede direita
  const shelf = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const plank = box(0.3, 0.03, 1.6, SC.desk);
    plank.position.set(0, 0.9 + i * 0.5, 0);
    shelf.add(plank);
    let z = -0.7;
    let k = 0;
    while (z < 0.7) {
      const accents = [SC.accentViolet, SC.paper, SC.desk, SC.wallShade, SC.accentOrange, SC.paper, SC.accentSun];
      const h = 0.26 + ((i * 3 + k) % 4) * 0.035;
      const w = 0.03 + ((k * 5) % 3) * 0.012;
      const b = box(0.2, h, w, accents[(i * 2 + k) % accents.length], 0.7);
      b.position.set(0, 0.915 + i * 0.5 + h / 2, z + w / 2);
      if ((i + k) % 7 === 3) b.rotation.x = 0.18;
      shelf.add(b);
      z += w + 0.008;
      k++;
    }
  }
  shelf.position.set(4.3, 0, -2.4);
  scene.add(shelf);

  // mesa
  const desk = new THREE.Group();
  const top = box(2.4, 0.05, 1.1, SC.deskTop, 0.55);
  top.position.y = 0.76;
  desk.add(top);
  for (const [x, z] of [
    [-1.12, -0.48],
    [1.12, -0.48],
    [-1.12, 0.48],
    [1.12, 0.48],
  ]) {
    const leg = box(0.05, 0.74, 0.05, SC.metal, 0.4);
    leg.position.set(x, 0.37, z);
    desk.add(leg);
  }
  desk.position.set(0, 0, -3.3);
  scene.add(desk);

  // cadeira
  const chair = new THREE.Group();
  const seat = box(0.48, 0.05, 0.46, SC.desk, 0.6);
  seat.position.y = 0.46;
  const backrest = box(0.48, 0.5, 0.04, SC.desk, 0.6);
  backrest.position.set(0, 0.74, 0.22);
  chair.add(seat, backrest);
  for (const [x, z] of [
    [-0.2, -0.2],
    [0.2, -0.2],
    [-0.2, 0.2],
    [0.2, 0.2],
  ]) {
    const leg = box(0.03, 0.45, 0.03, SC.metal, 0.4);
    leg.position.set(x, 0.225, z);
    chair.add(leg);
  }
  chair.position.set(1.05, 0, -2.6);
  chair.rotation.y = -0.7;
  scene.add(chair);

  // sketchbooks em leque sobre a mesa, com as capas dos projetos
  const covers = projects.slice(0, 5).map((p) => p.cover.bg);
  while (covers.length < 4) covers.push([SC.accentOrange, SC.desk, SC.accentViolet, SC.paper][covers.length]);
  const paperMat = new THREE.MeshStandardMaterial({ color: SC.paper, roughness: 0.95 });
  covers.forEach((c, i) => {
    const coverMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
    const mats = [paperMat, paperMat, coverMat, coverMat, paperMat, paperMat];
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.3), mats);
    book.castShadow = book.receiveShadow = true;
    const n = covers.length;
    book.position.set(-0.55 + (i * 1.1) / (n - 1 || 1), 0.8, -3.2 + (i % 2) * 0.05);
    book.rotation.y = (i - (n - 1) / 2) * 0.12;
    scene.add(book);
  });

  // lápis, caneca e luminária
  const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 6), new THREE.MeshStandardMaterial({ color: SC.accentSun, roughness: 0.6 }));
  pencil.rotation.z = Math.PI / 2;
  pencil.rotation.y = 0.5;
  pencil.position.set(0.15, 0.792, -2.92);
  scene.add(pencil);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 20), new THREE.MeshStandardMaterial({ color: SC.paper, roughness: 0.4 }));
  mug.position.set(0.95, 0.835, -3.45);
  mug.castShadow = true;
  scene.add(mug);
  const lamp = new THREE.Group();
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.02, 24), new THREE.MeshStandardMaterial({ color: SC.desk }));
  const arm = box(0.015, 0.5, 0.015, SC.desk, 0.4);
  arm.position.set(0, 0.25, 0);
  arm.rotation.z = -0.25;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 24, 1, true), new THREE.MeshStandardMaterial({ color: SC.accentOrange, side: THREE.DoubleSide, roughness: 0.5 }));
  head.position.set(0.12, 0.48, 0);
  head.rotation.z = 0.6;
  lamp.add(lampBase, arm, head);
  lamp.position.set(-0.95, 0.79, -3.55);
  scene.add(lamp);

  // luzes
  scene.add(new THREE.HemisphereLight(SC.light, SC.floorDark, 1.1));
  const sun = new THREE.DirectionalLight(SC.light, 2.2);
  sun.position.set(-3.5, 4, -8);
  sun.target.position.set(0, 0.7, -2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -4;
  sun.shadow.camera.right = 4;
  sun.shadow.camera.top = 4;
  sun.shadow.camera.bottom = -4;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  const warm = new THREE.PointLight(SC.light, 3, 4, 1.6);
  warm.position.set(-0.75, 1.15, -3.5);
  scene.add(warm);
  const fill = new THREE.PointLight(SC.accentViolet, 0.7, 7, 2);
  fill.position.set(2.8, 1.6, 0.5);
  scene.add(fill);

  return scene;
}

export function Intro3D({ projects, onDone }: { projects: Project[]; onDone: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [caption, setCaption] = useState(0);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setLeaving(true);
    setTimeout(onDone, 650);
  };

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      onDone();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = buildRoom(projects);
    const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 40);
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // em tela estreita, abre um pouco o campo de visão para a mesa caber
      camera.fov = w / h < 0.8 ? 78 : 62;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    // trajeto: do corredor, pela porta, até a mesa
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.66, 6.4), new THREE.Vector3(0, 1.64, 3.6), new THREE.Vector3(0.12, 1.58, 0.4), new THREE.Vector3(0.04, 1.4, -1.5), new THREE.Vector3(0, 1.16, -2.5)]);
    const lookFrom = new THREE.Vector3(0, 1.55, -5);
    const lookTo = new THREE.Vector3(0, 0.76, -3.24);
    const look = new THREE.Vector3();
    // o relógio só corre depois do primeiro quadro e nunca pula mais que 1/30 s,
    // para a caminhada não "teleportar" em aparelhos lentos
    let last = 0;
    let elapsed = 0;
    let raf = 0;
    let shown = 0;
    renderer.compile(scene, camera);

    const tick = (now: number) => {
      if (last) elapsed += Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const t = Math.min(1, elapsed / WALK);
      const e = ease(t);
      const pos = path.getPointAt(e);
      // passada: balanço leve que some perto da mesa
      const walk = Math.sin(e * Math.PI * 9) * 0.018 * (1 - e);
      camera.position.set(pos.x + Math.sin(e * Math.PI * 4.5) * 0.01 * (1 - e), pos.y + walk, pos.z);
      look.lerpVectors(lookFrom, lookTo, THREE.MathUtils.smoothstep(e, 0.45, 1));
      camera.lookAt(look);
      renderer.render(scene, camera);
      const cap = t < 0.12 ? 0 : t < 0.55 ? 1 : 2;
      if (cap !== shown) {
        shown = cap;
        setCaption(cap);
      }
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(finish, 250);
    };
    raf = requestAnimationFrame(tick);

    const key = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') && finish();
    window.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', key);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        mats.forEach((x) => {
          (x as THREE.MeshStandardMaterial).map?.dispose();
          x.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={'intro' + (leaving ? ' leaving' : '')} aria-label="Abertura: entrando no escritório">
      <div className="intro-canvas" ref={host} aria-hidden="true" />
      <div className="intro-vignette" aria-hidden="true" />
      <span className="intro-brand">IDEÁRIO</span>
      <p className={'intro-caption c' + caption} aria-live="polite">
        {caption === 0 ? '' : caption === 1 ? 'escritório de criação' : 'os sketchbooks estão na mesa'}
      </p>
      <button className="intro-skip" onClick={finish}>
        Pular
      </button>
    </div>
  );
}

export default Intro3D;
