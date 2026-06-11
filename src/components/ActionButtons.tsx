import type { Action } from '../utils/types'

interface Props {
  heroStack: number
  currentBet: number
  heroBetThisStreet: number
  disabled?: boolean
  onAction: (action: Action, amount?: number) => void
}

export function ActionButtons({ heroStack, currentBet, heroBetThisStreet, disabled, onAction }: Props) {
  const toCall = currentBet - heroBetThisStreet
  const canCheck = toCall <= 0
  const canCall = toCall > 0 && toCall <= heroStack
  const minRaise = Math.max(currentBet * 2 - heroBetThisStreet, toCall + 100)
  const potRaise = Math.min(heroStack, Math.max(minRaise, 300))
  const allIn = heroStack

  if (disabled) {
    return (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 12 }}>
        <div style={{ color: '#8899aa', fontSize: 14 }}>Waiting for opponent...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', padding: 12 }}>
      <ActionBtn label="Fold" color="#e74c3c" onClick={() => onAction('fold')} />
      {canCheck ? (
        <ActionBtn label="Check" color="#3498db" onClick={() => onAction('check')} />
      ) : canCall ? (
        <ActionBtn label={`Call ${toCall}`} color="#3498db" onClick={() => onAction('call')} />
      ) : null}
      {heroStack > minRaise && (
        <ActionBtn label={`Raise ${potRaise}`} color="#e67e22" onClick={() => onAction('raise', potRaise)} />
      )}
      {heroStack > 0 && (
        <ActionBtn label={`All-in ${allIn}`} color="#9b59b6" onClick={() => onAction('all-in', allIn)} />
      )}
    </div>
  )
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        border: `2px solid ${color}`,
        borderRadius: 8,
        background: '#fff',
        color,
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = color }}
    >
      {label}
    </button>
  )
}
