import type { FeedbackLine } from '../utils/types'

interface Props {
  feedback: FeedbackLine[]
}

const typeColors = { good: '#27ae60', bad: '#e74c3c', info: '#3498db' }
const typeIcons = { good: '✓', bad: '✗', info: '→' }

export function FeedbackPanel({ feedback }: Props) {
  if (feedback.length === 0) return null

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        border: '2px solid #eee',
      }}
    >
      <h3 style={{ fontSize: 16, marginBottom: 12, color: '#2c3e50' }}>Your Review</h3>
      {feedback.map((f, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 8,
            padding: 8,
            borderRadius: 6,
            background: i % 2 === 0 ? '#fafafa' : '#fff',
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              color: typeColors[f.type],
              fontWeight: 700,
              fontSize: 16,
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            {typeIcons[f.type]}
          </span>
          <div>
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontWeight: 600,
                color: '#aaa',
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              [{f.street}]
            </span>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.4 }}>{f.message}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
