import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import TeacherAvatar from '../TeacherAvatar.jsx'
import AtlasCharacter from './AtlasCharacter.jsx'

function webglAvailable() {
  try {
    // three.js r163+ requires WebGL2: a WebGL1-only context would crash
    // Canvas, so those browsers get the 2D portrait instead.
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

function osReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// Isolated 3D stage for the Atlas classroom only. Falls back to the 2D
// portrait when WebGL is unavailable, and renders a static frame when the
// OS requests reduced motion.
export default function AtlasAvatar3D({ teacher, speaking = false }) {
  const [supported] = useState(() => typeof window !== 'undefined' && webglAvailable())
  const [reducedMotion] = useState(() => osReducedMotion())

  if (!supported) {
    return <TeacherAvatar teacher={teacher} size="xl" animated={false} className="shrink-0" />
  }

  return (
    <div
      className="h-[400px] w-full sm:h-[440px]"
      role="img"
      aria-label={`3D model of ${teacher.name}, ${teacher.field} teacher`}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.3, 6.2], fov: 36 }}
        gl={{ antialias: true, alpha: true }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={({ gl }) => gl.setClearColor('#000000', 0)}
      >
        <hemisphereLight args={['#9fd8ff', '#0a1128', 0.9]} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        <pointLight position={[-3.5, 2, -2.5]} color="#22d3ee" intensity={18} distance={14} />
        <Suspense fallback={null}>
          <AtlasCharacter speaking={speaking} />
        </Suspense>
      </Canvas>
    </div>
  )
}
