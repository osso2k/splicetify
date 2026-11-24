import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

const PALETTE = {
  ink: "#121815",
  forest: "#34473a",
  forestLight: "#536858",
  lime: "#d9f467",
  blue: "#91a5ff",
  skin: "#b8795e",
  skinLight: "#d39473",
}

function physicalMaterial(
  color: THREE.ColorRepresentation,
  roughness: number,
  metalness = 0,
  extra: Partial<THREE.MeshPhysicalMaterialParameters> = {},
) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness, ...extra })
}

function addMesh<T extends THREE.BufferGeometry>(
  parent: THREE.Object3D,
  geometry: T,
  surface: THREE.Material | THREE.Material[],
  position: [number, number, number],
  scale?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geometry, surface)
  mesh.position.set(...position)
  if (scale) mesh.scale.set(...scale)
  parent.add(mesh)
  return mesh
}

function tube(
  parent: THREE.Object3D,
  points: THREE.Vector3[],
  radius: number,
  surface: THREE.Material,
  segments = 28,
) {
  const curve = new THREE.CatmullRomCurve3(points)
  return addMesh(parent, new THREE.TubeGeometry(curve, segments, radius, 8, false), surface, [0, 0, 0])
}

function makeRecordLabelTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext("2d")
  if (!context) return null

  context.fillStyle = PALETTE.lime
  context.fillRect(0, 0, 512, 512)
  context.strokeStyle = "rgba(26, 34, 25, .24)"
  context.lineWidth = 2
  for (let radius = 76; radius < 240; radius += 18) {
    context.beginPath()
    context.arc(256, 256, radius, 0, Math.PI * 2)
    context.stroke()
  }
  context.fillStyle = "#1c241d"
  context.textAlign = "center"
  context.font = "800 72px Avenir Next, Arial, sans-serif"
  context.fillText("SP", 256, 249)
  context.font = "700 20px Avenir Next, Arial, sans-serif"
  context.letterSpacing = "5px"
  context.fillText("SIDE A  ·  33⅓ RPM", 256, 300)
  context.beginPath()
  context.arc(256, 256, 12, 0, Math.PI * 2)
  context.fillStyle = "#131a15"
  context.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeWordmarkTexture(word: string, color = "#d9d5bd") {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 128
  const context = canvas.getContext("2d")
  if (!context) return null
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = color
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.font = "700 48px Arial, sans-serif"
  context.letterSpacing = "8px"
  context.fillText(word, 256, 66)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createRecord(scene: THREE.Scene) {
  const record = new THREE.Group()
  record.position.set(-0.05, 0.04, -1.28)
  record.rotation.set(0.025, -0.025, -0.12)
  scene.add(record)

  const vinyl = physicalMaterial("#121916", 0.25, 0.72, { clearcoat: 0.55, clearcoatRoughness: 0.22 })
  const groove = new THREE.MeshBasicMaterial({ color: "#627268", transparent: true, opacity: 0.24 })
  const labelTexture = makeRecordLabelTexture()
  const label = physicalMaterial("#ffffff", 0.48, 0.04, { map: labelTexture })
  const hub = physicalMaterial("#1b231d", 0.3, 0.62)
  const diskGeometry = new THREE.CylinderGeometry(2.08, 2.08, 0.13, 112)
  const disk = addMesh(record, diskGeometry, vinyl, [0, 0, 0])
  disk.rotation.x = Math.PI / 2
  disk.receiveShadow = true

  const grooves = new THREE.Group()
  grooves.position.z = 0.07
  record.add(grooves)
  for (let index = 0; index < 16; index += 1) {
    const radius = 0.76 + index * 0.078
    addMesh(grooves, new THREE.TorusGeometry(radius, 0.006, 5, 112), groove, [0, 0, index * 0.0003])
  }

  const labelGeometry = new THREE.CylinderGeometry(0.68, 0.68, 0.018, 80)
  const labelDisk = addMesh(record, labelGeometry, [vinyl, label, hub], [0, 0, 0.086])
  labelDisk.rotation.x = Math.PI / 2
  const spindle = addMesh(record, new THREE.CylinderGeometry(0.055, 0.055, 0.025, 32), hub, [0, 0, 0.102])
  spindle.rotation.x = Math.PI / 2

  const halo = new THREE.Group()
  halo.position.set(0, 0.05, -0.08)
  record.add(halo)
  const haloSurface = new THREE.MeshBasicMaterial({ color: "#9eb17b", transparent: true, opacity: 0.12, side: THREE.DoubleSide })
  for (const radius of [2.25, 2.48, 2.72]) {
    addMesh(halo, new THREE.TorusGeometry(radius, 0.009, 4, 120), haloSurface, [0, 0, 0])
  }

  return { record, disk, labelTexture }
}

function createListener(scene: THREE.Scene) {
  const figure = new THREE.Group()
  figure.position.set(0.1, -0.13, 0.18)
  scene.add(figure)

  const cloth = physicalMaterial(PALETTE.forest, 0.76, 0.02, {
    sheen: 0.42,
    sheenColor: new THREE.Color("#536c94"),
    sheenRoughness: 0.72,
  })
  const clothShadow = physicalMaterial("#25352b", 0.78, 0.04, { sheen: 0.2, sheenColor: new THREE.Color(PALETTE.blue) })
  const skin = physicalMaterial(PALETTE.skin, 0.76, 0.02, { clearcoat: 0.08, clearcoatRoughness: 0.7 })
  const skinHighlight = physicalMaterial(PALETTE.skinLight, 0.72)
  const cap = physicalMaterial("#26372d", 0.68, 0.06, { sheen: 0.25, sheenColor: new THREE.Color(PALETTE.lime) })
  const headphones = physicalMaterial("#151b19", 0.24, 0.64, { clearcoat: 0.85, clearcoatRoughness: 0.18 })
  const darkDetail = physicalMaterial("#202a24", 0.32, 0.56)
  const lime = physicalMaterial(PALETTE.lime, 0.34, 0.12, { emissive: PALETTE.lime, emissiveIntensity: 0.08 })
  const blue = physicalMaterial(PALETTE.blue, 0.32, 0.22, { emissive: PALETTE.blue, emissiveIntensity: 0.05 })
  const faceLine = new THREE.MeshBasicMaterial({ color: "#593c35" })
  const gold = physicalMaterial("#c6a96a", 0.24, 0.84, { clearcoat: 0.7 })
  const leather = physicalMaterial("#211d18", 0.34, 0.18, { clearcoat: 0.35 })
  const sneakerRubber = physicalMaterial("#d8d4c8", 0.48, 0.02)
  const sneakerUpper = physicalMaterial("#252d29", 0.43, 0.04, { sheen: 0.3, sheenColor: new THREE.Color("#818779") })

  // A compact, soft-edged jacket gives the silhouette a confident toy-like shape.
  const torso = addMesh(figure, new THREE.CapsuleGeometry(0.62, 0.82, 8, 32), cloth, [0, -0.77, 0], [1.3, 1, 0.8])
  torso.castShadow = true
  const shoulderShape = addMesh(figure, new THREE.SphereGeometry(0.72, 44, 32), cloth, [0, -0.36, 0], [1.17, 0.62, 0.8])
  shoulderShape.castShadow = true
  addMesh(figure, new THREE.TorusGeometry(0.39, 0.14, 16, 44), clothShadow, [0, 0.08, -0.22], [1, 0.84, 0.88])

  // Relaxed sleeve on the left; raised forearm and hand on the right.
  const sleeve = new THREE.CapsuleGeometry(0.17, 0.5, 8, 20)
  const lowArm = addMesh(figure, sleeve, clothShadow, [-0.72, -0.58, 0.03])
  lowArm.rotation.z = 0.25
  const raisedArm = addMesh(figure, sleeve, cloth, [0.72, -0.18, 0.1])
  raisedArm.rotation.z = -0.48
  const forearm = addMesh(figure, new THREE.CapsuleGeometry(0.145, 0.38, 8, 18), cloth, [0.9, 0.35, 0.26])
  forearm.rotation.z = 0.22
  const hand = addMesh(figure, new THREE.SphereGeometry(0.145, 28, 22), skin, [0.79, 0.7, 0.38], [0.85, 1.05, 0.85])
  hand.castShadow = true
  for (let finger = 0; finger < 3; finger += 1) {
    const fingerMesh = addMesh(
      figure,
      new THREE.CapsuleGeometry(0.038, 0.1, 5, 10),
      skinHighlight,
      [0.72 + finger * 0.075, 0.79 + (finger === 1 ? 0.04 : 0), 0.42],
      [1, 1, 0.82],
    )
    fingerMesh.rotation.z = -0.25 + finger * 0.18
  }

  // The hood seam and a small record badge tie the outfit back to Splicetify.
  const drawstring = physicalMaterial("#b8c78e", 0.64)
  for (const x of [-0.11, 0.11]) {
    const cord = addMesh(figure, new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), drawstring, [x, -0.6, 0.55])
    cord.rotation.z = x < 0 ? -0.12 : 0.12
  }
  const badge = addMesh(figure, new THREE.CylinderGeometry(0.1, 0.1, 0.018, 40), lime, [0.38, -0.91, 0.61])
  badge.rotation.x = Math.PI / 2
  addMesh(figure, new THREE.CylinderGeometry(0.035, 0.035, 0.022, 24), darkDetail, [0.38, -0.91, 0.625]).rotation.x = Math.PI / 2

  // Oversized designer jacket details: a clean zip line, structured seams and a woven chest label.
  const zip = addMesh(figure, new THREE.BoxGeometry(0.018, 0.77, 0.022), gold, [0, -1.13, 0.626])
  zip.castShadow = true
  for (const side of [-1, 1]) {
    tube(figure, [new THREE.Vector3(side * 0.44, -0.33, 0.47), new THREE.Vector3(side * 0.51, -0.74, 0.56), new THREE.Vector3(side * 0.48, -1.23, 0.56)], 0.012, clothShadow, 18)
    const cuff = addMesh(figure, new THREE.TorusGeometry(0.145, 0.035, 10, 32), clothShadow, [side * 0.79, -0.52, 0.12], [1, 1.1, 0.92])
    cuff.rotation.z = side < 0 ? 0.22 : -0.48
  }
  const balenciagaTexture = makeWordmarkTexture("BALENCIAGA", "#d0d2c4")
  if (balenciagaTexture) {
    const labelMaterial = new THREE.MeshBasicMaterial({ map: balenciagaTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    const label = addMesh(figure, new THREE.PlaneGeometry(0.42, 0.105), labelMaterial, [-0.31, -0.85, 0.622])
    label.rotation.z = -0.04
  }

  // A dark leather belt wraps the waist; the raised gold LV buckle catches the key light.
  tube(figure, [
    new THREE.Vector3(-0.72, -1.36, 0.24), new THREE.Vector3(-0.58, -1.36, 0.49),
    new THREE.Vector3(-0.28, -1.36, 0.59), new THREE.Vector3(0.28, -1.36, 0.59),
    new THREE.Vector3(0.58, -1.36, 0.49), new THREE.Vector3(0.72, -1.36, 0.24),
  ], 0.052, leather, 36)
  const buckle = addMesh(figure, new THREE.BoxGeometry(0.29, 0.22, 0.055), gold, [0.02, -1.36, 0.642])
  buckle.castShadow = true
  addMesh(figure, new THREE.BoxGeometry(0.19, 0.12, 0.02), leather, [0.02, -1.36, 0.676])
  // Stamped monogram bars give the buckle a small dimensional LV mark.
  addMesh(figure, new THREE.BoxGeometry(0.025, 0.105, 0.018), gold, [-0.025, -1.36, 0.69])
  addMesh(figure, new THREE.BoxGeometry(0.075, 0.022, 0.018), gold, [0.01, -1.405, 0.69])
  addMesh(figure, new THREE.BoxGeometry(0.075, 0.022, 0.018), gold, [0.01, -1.315, 0.69])
  addMesh(figure, new THREE.BoxGeometry(0.025, 0.105, 0.018), gold, [0.07, -1.36, 0.69])

  // Chunky Prada-inspired low tops anchor the lower silhouette with layered soles and triangle plaques.
  const triangleShape = new THREE.Shape()
  triangleShape.moveTo(-0.075, -0.065)
  triangleShape.lineTo(0.075, -0.065)
  triangleShape.lineTo(0, 0.075)
  triangleShape.closePath()
  const triangleGeometry = new THREE.ExtrudeGeometry(triangleShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.006, bevelSegments: 2 })
  for (const side of [-1, 1]) {
    const shoe = new THREE.Group()
    shoe.position.set(side * 0.39, -1.72, 0.11)
    shoe.rotation.y = side * -0.1
    figure.add(shoe)
    addMesh(shoe, new THREE.SphereGeometry(0.25, 32, 22), sneakerRubber, [0, -0.03, 0.08], [1.12, 0.48, 1.48])
    addMesh(shoe, new THREE.SphereGeometry(0.225, 32, 22), sneakerUpper, [0, 0.035, 0.04], [1.02, 0.57, 1.38])
    addMesh(shoe, new THREE.BoxGeometry(0.035, 0.012, 0.22), gold, [0, 0.16, 0.01])
    const plaque = addMesh(shoe, triangleGeometry, gold, [side * 0.19, 0.07, 0.1])
    plaque.rotation.y = side * 0.28
    const pradaTexture = makeWordmarkTexture("PRADA", "#f1eee3")
    if (pradaTexture) {
      addMesh(shoe, new THREE.PlaneGeometry(0.2, 0.048), new THREE.MeshBasicMaterial({ map: pradaTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide }), [0, 0.12, 0.37])
    }
  }

  // Head pivot allows the listener to nod subtly with the beat.
  const headPivot = new THREE.Group()
  headPivot.position.set(0, 0.38, 0)
  figure.add(headPivot)
  const head = new THREE.Group()
  head.position.y = -0.38
  headPivot.add(head)

  const neck = addMesh(head, new THREE.CylinderGeometry(0.2, 0.23, 0.5, 28), skin, [0, 0.18, 0.01])
  neck.castShadow = true
  const face = addMesh(head, new THREE.SphereGeometry(0.67, 56, 44), skin, [0, 0.94, 0.04], [0.89, 1.02, 0.79])
  face.castShadow = true
  addMesh(head, new THREE.SphereGeometry(0.085, 24, 18), skinHighlight, [0.59, 0.88, 0.02], [0.82, 1.08, 0.9])
  addMesh(head, new THREE.SphereGeometry(0.075, 18, 16), skinHighlight, [0, 0.82, 0.62], [0.72, 0.9, 0.6])

  // Curved closed eyes make the pose read as someone listening closely.
  tube(head, [new THREE.Vector3(-0.34, 1.0, 0.5), new THREE.Vector3(-0.23, 0.95, 0.57), new THREE.Vector3(-0.12, 1.0, 0.54)], 0.018, faceLine, 16)
  tube(head, [new THREE.Vector3(0.12, 1.0, 0.54), new THREE.Vector3(0.23, 0.95, 0.57), new THREE.Vector3(0.34, 1.0, 0.5)], 0.018, faceLine, 16)
  tube(head, [new THREE.Vector3(-0.14, 0.64, 0.59), new THREE.Vector3(0, 0.6, 0.66), new THREE.Vector3(0.14, 0.64, 0.59)], 0.015, faceLine, 16)

  // A cuffed knit cap uses the same forest and lime colors as the app.
  const capTop = addMesh(head, new THREE.SphereGeometry(0.59, 48, 34), cap, [0, 1.57, -0.02], [1.08, 0.55, 0.94])
  capTop.castShadow = true
  const capCuff = addMesh(head, new THREE.TorusGeometry(0.53, 0.085, 14, 48), clothShadow, [0, 1.43, 0.025], [1, 1, 0.94])
  capCuff.rotation.x = 0.04
  const cuffPin = addMesh(head, new THREE.SphereGeometry(0.055, 18, 14), lime, [0.37, 1.47, 0.36], [1, 0.7, 0.7])
  cuffPin.material = lime

  // Soft headband with metallic joints, inset cobalt cups and lime ear rings.
  const bandPoints = [
    new THREE.Vector3(-0.7, 0.77, 0.02), new THREE.Vector3(-0.76, 1.34, -0.02),
    new THREE.Vector3(-0.48, 1.82, -0.03), new THREE.Vector3(0.02, 1.97, -0.02),
    new THREE.Vector3(0.52, 1.77, -0.01), new THREE.Vector3(0.73, 1.25, 0.02),
  ]
  tube(head, bandPoints, 0.085, headphones, 48)
  tube(head, [new THREE.Vector3(-0.46, 1.81, 0.04), new THREE.Vector3(0, 1.96, 0.065), new THREE.Vector3(0.46, 1.77, 0.04)], 0.018, blue, 28)

  const cupGeometry = new THREE.SphereGeometry(0.25, 32, 28)
  for (const side of [-1, 1]) {
    const cup = addMesh(head, cupGeometry, headphones, [side * 0.66, 0.82, 0.11], [0.8, 1.24, 0.9])
    cup.castShadow = true
    const ring = addMesh(head, new THREE.TorusGeometry(0.16, 0.022, 10, 36), lime, [side * 0.78, 0.83, 0.29])
    ring.scale.set(0.72, 1.16, 1)
    addMesh(head, new THREE.CircleGeometry(0.11, 32), blue, [side * 0.78, 0.83, 0.295])
    addMesh(head, new THREE.SphereGeometry(0.045, 16, 12), headphones, [side * 0.71, 0.83, 0.33])
  }

  return { figure, headPivot }
}

function createDust(scene: THREE.Scene) {
  const count = 30
  const geometry = new THREE.SphereGeometry(0.018, 7, 6)
  const surface = new THREE.MeshBasicMaterial({ color: PALETTE.lime, transparent: true, opacity: 0.65 })
  const dust = new THREE.InstancedMesh(geometry, surface, count)
  const dummy = new THREE.Object3D()
  const particles: { x: number; y: number; z: number; phase: number; scale: number }[] = []

  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963
    const radius = 1.7 + (index % 7) * 0.11
    const particle = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.72,
      z: -0.4 + (index % 4) * 0.16,
      phase: index * 1.73,
      scale: 0.5 + (index % 4) * 0.22,
    }
    particles.push(particle)
    dummy.position.set(particle.x, particle.y, particle.z)
    dummy.scale.setScalar(particle.scale)
    dummy.updateMatrix()
    dust.setMatrixAt(index, dummy.matrix)
  }
  dust.instanceMatrix.needsUpdate = true
  scene.add(dust)
  return { dust, dummy, particles }
}

