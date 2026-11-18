/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MindNode, MindLink, HandTrackingState, SingleHandData, LayoutMode } from '../types';
import { soundFx } from '../audio/spatialAudio';

// Pre-allocated math objects to ensure ZERO garbage collection in render loop
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _vecMid = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

interface Node3DVisual {
  data: MindNode;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  haloRing: THREE.Mesh;
  labelSprite: THREE.Sprite;
  targetPos: THREE.Vector3;
  velocity: THREE.Vector3;
}

interface Link3DVisual {
  data: MindLink;
  lineMesh: THREE.Line | THREE.Mesh;
  labelSprite?: THREE.Sprite;
}

interface CyberHandRig {
  handType: 'left' | 'right';
  group: THREE.Group;
  joints: THREE.Mesh[];
  laserBeam: THREE.Line;
  reticle: THREE.Mesh;
  hoveredNodeId: string | null;
  draggedNodeId: string | null;
  dragPlane: THREE.Plane;
  dragOffset: THREE.Vector3;
  pointerVec: THREE.Vector2;
  raycaster: THREE.Raycaster;
}

export class MindFlowScene {
  private container: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private isSoftwareGl: boolean = false;
  private animFrameId: number = 0;
  private isRunning: boolean = false;

  // Scene elements
  private nodeVisuals: Map<string, Node3DVisual> = new Map();
  private linkVisuals: Map<string, Link3DVisual> = new Map();
  private nodesGroup: THREE.Group = new THREE.Group();
  private linksGroup: THREE.Group = new THREE.Group();
  private handModelGroup: THREE.Group = new THREE.Group();

  // Dual Cyber Hand 3D Skeletons (Right = Cyan/Emerald, Left = Violet/Pink)
  private rightHandRig!: CyberHandRig;
  private leftHandRig!: CyberHandRig;
  private lastDualDistance: number = 0;
  private lastDualAngle: number = 0;
  private lastConnectedPair: string = '';
  private lastSinglePalmPos = new THREE.Vector2();
  private hasLastPalmPos: boolean = false;

  // Interaction state
  private hoveredNodeId: string | null = null;
  private selectedNodeId: string | null = null;
  private draggedNodeId: string | null = null;
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();
  private connectingSourceId: string | null = null;
  private layoutMode: LayoutMode = 'force3d';

  // Callbacks to React
  public onNodeSelect?: (node: MindNode | null) => void;
  public onNodeHover?: (node: MindNode | null) => void;
  public onConnectNodes?: (sourceId: string, targetId: string) => void;
  public onNodePositionChange?: (id: string, x: number, y: number, z: number) => void;

  // Camera animation
  private targetCameraPos = new THREE.Vector3(0, 5, 14);
  private targetCameraLookAt = new THREE.Vector3(0, 1, 0);

