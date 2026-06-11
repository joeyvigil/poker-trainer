import { type Card, rankValue } from './card'

export type HandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush'

export interface HandResult {
  rank: HandRank
  score: number
  name: string
}

export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length === 5) return evaluateFive(cards)
  let best: HandResult | null = null
  for (const combo of combinations(cards, 5)) {
    const result = evaluateFive(combo)
    if (!best || result.score > best.score) {
      best = result
    }
  }
  return best!
}

function rankCounts(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1)
  return counts
}

function sortedRankValues(cards: Card[]): number[] {
  return cards.map(c => rankValue(c.rank)).sort((a, b) => b - a)
}

function isFlush(cards: Card[]): boolean {
  return cards.length >= 5 && cards.every(c => c.suit === cards[0].suit)
}

function isStraight(values: number[]): { is: true; high: number } | null {
  const sorted = [...new Set(values)].sort((a, b) => b - a)
  for (let i = 0; i <= sorted.length - 5; i++) {
    const slice = sorted.slice(i, i + 5)
    if (slice[0] - slice[4] === 4) return { is: true, high: slice[0] }
  }
  if (sorted.includes(14) && sorted.includes(2)) {
    const wheel = [14, 5, 4, 3, 2]
    if (wheel.every(v => sorted.includes(v))) return { is: true, high: 5 }
  }
  return null
}

function evaluateFive(cards: Card[]): HandResult {
  const values = sortedRankValues(cards)
  const counts = rankCounts(cards)
  const groups = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || rankValue(b[0] as any) - rankValue(a[0] as any))

  const flush = isFlush(cards)
  const straight = isStraight(values)

  if (flush && straight) {
    if (straight.high === 14) return { rank: 'royal-flush', score: 9e8, name: 'Royal Flush' }
    return { rank: 'straight-flush', score: 9e8 + straight.high * 1e6, name: 'Straight Flush' }
  }
  if (groups[0][1] === 4) {
    const quad = rankValue(groups[0][0] as any)
    const kicker = rankValue(groups[1][0] as any)
    return { rank: 'four-of-a-kind', score: 8e8 + quad * 1e6 + kicker, name: 'Four of a Kind' }
  }
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) {
    return { rank: 'full-house', score: 7e8 + rankValue(groups[0][0] as any) * 1e6 + rankValue(groups[1][0] as any), name: 'Full House' }
  }
  if (flush) {
    return { rank: 'flush', score: 6e8 + values.reduce((s, v) => s * 15 + v, 0), name: 'Flush' }
  }
  if (straight) {
    return { rank: 'straight', score: 5e8 + straight.high * 1e6, name: 'Straight' }
  }
  if (groups[0][1] === 3) {
    const trip = rankValue(groups[0][0] as any)
    const kickers = groups.slice(1).map(g => rankValue(g[0] as any))
    return { rank: 'three-of-a-kind', score: 4e8 + trip * 1e6 + kickers[0] * 1e3 + kickers[1], name: 'Three of a Kind' }
  }
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    return { rank: 'two-pair', score: 3e8 + rankValue(groups[0][0] as any) * 1e6 + rankValue(groups[1][0] as any) * 1e3 + rankValue(groups[2][0] as any), name: 'Two Pair' }
  }
  if (groups[0][1] === 2) {
    const p = rankValue(groups[0][0] as any)
    const kickers = groups.slice(1).map(g => rankValue(g[0] as any))
    return { rank: 'pair', score: 2e8 + p * 1e6 + kickers[0] * 1e3 + kickers[1], name: 'Pair' }
  }
  return { rank: 'high-card', score: values.reduce((s, v) => s * 15 + v, 0), name: 'High Card' }
}

function combinations(arr: Card[], k: number): Card[][] {
  if (k === 0) return [[]]
  if (arr.length === 0) return []
  const [first, ...rest] = arr
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c])
  const withoutFirst = combinations(rest, k)
  return [...withFirst, ...withoutFirst]
}
