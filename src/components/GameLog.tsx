import type { PlayerAction, Player } from '../utils/types'

interface Props {
  actions: PlayerAction[]
  players: Player[]
}

const actionLabels: Record<string, string> = {
  fold: 'folded',
  check: 'checked',
  call: 'called',
  raise: 'raised',
  'all-in': 'went all-in',
}

export function GameLog({ actions, players }: Props) {
  if (actions.length === 0) return null

  return (
    <div
      style={{
        background: '#f8f9fa',
        borderRadius: 8,
        padding: 10,
        maxHeight: 160,
        overflowY: 'auto',
        fontSize: 13,
      }}
    >
      {actions.map((a, i) => {
        const name = players[a.playerIdx]?.name ?? `Player ${a.playerIdx}`
        return (
          <div key={i} style={{ marginBottom: 3, color: a.playerIdx === 0 ? '#2c3e50' : '#7f8c8d' }}>
            <strong>{name}</strong>{' '}
            {actionLabels[a.action]}
            {a.amount > 0 ? ` ${a.amount}` : ''}
            <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>
              [{a.street}]
            </span>
          </div>
        )
      })}
    </div>
  )
}
