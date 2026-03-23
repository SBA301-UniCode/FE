import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { isHlsUrl } from './ManageCourseVideosHelpers'

export default function HlsPreviewVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return undefined
    let hls: Hls | null = null
    if (isHlsUrl(src)) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = src }
      else if (Hls.isSupported()) { hls = new Hls({ enableWorker: true }); hls.loadSource(src); hls.attachMedia(video) }
      else { video.src = src }
    } else { video.src = src }
    return () => { if (hls) hls.destroy() }
  }, [src])
  if (!src) return null
  return <video ref={videoRef} controls preload="metadata" playsInline className={className} />
}