  // Time tracking
  private clock = new THREE.Clock();

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.init();
  }

  private init() {
    // 1. Detect software WebGL per Three.js guidelines
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize renderer with sRGB color pipeline and tone mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    // 3. Setup Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x07090e, 0.025);

    this.camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.targetCameraPos);

    // 4. Procedural Studio Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting: Balanced 3-point studio rig
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    keyLight.position.set(8, 14, 10);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    fillLight.position.set(-10, 8, -6);
    this.scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.7);
    this.scene.add(hemiLight);

    // 6. Cybernetic Ground Hologram & Starfield
    this.setupEnvironmentDecor();

    // 7. Groups
    this.scene.add(this.linksGroup);
    this.scene.add(this.nodesGroup);
    this.scene.add(this.handModelGroup);

    // 8. Setup Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 60;
    this.controls.minDistance = 2;
    this.controls.target.copy(this.targetCameraLookAt);

    // 9. Build Cyber Hand 3D skeleton & laser ray
    this.buildCyberHandModel();

    // 10. Mouse/Pointer event listeners
    this.bindEvents();

    // 11. Start animation loop
    this.isRunning = true;
    this.startLoop();
  }

  private setupEnvironmentDecor() {
    // Holographic grid plane
    const gridHelper = new THREE.GridHelper(50, 50, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = -5;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.35;
    this.scene.add(gridHelper);

    // Subtle concentric spatial rings
    const ringGeo = new THREE.RingGeometry(8, 8.05, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -4.95;
    this.scene.add(ringMesh);

    // Procedural ambient nebula particles
    const particleCount = this.isSoftwareGl ? 80 : 350;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorA = new THREE.Color(0x38bdf8);
    const colorB = new THREE.Color(0xa855f7);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 40;
      positions[idx + 1] = (Math.random() - 0.5) * 25 + 2;
      positions[idx + 2] = (Math.random() - 0.5) * 40;

      const mixed = colorA.clone().lerp(colorB, Math.random());
      colors[idx] = mixed.r;
      colors[idx + 1] = mixed.g;
      colors[idx + 2] = mixed.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(particles);
  }

  private createSingleHandRig(
    handType: 'left' | 'right',
    jointHex: number,
    emissiveHex: number,
    tipHex: number,
    tipEmissiveHex: number,
    laserHex: number
  ): CyberHandRig {
    const group = new THREE.Group();
    const joints: THREE.Mesh[] = [];

    const jointGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const jointMat = new THREE.MeshStandardMaterial({
      color: jointHex,
      emissive: emissiveHex,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });

    const tipMat = new THREE.MeshStandardMaterial({
      color: tipHex,
      emissive: tipEmissiveHex,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
    });

    for (let i = 0; i < 21; i++) {
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const mesh = new THREE.Mesh(jointGeo, isTip ? tipMat : jointMat);
      mesh.visible = false;
      group.add(mesh);
      joints.push(mesh);
    }

    // Laser Pointer Ray from index tip
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -10),
    ]);
    const laserMat = new THREE.LineBasicMaterial({
      color: laserHex,
      transparent: true,
      opacity: 0.75,
      linewidth: 2,
    });
    const laserBeam = new THREE.Line(laserGeo, laserMat);
    laserBeam.visible = false;
    group.add(laserBeam);

    // Target reticle
    const reticleGeo = new THREE.RingGeometry(0.12, 0.15, 24);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: laserHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.visible = false;
    this.scene.add(reticle);

    this.handModelGroup.add(group);

    return {
      handType,
      group,
      joints,
      laserBeam,
      reticle,
      hoveredNodeId: null,
      draggedNodeId: null,
      dragPlane: new THREE.Plane(),
      dragOffset: new THREE.Vector3(),
      pointerVec: new THREE.Vector2(),
      raycaster: new THREE.Raycaster(),
    };
  }

  private buildCyberHandModel() {
    // Right Hand (Cyan & Emerald)
    this.rightHandRig = this.createSingleHandRig(
      'right',
      0x38bdf8,
      0x0284c7,
      0x34d399,
      0x059669,
      0x38bdf8
    );

    // Left Hand (Violet & Pink)
    this.leftHandRig = this.createSingleHandRig(
      'left',
      0xc084fc,
      0x9333ea,
      0xf472b6,
      0xdb2777,
      0xc084fc
    );
  }

  // Generate crisp procedural canvas label texture
  private createLabelTexture(text: string, category: string, colorHex: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Rounded rectangle card background with cyber glow border
    ctx.clearRect(0, 0, 512, 256);

    const pad = 12;
    const w = 512 - pad * 2;
    const h = 256 - pad * 2;
    const r = 24;

    ctx.save();
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 18;

    // Gradient card fill
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
    grad.addColorStop(1, 'rgba(30, 41, 59, 0.82)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(pad, pad, w, h, r);
    ctx.fill();

    // Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = colorHex;
    ctx.stroke();
    ctx.restore();

    // Category pill top
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.roundRect(32, 28, 140, 36, 12);
    ctx.fill();

    ctx.fillStyle = '#07090e';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(category.toUpperCase(), 102, 46);

    // Main label text (auto wrap up to 2 lines)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const words = text.split(' ');
    let line1 = '';
    let line2 = '';
    for (const word of words) {
      if ((line1 + word).length < 18) {
        line1 += (line1 ? ' ' : '') + word;
      } else {
        line2 += (line2 ? ' ' : '') + word;
      }
    }

    if (line2.length > 20) {
      line2 = line2.slice(0, 19) + '…';
    }

    if (line2) {
      ctx.fillText(line1, 36, 90);
      ctx.fillText(line2, 36, 140);
    } else {
      ctx.fillText(line1, 36, 115);
    }

    // Mini icon/hint bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '20px "JetBrains Mono", monospace';
    ctx.fillText('⚡ MindFlow VR Node', 36, 198);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  // Set Mind Map Data and reconstruct 3D scene
  public setMindMap(data: { nodes: MindNode[]; links: MindLink[] }) {
    // Clear existing
    this.nodeVisuals.forEach((v) => {
      this.nodesGroup.remove(v.group);
      v.coreMesh.geometry.dispose();
      (v.coreMesh.material as THREE.Material).dispose();
      v.haloRing.geometry.dispose();
      (v.haloRing.material as THREE.Material).dispose();
      v.labelSprite.geometry.dispose();
      (v.labelSprite.material as THREE.Material).dispose();
    });
    this.nodeVisuals.clear();

    this.linkVisuals.forEach((l) => {
      this.linksGroup.remove(l.lineMesh);
      l.lineMesh.geometry.dispose();
      (l.lineMesh.material as THREE.Material).dispose();
    });
    this.linkVisuals.clear();

    // Build Nodes
    data.nodes.forEach((node) => {
      const group = new THREE.Group();
      group.position.set(node.x, node.y, node.z);

      const isCore = node.category === 'core';
      const radius = isCore ? 0.75 : 0.52;

      // 1. Core Sphere / Capsule
      const coreGeo = new THREE.SphereGeometry(radius, 24, 24);
      const coreMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(node.color),
        emissive: new THREE.Color(node.color),
        emissiveIntensity: isCore ? 0.45 : 0.25,
        metalness: 0.3,
        roughness: 0.2,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        transmission: this.isSoftwareGl ? 0 : 0.4,
        transparent: true,
        opacity: this.isSoftwareGl ? 0.85 : 0.95,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.castShadow = !this.isSoftwareGl;
      coreMesh.receiveShadow = !this.isSoftwareGl;
      coreMesh.userData = { nodeId: node.id };
      group.add(coreMesh);

      // 2. Holographic Ring
      const ringGeo = new THREE.RingGeometry(radius * 1.35, radius * 1.48, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const haloRing = new THREE.Mesh(ringGeo, ringMat);
      haloRing.rotation.x = Math.PI / 2.5;
      group.add(haloRing);

      // 3. Label Sprite Billboard
      const texture = this.createLabelTexture(node.label, node.category, node.color);
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      const labelSprite = new THREE.Sprite(spriteMat);
      labelSprite.scale.set(3.2, 1.6, 1);
      labelSprite.position.set(0, radius + 1.1, 0);
      labelSprite.userData = { nodeId: node.id };
      group.add(labelSprite);

      this.nodesGroup.add(group);

      this.nodeVisuals.set(node.id, {
        data: node,
        group,
        coreMesh,
        haloRing,
        labelSprite,
        targetPos: new THREE.Vector3(node.x, node.y, node.z),
        velocity: new THREE.Vector3(),
      });
    });

    // Build Links
    this.rebuildLinks(data.links);

    // Apply layout
    this.applyLayout(this.layoutMode);
  }

  // Update or rebuild connections between nodes
  public rebuildLinks(links: MindLink[]) {
    this.linkVisuals.forEach((l) => {
      this.linksGroup.remove(l.lineMesh);
      l.lineMesh.geometry.dispose();
      (l.lineMesh.material as THREE.Material).dispose();
    });
    this.linkVisuals.clear();

    links.forEach((link) => {
      const src = this.nodeVisuals.get(link.source);
      const tgt = this.nodeVisuals.get(link.target);
      if (!src || !tgt) return;

      const p1 = src.group.position;
      const p2 = tgt.group.position;

      // Arc curve control point
      _vecMid.copy(p1).lerp(p2, 0.5);
      const dist = p1.distanceTo(p2);
      _vecMid.y += Math.min(dist * 0.22, 1.5);

      const curve = new THREE.QuadraticBezierCurve3(
        p1.clone(),
        _vecMid.clone(),
        p2.clone()
      );

      const points = curve.getPoints(24);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineDashedMaterial({
        color: link.color ? new THREE.Color(link.color) : new THREE.Color(0x38bdf8),
        dashSize: 0.3,
        gapSize: 0.15,
        transparent: true,
        opacity: 0.75,
      });

      const lineMesh = new THREE.Line(geo, mat);
      lineMesh.computeLineDistances();
      this.linksGroup.add(lineMesh);

      this.linkVisuals.set(link.id, {
        data: link,
        lineMesh,
      });
    });
  }

  // Switch 3D Layout algorithms
  public applyLayout(mode: LayoutMode) {
    this.layoutMode = mode;
    const nodes = Array.from(this.nodeVisuals.values());
    if (nodes.length === 0) return;

    if (mode === 'radial') {
      // Core at center, others in spherical/orbit rings
      let orbitIndex = 0;
      nodes.forEach((visual) => {
        if (visual.data.category === 'core') {
          visual.targetPos.set(0, 0.5, 0);
        } else {
          orbitIndex++;
          const angle = (orbitIndex / (nodes.length - 1)) * Math.PI * 2;
          const radius = 4.5 + (orbitIndex % 2) * 2;
          const yElev = Math.sin(orbitIndex * 1.5) * 2.2;
          visual.targetPos.set(
            Math.cos(angle) * radius,
            yElev,
            Math.sin(angle) * radius
          );
        }
      });
    } else if (mode === 'tree') {
      // 3D Hierarchical Mind Tree
      const levels: Map<string, number> = new Map();
      const core = nodes.find((n) => n.data.category === 'core') || nodes[0];
      levels.set(core.data.id, 0);

      // Simple BFS level assign
      const visited = new Set<string>([core.data.id]);
      const queue = [core.data.id];

      while (queue.length > 0) {
        const cur = queue.shift()!;
        const curLvl = levels.get(cur) || 0;
        this.linkVisuals.forEach((l) => {
          if (l.data.source === cur && !visited.has(l.data.target)) {
            visited.add(l.data.target);
            levels.set(l.data.target, curLvl + 1);
            queue.push(l.data.target);
          } else if (l.data.target === cur && !visited.has(l.data.source)) {
            visited.add(l.data.source);
            levels.set(l.data.source, curLvl + 1);
            queue.push(l.data.source);
          }
        });
      }

      const byLevel: Record<number, Node3DVisual[]> = {};
      nodes.forEach((n) => {
        const lvl = levels.get(n.data.id) || 1;
        if (!byLevel[lvl]) byLevel[lvl] = [];
        byLevel[lvl].push(n);
      });

      Object.entries(byLevel).forEach(([lvlStr, list]) => {
        const lvl = Number(lvlStr);
        const yPos = 4 - lvl * 2.8;
        const total = list.length;
        list.forEach((item, i) => {
          const xPos = (i - (total - 1) / 2) * 3.4;
          const zPos = Math.sin(i * 1.2) * 1.5 - lvl * 1.2;
          item.targetPos.set(xPos, yPos, zPos);
        });
      });
    } else if (mode === 'helix') {
      // 3D Galactic Helix
      nodes.forEach((visual, i) => {
        const t = (i / nodes.length) * Math.PI * 4;
        const r = 4.2;
        const y = (i - nodes.length / 2) * 1.4;
        visual.targetPos.set(Math.cos(t) * r, y, Math.sin(t) * r);
      });
    } else if (mode === 'force3d') {
      // 3D physics relaxation
      this.relax3DGraph();
    }
  }

  // 3D Force-Directed Graph physics relaxation step
  private relax3DGraph() {
    const nodes = Array.from(this.nodeVisuals.values());
    const repulsion = 12;
    const springLen = 4.0;
    const springK = 0.08;

    for (let iter = 0; iter < 40; iter++) {
      // Node-Node Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          _vecA.subVectors(n1.targetPos, n2.targetPos);
          const dist = Math.max(_vecA.length(), 0.5);
          const force = (repulsion / (dist * dist)) * 0.15;
          _vecA.normalize().multiplyScalar(force);

          if (n1.data.category !== 'core') n1.targetPos.add(_vecA);
          if (n2.data.category !== 'core') n2.targetPos.sub(_vecA);
        }
      }

      // Link spring attraction
      this.linkVisuals.forEach((l) => {
        const src = this.nodeVisuals.get(l.data.source);
        const tgt = this.nodeVisuals.get(l.data.target);
        if (!src || !tgt) return;

        _vecA.subVectors(tgt.targetPos, src.targetPos);
        const dist = _vecA.length();
        const delta = (dist - springLen) * springK;
        _vecA.normalize().multiplyScalar(delta);

        if (src.data.category !== 'core') src.targetPos.add(_vecA);
        if (tgt.data.category !== 'core') tgt.targetPos.sub(_vecA);
      });
    }
  }

  // Helper to update one Cyber Hand Rig
  private updateSingleRig(rig: CyberHandRig, hand: SingleHandData) {
    rig.group.visible = true;

    // Update joint positions in 3D
    hand.landmarks.forEach((lm, idx) => {
      const mesh = rig.joints[idx];
      if (!mesh) return;

      const depth = 3.2 - lm.z * 2.5;
      _vecA.set(
        (lm.x - 0.5) * -4.5,
        (0.5 - lm.y) * 3.5,
        -depth
      );
      _vecA.applyMatrix4(this.camera.matrixWorld);

      mesh.position.copy(_vecA);
      mesh.visible = true;
    });

    // Raycast from pointer
    rig.pointerVec.x = hand.pointerPos.x;
    rig.pointerVec.y = hand.pointerPos.y;
    rig.raycaster.setFromCamera(rig.pointerVec, this.camera);

    const indexMesh = rig.joints[8];
    if (indexMesh && rig.laserBeam) {
      const startPos = indexMesh.position;
      const endPos = rig.raycaster.ray.origin.clone().add(rig.raycaster.ray.direction.clone().multiplyScalar(22));

      const posAttr = rig.laserBeam.geometry.attributes.position as THREE.BufferAttribute;
      posAttr.setXYZ(0, startPos.x, startPos.y, startPos.z);
      posAttr.setXYZ(1, endPos.x, endPos.y, endPos.z);
      posAttr.needsUpdate = true;
      rig.laserBeam.visible = true;

      // Intersect with node meshes
      const interactiveMeshes = Array.from(this.nodeVisuals.values()).map((v) => v.coreMesh);
      const hits = rig.raycaster.intersectObjects(interactiveMeshes, false);

      if (hits.length > 0) {
        const hit = hits[0];
        const hitNodeId = hit.object.userData.nodeId;

        rig.reticle.position.copy(hit.point);
        rig.reticle.quaternion.copy(this.camera.quaternion);
        rig.reticle.visible = true;

        if (rig.hoveredNodeId !== hitNodeId) {
          rig.hoveredNodeId = hitNodeId;
          this.hoveredNodeId = hitNodeId;
          const node = this.nodeVisuals.get(hitNodeId)?.data || null;
          this.onNodeHover?.(node);
          soundFx.playSelect(rig.handType === 'left' ? 760 : 700);
        }

        // Pinch gesture -> grab node
        if (hand.isPinching) {
          if (!rig.draggedNodeId) {
            rig.draggedNodeId = hitNodeId;
            this.draggedNodeId = hitNodeId;
            soundFx.playGrab();
            this.selectedNodeId = hitNodeId;
            this.onNodeSelect?.(this.nodeVisuals.get(hitNodeId)?.data || null);

            rig.dragPlane.setFromNormalAndCoplanarPoint(
              this.camera.getWorldDirection(_vecC).negate(),
              hit.point
            );
            rig.dragOffset.subVectors(this.nodeVisuals.get(hitNodeId)!.group.position, hit.point);
          }
        }
      } else {
        if (!rig.draggedNodeId) {
          rig.reticle.visible = false;
        }
        if (rig.hoveredNodeId && !rig.draggedNodeId) {
          rig.hoveredNodeId = null;
        }
      }

      // Dragging node
      if (rig.draggedNodeId && hand.isPinching) {
        const intersectPoint = new THREE.Vector3();
        if (rig.raycaster.ray.intersectPlane(rig.dragPlane, intersectPoint)) {
          const visual = this.nodeVisuals.get(rig.draggedNodeId);
          if (visual) {
            visual.targetPos.copy(intersectPoint.add(rig.dragOffset));
            this.onNodePositionChange?.(
              rig.draggedNodeId,
              visual.targetPos.x,
              visual.targetPos.y,
              visual.targetPos.z
            );
          }
        }
      } else if (rig.draggedNodeId && !hand.isPinching) {
        soundFx.playRelease();
        rig.draggedNodeId = null;
      }
    }
  }

  private hideRig(rig: CyberHandRig) {
    rig.group.visible = false;
    rig.reticle.visible = false;
    rig.hoveredNodeId = null;
    rig.draggedNodeId = null;
    rig.joints.forEach((j) => (j.visible = false));
  }

  // Update dual-hand tracking coordinates from webcam or VR controllers
  public updateHandTracking(state: HandTrackingState) {
    if (!state.detected || state.handsCount === 0) {
      this.hideRig(this.rightHandRig);
      this.hideRig(this.leftHandRig);
      this.lastDualDistance = 0;
      return;
    }

    this.handModelGroup.visible = true;

    // Update Right Hand
    if (state.rightHand) {
      this.updateSingleRig(this.rightHandRig, state.rightHand);
    } else {
      this.hideRig(this.rightHandRig);
    }

    // Update Left Hand
    if (state.leftHand) {
      this.updateSingleRig(this.leftHandRig, state.leftHand);
    } else {
      this.hideRig(this.leftHandRig);
    }

    // Single hand fallback if handType wasn't split
    if (state.handsCount === 1 && !state.rightHand && !state.leftHand && state.hands[0]) {
      this.updateSingleRig(this.rightHandRig, state.hands[0]);
      this.hideRig(this.leftHandRig);
    }

    // === DUAL HAND INTERACTIONS ===
    if (state.handsCount >= 2 && state.leftHand && state.rightHand) {
      const leftNode = this.leftHandRig.draggedNodeId;
      const rightNode = this.rightHandRig.draggedNodeId;

      // 1. Two-Hand Instant Connect:
      // Left Hand pinches Node A and Right Hand pinches Node B -> Connect them!
      if (leftNode && rightNode && leftNode !== rightNode) {
        const pairKey = `${leftNode}_${rightNode}`;
        if (this.lastConnectedPair !== pairKey) {
          this.lastConnectedPair = pairKey;
          this.onConnectNodes?.(leftNode, rightNode);
          soundFx.playConnect();
        }
      } else {
        this.lastConnectedPair = '';
      }

      // 2. Dual-Hand Pinch Zoom:
      // If both hands are pinching empty space, zoom in/out with hand distance!
      if (
        state.dualHandInteraction === 'two_hand_pinch_zoom' &&
        !leftNode &&
        !rightNode &&
        state.dualHandDistance !== undefined
      ) {
        if (this.lastDualDistance > 0) {
          const delta = state.dualHandDistance - this.lastDualDistance;
          if (Math.abs(delta) > 0.005) {
            // Zoom camera dolly
            const zoomSpeed = 16;
            const dir = this.camera.getWorldDirection(_vecB);
            this.camera.position.addScaledVector(dir, delta * zoomSpeed);
          }
        }
        this.lastDualDistance = state.dualHandDistance;
      } else {
        this.lastDualDistance = state.dualHandDistance || 0;
      }

      // 3. Dual-Hand Steering Wheel Screen Rotation:
      if (
        state.dualHandInteraction === 'two_hand_rotate' &&
        state.dualHandAngle !== undefined &&
        !leftNode &&
        !rightNode
      ) {
        if (this.lastDualAngle !== 0) {
          let delta = state.dualHandAngle - this.lastDualAngle;
          // Normalize angle delta
          if (delta > Math.PI) delta -= Math.PI * 2;
          if (delta < -Math.PI) delta += Math.PI * 2;
          if (Math.abs(delta) > 0.015 && Math.abs(delta) < 0.6) {
            this.rotateCamera(-delta * 1.6);
          }
        }
        this.lastDualAngle = state.dualHandAngle;
      } else {
        this.lastDualAngle = state.dualHandAngle || 0;
      }

      // 4. Two-Hand Pan:
      if (state.dualHandInteraction === 'two_hand_pan') {
        const avgX = (state.leftHand.pointerPos.x + state.rightHand.pointerPos.x) / 2;
        const avgY = (state.leftHand.pointerPos.y + state.rightHand.pointerPos.y) / 2;
        this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, avgX * 4, 3, 0.05);
        this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, avgY * 4 + 1, 3, 0.05);
      }
    } else if (state.handsCount === 1) {
      // === SINGLE HAND NAVIGATION GESTURES ===
      // 1. Thumbs Up -> Zoom In
      if (state.gesture === 'thumbs_up') {
        const dir = this.camera.getWorldDirection(_vecB);
        this.camera.position.addScaledVector(dir, 0.08);
      }
      // 2. Thumbs Down -> Zoom Out
      else if (state.gesture === 'thumbs_down') {
        const dir = this.camera.getWorldDirection(_vecB);
        this.camera.position.addScaledVector(dir, -0.08);
      }
      // 3. Open Palm Sweep -> Orbit Rotate Screen
      else if (state.gesture === 'open_palm' && !this.rightHandRig.draggedNodeId && !this.leftHandRig.draggedNodeId) {
        if (this.hasLastPalmPos) {
          const deltaX = state.pointerPos.x - this.lastSinglePalmPos.x;
          const deltaY = state.pointerPos.y - this.lastSinglePalmPos.y;
          if (Math.abs(deltaX) > 0.01) {
            this.rotateCamera(-deltaX * 2.2);
          }
        }
        this.lastSinglePalmPos.set(state.pointerPos.x, state.pointerPos.y);
        this.hasLastPalmPos = true;
      } else {
        this.hasLastPalmPos = false;
      }
    } else {
      this.hasLastPalmPos = false;
    }
  }

  // Pointer event handlers for direct mouse/touch
  private bindEvents() {
    const el = this.renderer.domElement;

    const onPointerMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _ray.setFromCamera(_mouse, this.camera);

      if (this.draggedNodeId) {
        const intersectPoint = new THREE.Vector3();
        if (_ray.ray.intersectPlane(this.dragPlane, intersectPoint)) {
          const visual = this.nodeVisuals.get(this.draggedNodeId);
          if (visual) {
            visual.targetPos.copy(intersectPoint.add(this.dragOffset));
            this.onNodePositionChange?.(
              this.draggedNodeId,
              visual.targetPos.x,
              visual.targetPos.y,
              visual.targetPos.z
            );
          }
        }
        return;
      }

      // Check hover
      const interactiveMeshes = Array.from(this.nodeVisuals.values()).map((v) => v.coreMesh);
      const hits = _ray.intersectObjects(interactiveMeshes, false);

      if (hits.length > 0) {
        const hitNodeId = hits[0].object.userData.nodeId;
        if (this.hoveredNodeId !== hitNodeId) {
          this.hoveredNodeId = hitNodeId;
          const node = this.nodeVisuals.get(hitNodeId)?.data || null;
          this.onNodeHover?.(node);
          el.style.cursor = 'grab';
          soundFx.playSelect(580);
        }
      } else {
        if (this.hoveredNodeId) {
          this.hoveredNodeId = null;
          this.onNodeHover?.(null);
          el.style.cursor = 'default';
        }
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // only left click

      const rect = el.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _ray.setFromCamera(_mouse, this.camera);
      const interactiveMeshes = Array.from(this.nodeVisuals.values()).map((v) => v.coreMesh);
      const hits = _ray.intersectObjects(interactiveMeshes, false);

      if (hits.length > 0) {
        const hit = hits[0];
        const hitNodeId = hit.object.userData.nodeId;

        // If in connecting mode:
        if (this.connectingSourceId) {
          if (this.connectingSourceId !== hitNodeId) {
            this.onConnectNodes?.(this.connectingSourceId, hitNodeId);
            soundFx.playConnect();
          }
          this.connectingSourceId = null;
          return;
        }

        // Drag start
        this.draggedNodeId = hitNodeId;
        this.selectedNodeId = hitNodeId;
        this.controls.enabled = false;
        el.style.cursor = 'grabbing';
        soundFx.playGrab();

        this.onNodeSelect?.(this.nodeVisuals.get(hitNodeId)?.data || null);

        this.dragPlane.setFromNormalAndCoplanarPoint(
          this.camera.getWorldDirection(_vecC).negate(),
          hit.point
        );
        this.dragOffset.subVectors(this.nodeVisuals.get(hitNodeId)!.group.position, hit.point);
      } else {
        // Clicked background: deselect
        if (!this.connectingSourceId) {
          this.selectedNodeId = null;
          this.onNodeSelect?.(null);
        }
      }
    };

    const onPointerUp = () => {
      if (this.draggedNodeId) {
        soundFx.playRelease();
        this.draggedNodeId = null;
        this.controls.enabled = true;
        el.style.cursor = 'grab';
      }
    };

    const onResize = () => {
      if (!this.container) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };

    el.addEventListener('mousemove', onPointerMove);
    el.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('resize', onResize);
  }

  // Animation Loop with Software-WebGL Pacing & Smooth Damping
  private startLoop() {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.animFrameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.animFrameId = window.setTimeout(cb, 60);
        }
      };
      this.animFrameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (!this.isRunning) return;

      const delta = Math.min(this.clock.getDelta(), 0.1);
      const time = this.clock.getElapsedTime();

      // 1. Smoothly interpolate node positions toward targets using MathUtils.damp
      this.nodeVisuals.forEach((visual) => {
        visual.group.position.x = THREE.MathUtils.damp(
          visual.group.position.x,
          visual.targetPos.x,
          8,
          delta
        );
        visual.group.position.y = THREE.MathUtils.damp(
          visual.group.position.y,
          visual.targetPos.y,
          8,
          delta
        );
        visual.group.position.z = THREE.MathUtils.damp(
          visual.group.position.z,
          visual.targetPos.z,
          8,
          delta
        );

        // Gentle organic levitation hover
        const floatOffset = Math.sin(time * 2 + visual.targetPos.x) * 0.04;
        visual.coreMesh.position.y = floatOffset;

        // Halo ring rotation
        visual.haloRing.rotation.z += 0.015;

        // Highlight hovered or selected node
        const isHovered = visual.data.id === this.hoveredNodeId;
        const isSelected = visual.data.id === this.selectedNodeId;
        const targetScale = isSelected ? 1.25 : isHovered ? 1.15 : 1.0;

        visual.group.scale.x = THREE.MathUtils.damp(visual.group.scale.x, targetScale, 10, delta);
        visual.group.scale.y = THREE.MathUtils.damp(visual.group.scale.y, targetScale, 10, delta);
        visual.group.scale.z = THREE.MathUtils.damp(visual.group.scale.z, targetScale, 10, delta);
      });

      // 2. Update Link curve endpoints to track moving nodes
      this.linkVisuals.forEach((l) => {
        const src = this.nodeVisuals.get(l.data.source);
        const tgt = this.nodeVisuals.get(l.data.target);
        if (!src || !tgt) return;

        const p1 = src.group.position;
        const p2 = tgt.group.position;

        _vecMid.copy(p1).lerp(p2, 0.5);
        const dist = p1.distanceTo(p2);
        _vecMid.y += Math.min(dist * 0.22, 1.5);

        const curve = new THREE.QuadraticBezierCurve3(p1, _vecMid, p2);
        const pts = curve.getPoints(24);

        const posAttr = l.lineMesh.geometry.attributes.position as THREE.BufferAttribute;
        if (posAttr) {
          for (let i = 0; i < pts.length; i++) {
            posAttr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
          }
          posAttr.needsUpdate = true;
          (l.lineMesh as THREE.Line).computeLineDistances();
        }
      });

      // 3. Update Camera controls
      this.controls.update();

      // 4. Render Scene
      this.renderer.render(this.scene, this.camera);

      // Pacing guard per Three.js guidelines
      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  // Camera presets
  public resetCameraView(preset: 'front' | 'top' | 'angled' | 'focusNode' = 'angled') {
    if (preset === 'top') {
      this.camera.position.set(0, 22, 0.1);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 'front') {
      this.camera.position.set(0, 2, 15);
      this.controls.target.set(0, 1, 0);
    } else if (preset === 'angled') {
      this.camera.position.set(8, 7, 13);
      this.controls.target.set(0, 1, 0);
    } else if (preset === 'focusNode' && this.selectedNodeId) {
      const visual = this.nodeVisuals.get(this.selectedNodeId);
      if (visual) {
        this.controls.target.copy(visual.group.position);
        this.camera.position.set(
          visual.group.position.x + 3,
          visual.group.position.y + 2,
          visual.group.position.z + 5
        );
      }
    }
  }

  // Smooth Camera Zoom
  public zoomCamera(amount: number) {
    const dir = this.camera.getWorldDirection(_vecB);
    this.camera.position.addScaledVector(dir, amount);
    this.controls.update();
    soundFx.playSelect(amount > 0 ? 680 : 520);
  }

  // Smooth Screen / Canvas 3D Orbit Rotation
  public rotateCamera(angleY: number, angleX = 0) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleY);
    if (angleX !== 0) {
      const right = new THREE.Vector3().crossVectors(offset, new THREE.Vector3(0, 1, 0)).normalize();
      offset.applyAxisAngle(right, angleX);
    }
    this.camera.position.copy(this.controls.target).add(offset);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  // Toggle cinematic auto-orbit rotation
  public toggleAutoRotate(): boolean {
    this.controls.autoRotate = !this.controls.autoRotate;
    this.controls.autoRotateSpeed = 1.4;
    return this.controls.autoRotate;
  }

  public isAutoRotating(): boolean {
    return this.controls.autoRotate;
  }

  public setConnectingMode(sourceId: string | null) {
    this.connectingSourceId = sourceId;
    if (this.container) {
      this.container.style.cursor = sourceId ? 'crosshair' : 'default';
    }
  }

  public setSelectedNode(nodeId: string | null) {
    this.selectedNodeId = nodeId;
  }

  public dispose() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    clearTimeout(this.animFrameId);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
