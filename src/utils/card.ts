export const SUITS = ['h', 'd', 'c', 's'] as const
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const

export type Suit = typeof SUITS[number]
export type Rank = typeof RANKS[number]

export interface Card {
  rank: Rank
  suit: Suit
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
}

const SUIT_COLORS: Record<Suit, string> = {
  h: '#e74c3c',
  d: '#e74c3c',
  c: '#2c3e50',
  s: '#2c3e50',
}

export function cardId(card: Card): string {
  return `${card.rank}${card.suit}`
}

export function cardFromId(id: string): Card {
  return { rank: id[0] as Rank, suit: id[1] as Suit }
}

export function rankValue(rank: Rank): number {
  const values: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return values[rank]
}

export function displayCard(card: Card): string {
  const rankDisplay: Record<string, string> = {
    'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
    '7': '7', '8': '8', '9': '9',
  }
  return `${rankDisplay[card.rank]}${SUIT_SYMBOLS[card.suit]}`
}

export function suitColor(card: Card): string {
  return SUIT_COLORS[card.suit]
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

export function suitName(suit: Suit): string {
  return { h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades' }[suit]
}

export function rankName(rank: Rank): string {
  const names: Record<string, string> = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8',
    '9': '9', 'T': '10', 'J': 'Jack', 'Q': 'Queen', 'K': 'King', 'A': 'Ace',
  }
  return names[rank]
}