function createSoundHalos(scene: THREE.Scene) {
  const group = new THREE.Group()
  group.position.set(0.02, 0.35, -0.56)
  scene.add(group)
  const surfaces = [
    new THREE.MeshBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: PALETTE.lime, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false }),
  ]
  const rings = [1.34, 1.78, 2.18].map((radius, index) => {
    const mesh = addMesh(group, new THREE.TorusGeometry(radius, index === 0 ? 0.018 : 0.011, 5, 96), surfaces[index], [0, 0, index * -0.012])
    mesh.scale.y = 0.92
    return mesh
  })
  return { group, rings, surfaces }
}

const ListeningScene = () => {
  const hostRef = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host || fallback) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" })
    } catch {
      setFallback(true)
      return
    }

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2("#17211b", 0.045)
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40)
    camera.position.set(0, 0.16, 8.7)
    camera.lookAt(0, 0.1, 0)

    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.18
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.domElement.className = "listening-canvas"
    renderer.domElement.setAttribute("aria-hidden", "true")
    host.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight("#cedcc5", "#131a16", 0.92))
    const keyLight = new THREE.DirectionalLight("#ffe6c8", 3.3)
    keyLight.position.set(-3.5, 5.2, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(768, 768)
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 18
    keyLight.shadow.camera.left = -4.5
    keyLight.shadow.camera.right = 4.5
    keyLight.shadow.camera.top = 4.5
    keyLight.shadow.camera.bottom = -4.5
    keyLight.shadow.bias = -0.00012
    scene.add(keyLight)

    const blueRim = new THREE.PointLight("#607dff", 150, 11, 2)
    blueRim.position.set(3.1, 1.1, 2.8)
    scene.add(blueRim)
    const limeRim = new THREE.PointLight("#bbeb54", 78, 9, 2)
    limeRim.position.set(-2.8, -1.25, 2.4)
    scene.add(limeRim)
    const warmEdge = new THREE.PointLight("#e2a06d", 50, 8, 2)
    warmEdge.position.set(0.3, 3.8, -1.4)
    scene.add(warmEdge)

    const { record } = createRecord(scene)
    const { figure, headPivot } = createListener(scene)
    const { dust, dummy, particles } = createDust(scene)
    const { group: soundHalos, rings: haloRings, surfaces: haloSurfaces } = createSoundHalos(scene)
    figure.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true
    })

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const timer = new THREE.Timer()
    timer.connect(document)
    const pointerTarget = new THREE.Vector2()
    const pointerCurrent = new THREE.Vector2()

    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      renderer.render(scene, camera)
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion.matches) return
      const rect = host.getBoundingClientRect()
      pointerTarget.set(
        THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
        THREE.MathUtils.clamp(1 - ((event.clientY - rect.top) / rect.height) * 2, -1, 1),
      )
    }
    const resetPointer = () => pointerTarget.set(0, 0)
    host.addEventListener("pointermove", onPointerMove, { passive: true })
    host.addEventListener("pointerleave", resetPointer, { passive: true })

    const animate = () => {
      timer.update()
      const delta = timer.getDelta()
      const elapsed = timer.getElapsed()
      pointerCurrent.x = THREE.MathUtils.damp(pointerCurrent.x, pointerTarget.x, 2.4, delta)
      pointerCurrent.y = THREE.MathUtils.damp(pointerCurrent.y, pointerTarget.y, 2.4, delta)

      figure.position.y = -0.13 + Math.sin(elapsed * 1.15) * 0.055
      figure.rotation.y = Math.sin(elapsed * 0.34) * 0.035 + pointerCurrent.x * 0.1
      figure.rotation.x = -pointerCurrent.y * 0.035
      headPivot.rotation.z = Math.sin(elapsed * 1.4) * 0.018 - pointerCurrent.x * 0.035
      headPivot.rotation.y = pointerCurrent.x * 0.06
      record.rotation.z = -0.12 + elapsed * 0.23
      soundHalos.rotation.z = Math.sin(elapsed * 0.14) * 0.035
      soundHalos.scale.setScalar(1 + Math.sin(elapsed * 1.4) * 0.025)
      haloSurfaces.forEach((surface, index) => {
        surface.opacity = [0.26, 0.16, 0.11][index] + Math.sin(elapsed * 1.65 - index * 0.65) * 0.045
      })
      haloRings.forEach((ring, index) => { ring.rotation.z = elapsed * (index % 2 ? -0.04 : 0.035) })
      blueRim.intensity = 145 + Math.sin(elapsed * 0.9) * 14
      camera.position.x = THREE.MathUtils.damp(camera.position.x, pointerCurrent.x * 0.14, 1.8, delta)
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.16 + pointerCurrent.y * 0.1, 1.8, delta)
      camera.lookAt(pointerCurrent.x * 0.07, 0.1 + pointerCurrent.y * 0.05, 0)

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index]
        dummy.position.set(particle.x, particle.y + Math.sin(elapsed * 0.55 + particle.phase) * 0.11, particle.z)
        dummy.scale.setScalar(particle.scale * (0.78 + (Math.sin(elapsed * 1.4 + particle.phase) + 1) * 0.12))
        dummy.updateMatrix()
        dust.setMatrixAt(index, dummy.matrix)
      }
      dust.instanceMatrix.needsUpdate = true
      renderer.render(scene, camera)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !reducedMotion.matches) {
        timer.reset()
        renderer.setAnimationLoop(animate)
      } else {
        renderer.setAnimationLoop(null)
        renderer.render(scene, camera)
      }
    }, { threshold: 0.05 })
    observer.observe(host)

    const updateMotionPreference = () => {
      if (reducedMotion.matches) {
        renderer.setAnimationLoop(null)
        pointerTarget.set(0, 0)
        pointerCurrent.set(0, 0)
        renderer.render(scene, camera)
      } else if (host.getBoundingClientRect().bottom > 0 && host.getBoundingClientRect().top < window.innerHeight) {
        timer.reset()
        renderer.setAnimationLoop(animate)
      }
    }
    reducedMotion.addEventListener("change", updateMotionPreference)

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      reducedMotion.removeEventListener("change", updateMotionPreference)
      host.removeEventListener("pointermove", onPointerMove)
      host.removeEventListener("pointerleave", resetPointer)
      renderer.setAnimationLoop(null)
      timer.dispose()
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      const textures = new Set<THREE.Texture>()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry)
          const assigned = Array.isArray(object.material) ? object.material : [object.material]
          assigned.forEach((surface) => {
            materials.add(surface)
            Object.values(surface).forEach((value) => {
              if (value instanceof THREE.Texture) textures.add(value)
            })
          })
        }
      })
      geometries.forEach((geometry) => geometry.dispose())
      textures.forEach((texture) => texture.dispose())
      materials.forEach((surface) => surface.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [fallback])

  return (
    <div className={`listening-scene${fallback ? " listening-scene--fallback" : ""}`} ref={hostRef} aria-hidden="true">
      {fallback && <div className="figure-fallback"><span className="fallback-vinyl" /><span className="fallback-head" /><span className="fallback-body" /><span className="fallback-band" /></div>}
    </div>
  )
}

export default ListeningScene
