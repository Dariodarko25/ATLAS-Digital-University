import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshStandardMaterial } from 'three'

// ---------------------------------------------------------------------------
// Procedural Atlas bust — honest scope note.
//
// This is a stylized prototype assembled from Three.js primitives (spheres,
// capsules, torus, cylinders), NOT a professional 3D human model. It has no
// scanned sculpt, no rigged skeleton, no facial morph targets, and no PBR
// skin texturing. It is a placeholder that holds the real stage, lighting,
// and animation architecture so a production GLB can drop into
// AtlasAvatar3D later with no classroom changes.
// ---------------------------------------------------------------------------

const SKIN = '#7c4a2d'
const SKIN_DARK = '#5f3720'
const HAIR = '#161210'
const UNIFORM = '#1b2a5e'
const UNIFORM_DARK = '#101a40'
const TRIM = '#22d3ee'
const GLASS = '#0b1220'

// One shared emissive material so every cyan trim pulses in sync. Module
// scope: only one Atlas instance ever renders, and the frame loop (not React
// state) owns its mutation.
const trimMaterial = new MeshStandardMaterial({
  color: '#0b2a33',
  emissive: TRIM,
  emissiveIntensity: 1.5,
  roughness: 0.4,
  metalness: 0.1,
})

export default function AtlasCharacter({ speaking = false }) {
  const body = useRef(null)
  const torso = useRef(null)
  const head = useRef(null)
  const jaw = useRef(null)
  const eyes = useRef(null)
  const jawOpen = useRef(0)


  useFrame((state) => {
    const t = state.clock.elapsedTime
    const breath = Math.sin(t * 1.6)

    if (body.current) {
      body.current.rotation.y = 0.07 * Math.sin(t * 0.35)
      body.current.position.y = 0.03 * Math.sin(t * 1.6 + 0.5)
      // Smooth entrance: grow from 85% over the first 1.2s.
      const k = Math.min(1, t / 1.2)
      const eased = 1 - Math.pow(1 - k, 3)
      body.current.scale.setScalar(0.85 + 0.15 * eased)
    }
    if (torso.current) {
      torso.current.scale.set(1 + 0.012 * breath, 1 + 0.018 * breath, 1 + 0.012 * breath)
      torso.current.position.y = -0.5 + 0.02 * breath
    }
    if (head.current) {
      head.current.rotation.y = 0.14 * Math.sin(t * 0.5)
      head.current.rotation.x = 0.05 * Math.sin(t * 0.7 + 1)
      head.current.rotation.z = 0.03 * Math.sin(t * 0.4 + 0.5)
    }
    if (eyes.current) {
      eyes.current.scale.y = t % 4.2 < 0.12 ? 0.08 : 1
    }

    // Jaw: procedural speech bob while voice playback runs.
    // Lip-sync upgrade path: drive jawOpen from real viseme amplitudes
    // (Meta AI audio analysis) or morphTargetInfluences on a skinned GLB
    // instead of this oscillator. The `speaking` prop contract stays.
    const target = speaking ? 0.5 + 0.5 * Math.sin(t * 9) : 0
    jawOpen.current += (target - jawOpen.current) * 0.35
    if (jaw.current) jaw.current.rotation.x = jawOpen.current * 0.32

    trimMaterial.emissiveIntensity = 1.4 + 0.4 * Math.sin(t * 2)
  })

  const skin = { color: SKIN, roughness: 0.6, metalness: 0 }
  const uniform = { color: UNIFORM, roughness: 0.55, metalness: 0.15 }

  return (
    <group ref={body}>
      {/* ---------- torso ---------- */}
      <group ref={torso} position={[0, -0.5, 0]}>
        <mesh position={[0, 0, 0]} scale={[1.12, 1, 0.78]}>
          <capsuleGeometry args={[0.62, 0.9, 8, 24]} />
          <meshStandardMaterial {...uniform} />
        </mesh>
        {/* collar */}
        <mesh position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.3, 0.37, 0.28, 24]} />
          <meshStandardMaterial color={UNIFORM_DARK} roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.33, 0.025, 12, 40]} />
          <primitive object={trimMaterial} attach="material" />
        </mesh>
        {/* chest piping */}
        <mesh position={[-0.18, 0.05, 0.47]} rotation={[0, 0, 0.18]}>
          <boxGeometry args={[0.05, 0.7, 0.02]} />
          <primitive object={trimMaterial} attach="material" />
        </mesh>
        <mesh position={[0.18, 0.05, 0.47]} rotation={[0, 0, -0.18]}>
          <boxGeometry args={[0.05, 0.7, 0.02]} />
          <primitive object={trimMaterial} attach="material" />
        </mesh>
        {/* chest emblem */}
        <mesh position={[0, 0.22, 0.485]}>
          <circleGeometry args={[0.09, 24]} />
          <primitive object={trimMaterial} attach="material" />
        </mesh>
        {/* shoulders */}
        <mesh position={[-0.74, 0.48, 0]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.24, 24, 18]} />
          <meshStandardMaterial color={UNIFORM_DARK} roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.74, 0.48, 0]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.24, 24, 18]} />
          <meshStandardMaterial color={UNIFORM_DARK} roughness={0.6} metalness={0.1} />
        </mesh>
        {/* arms + hands */}
        <mesh position={[-0.88, -0.12, 0.02]} rotation={[0, 0, 0.22]}>
          <capsuleGeometry args={[0.15, 0.62, 6, 16]} />
          <meshStandardMaterial {...uniform} />
        </mesh>
        <mesh position={[0.88, -0.12, 0.02]} rotation={[0, 0, -0.22]}>
          <capsuleGeometry args={[0.15, 0.62, 6, 16]} />
          <meshStandardMaterial {...uniform} />
        </mesh>
        <mesh position={[-0.97, -0.58, 0.04]}>
          <sphereGeometry args={[0.16, 20, 16]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh position={[0.97, -0.58, 0.04]}>
          <sphereGeometry args={[0.16, 20, 16]} />
          <meshStandardMaterial {...skin} />
        </mesh>
      </group>

      {/* ---------- neck + head ---------- */}
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.15, 0.17, 0.3, 20]} />
        <meshStandardMaterial color={SKIN_DARK} roughness={0.65} metalness={0} />
      </mesh>

      <group ref={head} position={[0, 1.02, 0]}>
        <mesh scale={[0.94, 1.06, 0.98]}>
          <sphereGeometry args={[0.42, 32, 24]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        {/* short hair cap */}
        <mesh position={[0, 0.05, -0.04]} scale={[0.97, 1.0, 1.0]}>
          <sphereGeometry args={[0.445, 32, 24, 0, Math.PI * 2, 0, 1.85]} />
          <meshStandardMaterial color={HAIR} roughness={0.9} metalness={0} />
        </mesh>
        {/* eyes (blink as one group) */}
        <group ref={eyes} position={[0, 0.06, 0]}>
          <mesh position={[-0.155, 0, 0.355]}>
            <sphereGeometry args={[0.085, 20, 16]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.35} metalness={0} />
          </mesh>
          <mesh position={[0.155, 0, 0.355]}>
            <sphereGeometry args={[0.085, 20, 16]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.35} metalness={0} />
          </mesh>
          <mesh position={[-0.155, 0, 0.425]}>
            <sphereGeometry args={[0.04, 16, 12]} />
            <meshStandardMaterial color="#1a1210" roughness={0.25} metalness={0} />
          </mesh>
          <mesh position={[0.155, 0, 0.425]}>
            <sphereGeometry args={[0.04, 16, 12]} />
            <meshStandardMaterial color="#1a1210" roughness={0.25} metalness={0} />
          </mesh>
        </group>
        {/* brows */}
        <mesh position={[-0.155, 0.235, 0.36]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.17, 0.04, 0.05]} />
          <meshStandardMaterial color={HAIR} roughness={0.9} metalness={0} />
        </mesh>
        <mesh position={[0.155, 0.235, 0.36]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.17, 0.04, 0.05]} />
          <meshStandardMaterial color={HAIR} roughness={0.9} metalness={0} />
        </mesh>
        {/* nose + ears */}
        <mesh position={[0, -0.06, 0.415]} scale={[0.8, 1.1, 0.9]}>
          <sphereGeometry args={[0.055, 16, 12]} />
          <meshStandardMaterial color={SKIN_DARK} roughness={0.65} metalness={0} />
        </mesh>
        <mesh position={[-0.4, -0.02, -0.02]} scale={[0.6, 1, 0.8]}>
          <sphereGeometry args={[0.075, 14, 12]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh position={[0.4, -0.02, -0.02]} scale={[0.6, 1, 0.8]}>
          <sphereGeometry args={[0.075, 14, 12]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        {/* technological glasses */}
        <mesh position={[-0.155, 0.06, 0.375]}>
          <torusGeometry args={[0.125, 0.02, 12, 32]} />
          <meshStandardMaterial color={GLASS} roughness={0.25} metalness={0.6} />
        </mesh>
        <mesh position={[0.155, 0.06, 0.375]}>
          <torusGeometry args={[0.125, 0.02, 12, 32]} />
          <meshStandardMaterial color={GLASS} roughness={0.25} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.06, 0.375]}>
          <boxGeometry args={[0.09, 0.025, 0.025]} />
          <meshStandardMaterial color={GLASS} roughness={0.25} metalness={0.6} />
        </mesh>
        <mesh position={[-0.34, 0.06, 0.18]}>
          <boxGeometry args={[0.03, 0.03, 0.34]} />
          <meshStandardMaterial color={GLASS} roughness={0.25} metalness={0.6} />
        </mesh>
        <mesh position={[0.34, 0.06, 0.18]}>
          <boxGeometry args={[0.03, 0.03, 0.34]} />
          <meshStandardMaterial color={GLASS} roughness={0.25} metalness={0.6} />
        </mesh>
        {/* jaw (lip-sync pivot) */}
        <group ref={jaw} position={[0, -0.1, 0]}>
          <mesh position={[0, -0.14, 0.06]} scale={[0.78, 0.62, 0.72]}>
            <sphereGeometry args={[0.3, 24, 18]} />
            <meshStandardMaterial {...skin} />
          </mesh>
          <mesh position={[0, -0.16, 0.33]} rotation={[0, 0, 3.51]}>
            <torusGeometry args={[0.1, 0.018, 10, 24, 2.4]} />
            <meshStandardMaterial color="#4a2320" roughness={0.7} metalness={0} />
          </mesh>
        </group>
      </group>

      {/* ---------- hologram beam + pedestal ---------- */}
      <mesh position={[0, -1.55, 0]}>
        <cylinderGeometry args={[0.45, 0.8, 0.4, 32, 1, true]} />
        <meshStandardMaterial color={TRIM} transparent opacity={0.12} roughness={0.4} metalness={0} side={2} />
      </mesh>
      <mesh position={[0, -1.82, 0]}>
        <cylinderGeometry args={[1.0, 1.15, 0.14, 40]} />
        <meshStandardMaterial color={UNIFORM_DARK} roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, -1.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.03, 12, 64]} />
        <primitive object={trimMaterial} attach="material" />
      </mesh>
    </group>
  )
}
