import type { Card } from './card'

export type Street = 'preflop' | 'flop' | 'turn' | 'river'

export type Action = 'fold' | 'check' | 'call' | 'raise' | 'all-in'

export interface PlayerAction {
  player: 'hero' | 'opponent'
  action: Action
  amount: number
  street: Street
}

export interface HandResult {
  winner: 'hero' | 'opponent' | 'tie'
  heroHand: string
  opponentHand: string
  pot: number
}

export interface FeedbackLine {
  street: Street
  message: string
  type: 'good' | 'bad' | 'info'
}

export interface GameState {
  phase: 'idle' | 'hero-turn' | 'opponent-turn' | 'showdown' | 'finished'
  street: Street
  heroCards: [Card, Card]
  opponentCards: [Card, Card]
  communityCards: Card[]
  pot: number
  heroStack: number
  opponentStack: number
  currentBet: number
  heroBetThisStreet: number
  opponentBetThisStreet: number
  actions: PlayerAction[]
  result: HandResult | null
  feedback: FeedbackLine[]
  deadCards: Card[]
  deckOrder: Card[]
  deckIdx: number
}

export function createInitialState(): GameState {
  return {
    phase: 'idle',
    street: 'preflop',
    heroCards: [{ rank: 'A', suit: 'h' }, { rank: 'K', suit: 's' }],
    opponentCards: [{ rank: 'Q', suit: 'c' }, { rank: 'J', suit: 'd' }],
    communityCards: [],
    pot: 0,
    heroStack: 10000,
    opponentStack: 10000,
    currentBet: 0,
    heroBetThisStreet: 0,
    opponentBetThisStreet: 0,
    actions: [],
    result: null,
    feedback: [],
    deadCards: [],
    deckOrder: [],
    deckIdx: 0,
  }
}
