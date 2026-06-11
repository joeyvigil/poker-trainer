import { type Card, displayCard, suitColor } from '../utils/card'

interface Props {
  card: Card
  hidden?: boolean
  size?: 'sm' | 'md'
}

const dims = { sm: { width: 44, height: 62, fontSize: 14 }, md: { width: 64, height: 90, fontSize: 18 } }

export function CardComponent({ card, hidden, size = 'md' }: Props) {
  if (hidden) {
    const d = dims[size]
    return (
      <div
        style={{
          width: d.width,
          height: d.height,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #1a5276, #2980b9)',
          border: '2px solid #1a5276',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: d.fontSize * 0.7,
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        ?
      </div>
    )
  }

  const d = dims[size]
  const color = suitColor(card)
  const display = displayCard(card)

  return (
    <div
      style={{
        width: d.width,
        height: d.height,
        border: '1px solid #ddd',
        borderRadius: 6,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <span style={{ fontSize: d.fontSize, fontWeight: 700, color, lineHeight: 1 }}>
        {display}
      </span>
    </div>
  )
}
