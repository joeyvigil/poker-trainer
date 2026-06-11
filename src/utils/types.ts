import type { Card } from './card'

export type Street = 'preflop' | 'flop' | 'turn' | 'river'

export type Action = 'fold' | 'check' | 'call' | 'raise' | 'all-in'

export interface Player {
  name: string
  stack: number
  cards: [Card, Card]
  betThisStreet: number
  folded: boolean
  isAllIn: boolean
}

export interface PlayerAction {
  playerIdx: number
  action: Action
  amount: number
  street: Street
}

export interface HandResult {
  winnerIdx: number
  handName: string
  winners: number[]
  pot: number
}

export interface FeedbackLine {
  street: Street
  message: string
  type: 'good' | 'bad' | 'info'
}

export interface GameState {
  phase: 'idle' | 'hero-turn' | 'ai-turn' | 'finished'
  street: Street
  players: Player[]
  heroIndex: number
  communityCards: Card[]
  pot: number
  currentBet: number
  dealerIndex: number
  currentPlayerIndex: number
  actions: PlayerAction[]
  result: HandResult | null
  feedback: FeedbackLine[]
  deadCards: Card[]
  deckOrder: Card[]
  deckIdx: number
}
