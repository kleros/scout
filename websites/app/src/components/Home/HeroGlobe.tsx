import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'

const Viewport = styled.div`
  position: relative;
  width: min(100%, 640px);
  height: clamp(116px, 17vw, 164px);
  margin: 14px auto 0;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.9) 6%,
    rgba(0, 0, 0, 1) 94%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-image: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.9) 6%,
    rgba(0, 0, 0, 1) 94%,
    rgba(0, 0, 0, 0) 100%
  );
`

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`

type DotKind = 'ocean' | 'land' | 'coast'

interface SurfaceDot {
  x: number
  y: number
  z: number
  kind: DotKind
}

interface ProjectedDot {
  projectedX: number
  projectedY: number
  depth: number
  kind: DotKind
}

type Point2D = readonly [number, number]
type Polygon = readonly Point2D[]

const INITIAL_ROTATION = -Math.PI / 4.1
const ROTATION_SPEED = 0.000018
const TILT_X = (73 * Math.PI) / 180
const MAX_FPS = 24
const LATITUDE_STEP = 4.2
const BASE_SURFACE_STEP = 4.8
const MIN_LATITUDE_COS = 0.4
const OCEAN_ROW_INTERVAL = 3
const OCEAN_COLUMN_INTERVAL = 4
const DOT_RADIUS = 1.22
const COS_TILT_X = Math.cos(TILT_X)
const SIN_TILT_X = Math.sin(TILT_X)

const CONTINENT_POLYGONS: readonly Polygon[] = [
  [
    [-168, 72],
    [-150, 70],
    [-139, 62],
    [-130, 56],
    [-125, 48],
    [-124, 40],
    [-117, 33],
    [-108, 27],
    [-98, 21],
    [-88, 18],
    [-81, 21],
    [-77, 28],
    [-72, 40],
    [-64, 48],
    [-60, 54],
    [-65, 60],
    [-80, 64],
    [-96, 70],
    [-121, 75],
    [-146, 77],
  ],
  [
    [-60, 82],
    [-44, 81],
    [-28, 75],
    [-30, 66],
    [-46, 60],
    [-58, 64],
    [-63, 74],
  ],
  [
    [-81, 12],
    [-71, 10],
    [-64, 3],
    [-60, -6],
    [-58, -16],
    [-60, -27],
    [-65, -38],
    [-71, -50],
    [-62, -56],
    [-52, -48],
    [-45, -34],
    [-43, -15],
    [-48, -2],
    [-58, 8],
    [-71, 13],
  ],
  [
    [-11, 72],
    [7, 71],
    [23, 66],
    [34, 58],
    [35, 50],
    [26, 46],
    [15, 45],
    [5, 43],
    [-5, 45],
    [-11, 52],
    [-13, 61],
  ],
  [
    [-18, 37],
    [-5, 36],
    [10, 34],
    [24, 31],
    [34, 21],
    [38, 7],
    [35, -8],
    [30, -19],
    [22, -29],
    [13, -34],
    [4, -35],
    [-4, -30],
    [-10, -18],
    [-14, -3],
    [-15, 12],
    [-12, 27],
  ],
  [
    [35, 72],
    [60, 72],
    [82, 69],
    [104, 64],
    [123, 58],
    [139, 53],
    [153, 46],
    [155, 37],
    [147, 30],
    [135, 24],
    [123, 21],
    [111, 18],
    [98, 18],
    [87, 22],
    [77, 26],
    [67, 31],
    [57, 37],
    [48, 47],
    [40, 57],
  ],
  [
    [67, 28],
    [81, 30],
    [92, 27],
    [102, 21],
    [109, 14],
    [110, 6],
    [103, 2],
    [96, 3],
    [89, 10],
    [84, 18],
    [77, 25],
  ],
  [
    [111, -11],
    [124, -14],
    [137, -18],
    [151, -28],
    [151, -38],
    [142, -44],
    [128, -43],
    [117, -36],
    [111, -25],
  ],
] as const

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

const createDot = (latitude: number, longitude: number, kind: DotKind): SurfaceDot => {
  const latitudeRadians = toRadians(latitude)
  const longitudeRadians = toRadians(longitude)
  const cosLatitude = Math.cos(latitudeRadians)

  return {
    x: cosLatitude * Math.sin(longitudeRadians),
    y: Math.sin(latitudeRadians),
    z: cosLatitude * Math.cos(longitudeRadians),
    kind,
  }
}

const pointInPolygon = (point: Point2D, polygon: Polygon) => {
  let isInside = false
  const [pointX, pointY] = point

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [currentX, currentY] = polygon[index]
    const [previousX, previousY] = polygon[previous]

    const intersects =
      currentY > pointY !== previousY > pointY &&
      pointX <
        ((previousX - currentX) * (pointY - currentY)) / (previousY - currentY) + currentX

    if (intersects) isInside = !isInside
  }

  return isInside
}

const distanceToSegment = (point: Point2D, start: Point2D, end: Point2D) => {
  const [pointX, pointY] = point
  const [startX, startY] = start
  const [endX, endY] = end
  const dx = endX - startX
  const dy = endY - startY

  if (!dx && !dy) {
    return Math.hypot(pointX - startX, pointY - startY)
  }

  const interpolation = Math.max(
    0,
    Math.min(1, ((pointX - startX) * dx + (pointY - startY) * dy) / (dx * dx + dy * dy)),
  )

  const nearestX = startX + dx * interpolation
  const nearestY = startY + dy * interpolation

  return Math.hypot(pointX - nearestX, pointY - nearestY)
}

const distanceToPolygonEdge = (point: Point2D, polygon: Polygon) => {
  let minimumDistance = Infinity

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]
    const next = polygon[(index + 1) % polygon.length]
    minimumDistance = Math.min(minimumDistance, distanceToSegment(point, current, next))
  }

  return minimumDistance
}

const SURFACE_DOTS: SurfaceDot[] = (() => {
  const dots: SurfaceDot[] = []

  let rowIndex = 0
  for (let latitude = -58; latitude <= 78; latitude += LATITUDE_STEP) {
    const latitudeCos = Math.max(MIN_LATITUDE_COS, Math.cos(toRadians(latitude)))
    const longitudeStep = BASE_SURFACE_STEP / latitudeCos
    const longitudeOffset = rowIndex % 2 === 0 ? 0 : longitudeStep * 0.5

    let columnIndex = 0
    for (
      let longitude = -180 + longitudeOffset;
      longitude < 180;
      longitude += longitudeStep, columnIndex += 1
    ) {
      const point: Point2D = [longitude, latitude]
      const containingPolygon = CONTINENT_POLYGONS.find((polygon) => pointInPolygon(point, polygon))

      if (containingPolygon) {
        const edgeDistance = distanceToPolygonEdge(point, containingPolygon)
        dots.push(createDot(latitude, longitude, edgeDistance < 2.8 ? 'coast' : 'land'))
        continue
      }

      if (
        rowIndex % OCEAN_ROW_INTERVAL === 0 &&
        columnIndex % OCEAN_COLUMN_INTERVAL === 0 &&
        latitude <= 72
      ) {
        dots.push(createDot(latitude, longitude, 'ocean'))
      }
    }

    rowIndex += 1
  }

  return dots
})()

const isProjectedDot = (dot: ProjectedDot | null): dot is ProjectedDot => dot !== null

const projectDot = (
  dot: SurfaceDot,
  radius: number,
  centerX: number,
  centerY: number,
  perspective: number,
  cosRotation: number,
  sinRotation: number,
  viewportHeight: number,
): ProjectedDot | null => {
  const rotatedX = dot.x * cosRotation + dot.z * sinRotation
  const rotatedZ = dot.z * cosRotation - dot.x * sinRotation

  const tiltedY = dot.y * COS_TILT_X - rotatedZ * SIN_TILT_X
  const tiltedZ = dot.y * SIN_TILT_X + rotatedZ * COS_TILT_X

  if (tiltedZ < 0.04) return null

  const scale = perspective / (perspective - tiltedZ * radius * 0.82)
  const projectedX = centerX + rotatedX * radius * scale
  const projectedY = centerY + tiltedY * radius * scale

  if (projectedY < -18 || projectedY > viewportHeight + 12) return null

  return {
    projectedX,
    projectedY,
    depth: (tiltedZ + 1) / 2,
    kind: dot.kind,
  }
}

const drawGlobe = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  rotation: number,
) => {
  context.clearRect(0, 0, width, height)

  const radius = Math.max(height * 1.32, Math.min(width * 0.32, 208))
  const centerX = width / 2
  const centerY = radius
  const perspective = radius * 2.35
  const currentRotation = rotation + INITIAL_ROTATION
  const cosRotation = Math.cos(currentRotation)
  const sinRotation = Math.sin(currentRotation)

  const projectedDots = SURFACE_DOTS.map((dot) =>
    projectDot(dot, radius, centerX, centerY, perspective, cosRotation, sinRotation, height),
  )
    .filter(isProjectedDot)
    .sort((left, right) => left.depth - right.depth)

  context.save()
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.clip()

  const shellGradient = context.createRadialGradient(
    centerX,
    centerY - radius * 0.94,
    radius * 0.08,
    centerX,
    centerY,
    radius,
  )
  shellGradient.addColorStop(0, 'rgba(120, 170, 235, 0.16)')
  shellGradient.addColorStop(0.28, 'rgba(24, 41, 68, 0.2)')
  shellGradient.addColorStop(0.62, 'rgba(6, 10, 16, 0.08)')
  shellGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

  context.fillStyle = shellGradient
  context.fillRect(centerX - radius, 0, radius * 2, height)

  const bodyShade = context.createLinearGradient(0, centerY - radius, 0, height)
  bodyShade.addColorStop(0, 'rgba(18, 31, 52, 0.16)')
  bodyShade.addColorStop(0.5, 'rgba(3, 6, 10, 0.08)')
  bodyShade.addColorStop(1, 'rgba(0, 0, 0, 0)')

  context.fillStyle = bodyShade
  context.fillRect(centerX - radius, 0, radius * 2, height)

  projectedDots.forEach((dot) => {
    context.beginPath()
    context.arc(dot.projectedX, dot.projectedY, DOT_RADIUS, 0, Math.PI * 2)

    context.fillStyle =
      dot.kind === 'coast'
        ? `rgba(214, 232, 255, ${Math.min(0.48 + dot.depth * 0.34, 0.92)})`
        : dot.kind === 'land'
          ? `rgba(180, 212, 248, ${Math.min(0.32 + dot.depth * 0.28, 0.76)})`
          : `rgba(132, 160, 194, ${Math.min(0.06 + dot.depth * 0.1, 0.2)})`

    context.fill()
  })

  context.restore()

  context.save()
  context.beginPath()
  context.arc(centerX, centerY, radius - 0.6, Math.PI * 1.01, Math.PI * 1.99)
  context.strokeStyle = 'rgba(172, 204, 240, 0.18)'
  context.lineWidth = 1.2
  context.shadowBlur = 12
  context.shadowColor = 'rgba(126, 172, 235, 0.12)'
  context.stroke()
  context.restore()
}

const HeroGlobe: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    let frameId = 0
    let startTime = 0
    let lastFrameTime = 0
    let width = 0
    let height = 0
    let disposed = false
    let isVisible = true

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect()
      const nextWidth = Math.round(rect.width)
      const nextHeight = Math.round(rect.height)

      if (!nextWidth || !nextHeight) return

      width = nextWidth
      height = nextHeight

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(nextWidth * dpr)
      canvas.height = Math.round(nextHeight * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const render = (rotation: number) => {
      if (!width || !height) return
      drawGlobe(context, width, height, rotation)
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const animate = (time: number) => {
      if (disposed) return
      if (!startTime) startTime = time

      if (!lastFrameTime || time - lastFrameTime >= 1000 / MAX_FPS) {
        lastFrameTime = time
        render((time - startTime) * ROTATION_SPEED)
      }

      frameId = window.requestAnimationFrame(animate)
    }

    const startAnimation = () => {
      if (disposed || mediaQuery.matches || !isVisible || frameId) return
      frameId = window.requestAnimationFrame(animate)
    }

    const stopAnimation = () => {
      if (!frameId) return
      window.cancelAnimationFrame(frameId)
      frameId = 0
    }

    syncSize()

    if (mediaQuery.matches) {
      render(0)
    } else {
      startAnimation()
    }

    let observer: IntersectionObserver | null = null

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting

          if (isVisible) {
            startAnimation()
          } else {
            stopAnimation()
          }
        },
        { threshold: 0.01 },
      )

      observer.observe(canvas)
    }

    const handleResize = () => {
      syncSize()
      if (mediaQuery.matches) {
        render(0)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      disposed = true
      observer?.disconnect()
      stopAnimation()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <Viewport aria-hidden="true">
      <Canvas ref={canvasRef} />
    </Viewport>
  )
}

export default HeroGlobe
