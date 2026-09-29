import React from 'react'

export default function BrandMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M5 22V9h3v13H5zm6 0V9h3v13h-3zm6 0V9h3v13h-3zm6 0V9h3v13h-3z" fill="currentColor" className="text-signal-fraud" />
      <path d="M5 25h21" stroke="currentColor" className="text-amber-400" strokeWidth="2" />
    </svg>
  )
}
