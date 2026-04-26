export default function VideoPlaceholder({ title }: { title: string }) {
  return (
    <div className="w-full aspect-video rounded-xl border border-neutral-800 bg-neutral-950 flex flex-col items-center justify-center gap-3">
      <div className="w-14 h-14 rounded-full border border-neutral-700 flex items-center justify-center">
        <svg className="w-6 h-6 text-neutral-500 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <p className="text-xs text-neutral-600">{title} demo coming soon</p>
    </div>
  )
}
