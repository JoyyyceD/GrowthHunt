'use client'

import { useState } from 'react'
import EmailForm from '@/components/EmailForm'

interface Tile {
  slug: string
  name: string
  hook: string
  color: string
  x: number      // left %
  y: number      // top %
  rotate: number // degrees
}

// 25 feature tiles scattered around the center card (50%, 46%)
// Center exclusion zone: ~37–63% x, ~34–58% y
const TILES: Tile[] = [
  // — Top —
  { slug: 'reddit-growth',       name: 'Reddit Growth',    hook: 'Automated Reddit account matrix',       color: '#B45309', x: 10, y: 6,  rotate: -5 },
  { slug: 'youtube-discovery',   name: 'YouTube',          hook: '10 matched YouTubers, instantly',       color: '#CC0000', x: 28, y: 3,  rotate:  4 },
  { slug: 'listing-bot',         name: 'ListingBot',       hook: 'Submit to every directory, auto',       color: '#0F172A', x: 47, y: 8,  rotate: -2 },
  { slug: 'viral-sense',         name: 'Viral Sense',      hook: 'Decode what goes viral on Instagram',   color: '#DC2626', x: 66, y: 5,  rotate:  3 },
  { slug: 'micro-launch',        name: 'MicroLaunch',      hook: 'One-click OPC community launch',        color: '#1D4ED8', x: 84, y: 9,  rotate: -6 },
  { slug: 'ai-startup-playbook', name: 'AI Playbook',      hook: 'Hard-won lessons from AI founders',    color: '#7C3AED', x: 93, y: 20, rotate:  4 },

  // — Right —
  { slug: 'reddit-keyword',      name: 'KW Alerts',        hook: 'Brand mention notifications',           color: '#0F766E', x: 74, y: 30, rotate: -4 },
  { slug: 'reddit-pain-points',  name: 'Pain Points',      hook: 'See exactly what users complain about', color: '#BE185D', x: 87, y: 42, rotate:  5 },
  { slug: 'similar-creators',    name: 'Similar Creators', hook: 'Expand from your best partner',         color: '#9D174D', x: 80, y: 54, rotate: -3 },
  { slug: 'tiktok-discovery',    name: 'TikTok',           hook: "Creators before they're expensive",    color: '#111827', x: 73, y: 66, rotate:  4 },
  { slug: 'instagram-discovery', name: 'Instagram',        hook: "Find your audience's creators",         color: '#C13584', x: 88, y: 68, rotate: -2 },

  // — Bottom-right —
  { slug: 'competitor-critics',  name: 'Critics Finder',   hook: 'Find unhappy competitor users',         color: '#15803D', x: 82, y: 80, rotate:  3 },
  { slug: 'x-discovery',         name: 'X Discovery',      hook: 'KOLs shaping opinion in your space',    color: '#0369A1', x: 64, y: 85, rotate: -5 },
  { slug: 'substack-discovery',  name: 'Substack',         hook: 'Newsletter writers in your niche',      color: '#EA580C', x: 46, y: 88, rotate:  4 },

  // — Bottom-left —
  { slug: 'ai-pitch',            name: 'AI Pitch',         hook: 'Personalized pitch per creator',        color: '#EA4335', x: 28, y: 83, rotate: -3 },
  { slug: 'email-sequence',      name: 'Email Seq.',       hook: 'Send once, auto follow-up',             color: '#4285F4', x: 12, y: 77, rotate:  5 },

  // — Left —
  { slug: 'podcast-discovery',   name: 'Podcasts',         hook: 'Hosts talking your industry',           color: '#8B5CF6', x: 7,  y: 65, rotate: -4 },
  { slug: 'competitor-influencers', name: 'Creator Lookup', hook: "Find competitor's creators",           color: '#B91C1C', x: 16, y: 51, rotate:  3 },
  { slug: 'reddit-competitor',   name: 'Comp. Monitor',    hook: 'Track competitor Reddit rep',           color: '#9333EA', x: 6,  y: 37, rotate: -5 },
  { slug: 'reply-tracking',      name: 'Reply Tracking',   hook: "See who replied, who didn't",           color: '#D97706', x: 22, y: 26, rotate:  4 },

  // — Partially off-screen edges (infinite canvas feel) —
  { slug: 'x-dm',                name: 'X DM',             hook: 'Personalized KOL messages',             color: '#1DA1F2', x: -3, y: 52, rotate:  5 },
  { slug: 'pipeline',            name: 'Pipeline',         hook: 'Track every creator relationship',      color: '#6366F1', x: 48, y: -2, rotate:  2 },
  { slug: 'instagram-dm',        name: 'Instagram DM',     hook: 'Scale partnership DMs at scale',        color: '#D62976', x: 32, y: 97, rotate: -4 },
  { slug: 'pattern-finder',      name: 'Pattern Finder',   hook: 'Know your best creator type',           color: '#16A34A', x: 97, y: 56, rotate: -3 },
  { slug: 'x-viral',             name: 'X Engine',         hook: 'Tweet templates that get seen',         color: '#374151', x: 55, y: 94, rotate:  3 },
]

function FeatureTile({ tile }: { tile: Tile }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="absolute select-none"
      style={{
        left: `${tile.x}%`,
        top: `${tile.y}%`,
        transform: `translate(-50%, -50%) rotate(${tile.rotate}deg)`,
        zIndex: hovered ? 30 : 10,
        transition: 'z-index 0s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded-xl px-4 py-3 text-white cursor-default transition-all duration-200"
        style={{
          backgroundColor: tile.color,
          width: 176,
          transform: hovered ? 'scale(1.07) rotate(0deg)' : 'scale(1)',
          boxShadow: hovered
            ? `0 16px 48px ${tile.color}60`
            : '0 2px 10px rgba(0,0,0,0.13)',
        }}
      >
        <p className="text-sm font-semibold leading-snug">{tile.name}</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ opacity: 0.78 }}>{tile.hook}</p>
      </div>
    </div>
  )
}

export default function CanvasPage() {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: '#f9fafb',
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Scattered feature tiles */}
      {TILES.map(tile => (
        <FeatureTile key={tile.slug} tile={tile} />
      ))}

      {/* Center card */}
      <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 z-20">
        <div
          className="bg-white rounded-2xl text-center"
          style={{
            width: 380,
            padding: '48px 40px',
            boxShadow: '0 8px 64px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          {/* Replace with <img src="/logo.svg"> once you have a logo */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">
            GrowthHunt
          </h1>
          {/* Replace with your tagline */}
          <p className="text-sm text-gray-400 leading-relaxed mb-8 max-w-[260px] mx-auto">
            Every tool you need to go from zero to growth, in one place.
          </p>
          <EmailForm source="canvas-hero" buttonText="Join Waitlist" variant="light" />
        </div>
      </div>

      {/* Mobile fallback: simple centered layout */}
      <div className="lg:hidden absolute inset-0 flex flex-col items-center justify-center px-6 bg-white/90 backdrop-blur-sm z-40">
        <h1 className="text-4xl font-bold text-gray-900 mb-3 text-center">GrowthHunt</h1>
        <p className="text-sm text-gray-400 text-center mb-8 max-w-xs">
          Every tool you need to go from zero to growth, in one place.
        </p>
        <EmailForm source="canvas-mobile" buttonText="Join Waitlist" variant="light" />
      </div>
    </div>
  )
}
