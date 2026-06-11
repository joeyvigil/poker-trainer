import type { Card } from './card'
import { createDeck } from './card'
import { evaluateHand } from './evaluator'
import type { GameState, Player, PlayerAction, FeedbackLine, Action } from './types'

const SMALL_BLIND = 50
const BIG_BLIND = 100

function shuffle(arr: Card[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function nextActive(players: Player[], after: number): number | null {
  const n = players.length
  for (let i = 1; i <= n; i++) {
    const idx = (after + i) % n
    if (!players[idx].folded && !players[idx].isAllIn) return idx
  }
  return null
}

export function dealNewHand(prevStacks: number[], prevDealer: number): GameState {
  const numPlayers = prevStacks.length
  const dealerIndex = (prevDealer + 1) % numPlayers
  const deck = createDeck()
  shuffle(deck)
  let idx = 0

  const players: Player[] = prevStacks.map((stack, i) => ({
    name: i === 0 ? 'You' : `Bot ${i}`,
    stack,
    cards: [deck[idx++], deck[idx++]],
    betThisStreet: 0,
    folded: false,
    isAllIn: false,
  }))

  const sbIdx = numPlayers === 2 ? dealerIndex : (dealerIndex + 1) % numPlayers
  const bbIdx = numPlayers === 2 ? (dealerIndex + 1) % numPlayers : (dealerIndex + 2) % numPlayers

  const postBlind = (pIdx: number, amount: number) => {
    const p = players[pIdx]
    const actual = Math.min(amount, p.stack)
    p.stack -= actual
    p.betThisStreet = actual
    if (p.stack === 0 && actual > 0) p.isAllIn = true
    return actual
  }

  const sbAmt = postBlind(sbIdx, SMALL_BLIND)
  const bbAmt = postBlind(bbIdx, BIG_BLIND)

  const firstToAct = numPlayers === 2
    ? sbIdx
    : (nextActive(players, bbIdx) ?? bbIdx)

  const state: GameState = {
    phase: 'idle',
    street: 'preflop',
    players,
    heroIndex: 0,
    communityCards: [],
    pot: sbAmt + bbAmt,
    currentBet: bbAmt,
    dealerIndex,
    currentPlayerIndex: -1,
    actions: [],
    result: null,
    feedback: [],
    deadCards: players.flatMap(p => p.cards),
    deckOrder: deck,
    deckIdx: idx,
  }

  // Set currentPlayerIndex to one before firstToAct so advanceAfterAction finds it
  const beforeFirst = (firstToAct - 1 + numPlayers) % numPlayers
  const s = { ...state, currentPlayerIndex: beforeFirst }
  return advanceAfterAction(s)
}

function dealBoard(state: GameState, count: number): Card[] {
  const cards: Card[] = []
  for (let i = 0; i < count; i++) {
    cards.push(state.deckOrder[state.deckIdx++])
  }
  return cards
}

function handStrength(cards: Card[]): number {
  return evaluateHand(cards).score
}

function getHandCategory(score: number): string {
  if (score >= 9e8) return 'premium'
  if (score >= 8e8) return 'very-strong'
  if (score >= 7e8) return 'strong'
  if (score >= 6e8) return 'strong'
  if (score >= 5e8) return 'decent'
  if (score >= 4e8) return 'decent'
  if (score >= 3e8) return 'medium'
  if (score >= 2e8) return 'medium'
  return 'weak'
}

function opponentDecision(state: GameState, playerIdx: number): PlayerAction {
  const player = state.players[playerIdx]
  const allCards = [...player.cards, ...state.communityCards]

  let strength: number
  if (allCards.length < 5) {
    const preflopRank = rankPreflopHand(player.cards)
    strength = preflopStrength(preflopRank)
  } else {
    const score = handStrength(allCards)
    const cat = getHandCategory(score)
    const catStrength: Record<string, number> = {
      premium: 0.95, 'very-strong': 0.85, strong: 0.75,
      decent: 0.6, medium: 0.4, weak: 0.15,
    }
    strength = catStrength[cat] ?? 0.3
  }

  const toCall = state.currentBet - player.betThisStreet
  const potOdds = toCall / (state.pot + toCall + 1)

  if (strength > 0.7) {
    const raiseAmt = Math.min(Math.floor(state.pot * 0.75), player.stack)
    if (raiseAmt > 0) {
      return { playerIdx, action: 'raise', amount: raiseAmt, street: state.street }
    }
  }

  if (strength > potOdds + 0.05) {
    if (toCall <= 0) {
      return { playerIdx, action: 'check', amount: 0, street: state.street }
    }
    return { playerIdx, action: 'call', amount: Math.min(toCall, player.stack), street: state.street }
  }

  if (toCall > 0) {
    if (strength > 0.15 && toCall < state.pot * 0.3) {
      return { playerIdx, action: 'call', amount: toCall, street: state.street }
    }
    return { playerIdx, action: 'fold', amount: 0, street: state.street }
  }

  return { playerIdx, action: 'check', amount: 0, street: state.street }
}

function rankPreflopHand(cards: [Card, Card]): number {
  const r1 = rankVal(cards[0].rank)
  const r2 = rankVal(cards[1].rank)
  const suited = cards[0].suit === cards[1].suit ? 1 : 0
  const paired = r1 === r2 ? 1 : 0
  const high = Math.max(r1, r2)
  const low = Math.min(r1, r2)
  const gap = high - low

  let score = high * 4 + low * 2 + suited * 5 + paired * 20 - gap * 2
  if (paired && high >= 10) score += 15
  if (high >= 12 && low >= 11) score += 10
  if (high >= 14 && low >= 3 && gap <= 2) score += 5
  return Math.max(0, Math.min(100, score))
}

function rankVal(rank: string): number {
  const v: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return v[rank] ?? 0
}

function preflopStrength(rank: number): number {
  return rank / 100
}

function advanceStreet(state: GameState): GameState {
  let next = { ...state, phase: 'idle' as const }

  if (next.street === 'preflop') {
    next = { ...next, street: 'flop', communityCards: [...next.communityCards, ...dealBoard(next, 3)] }
  } else if (next.street === 'flop') {
    next = { ...next, street: 'turn', communityCards: [...next.communityCards, ...dealBoard(next, 1)] }
  } else if (next.street === 'turn') {
    next = { ...next, street: 'river', communityCards: [...next.communityCards, ...dealBoard(next, 1)] }
  }

  next.players = next.players.map(p => ({ ...p, betThisStreet: 0 }))
  next.currentBet = 0
  next.currentPlayerIndex = next.dealerIndex
  return advanceAfterAction(next)
}

function advanceAfterAction(state: GameState): GameState {
  const s = { ...state, actions: [...state.actions] }

  // Hand over?
  const nonFolded = s.players.filter(p => !p.folded)
  if (nonFolded.length <= 1) {
    const winnerIdx = s.players.findIndex(p => !p.folded)
    s.phase = 'finished'
    if (winnerIdx >= 0) {
      s.result = { winnerIdx, handName: 'Others folded', winners: [winnerIdx], pot: s.pot }
    }
    return finalizeFeedback(s)
  }

  if (isStreetComplete(s)) {
    if (s.street === 'river') return showdown(s)
    return advanceStreet(s)
  }

  // Find next player clockwise from currentPlayerIndex
  const n = s.players.length
  for (let offset = 1; offset <= n; offset++) {
    const idx = (s.currentPlayerIndex + offset) % n
    if (s.players[idx].folded || s.players[idx].isAllIn) continue
    s.currentPlayerIndex = idx
    s.phase = idx === 0 ? 'hero-turn' : 'ai-turn'
    return s
  }

  // Should not reach here
  if (s.street === 'river') return showdown(s)
  return advanceStreet(s)
}

function isStreetComplete(state: GameState): boolean {
  const streetActions = state.actions.filter(a => a.street === state.street)
  const active = state.players
    .map((p, i) => !p.folded && !p.isAllIn ? i : -1)
    .filter(i => i >= 0)

  if (active.length <= 1) return true

  // Find the last raise action
  let lastRaiseIdx = -1
  let lastRaiser = -1
  for (let i = streetActions.length - 1; i >= 0; i--) {
    if (streetActions[i].action === 'raise') {
      lastRaiseIdx = i
      lastRaiser = streetActions[i].playerIdx
      break
    }
  }

  // All players who acted after the last raise (or all actions if no raise)
  const actedSince = new Set<number>()
  for (let i = lastRaiseIdx + 1; i < streetActions.length; i++) {
    actedSince.add(streetActions[i].playerIdx)
  }

  // Without a raise: every active player must have acted
  // With a raise: every active player except the last raiser must have acted since the raise
  const mustAct = active.filter(i => i !== lastRaiser)
  return mustAct.every(i => actedSince.has(i))
}

function applyDecision(state: GameState, playerIdx: number, decision: PlayerAction): GameState {
  const next = { ...state, players: state.players.map(p => ({ ...p })) }
  const p = next.players[playerIdx]

  switch (decision.action) {
    case 'fold':
      p.folded = true
      return next
    case 'check':
      return next
    case 'call': {
      const callAmt = Math.min(decision.amount, p.stack)
      p.stack -= callAmt
      p.betThisStreet += callAmt
      next.pot += callAmt
      if (p.stack === 0 && callAmt > 0) p.isAllIn = true
      return next
    }
    case 'raise': {
      const raiseAmt = Math.min(decision.amount, p.stack)
      p.stack -= raiseAmt
      p.betThisStreet += raiseAmt
      next.pot += raiseAmt
      next.currentBet = p.betThisStreet
      if (p.stack === 0 && raiseAmt > 0) p.isAllIn = true
      return next
    }
    default:
      return next
  }
}

export function heroActs(state: GameState, action: Action, amount?: number): GameState {
  let next = {
    ...state,
    players: state.players.map(p => ({ ...p })),
    actions: [...state.actions],
  }
  const hero = next.players[0]

  if (action === 'fold') {
    hero.folded = true
    const entry: PlayerAction = { playerIdx: 0, action: 'fold', amount: 0, street: state.street }
    next.actions = [...next.actions, entry]
    return advanceAfterAction(next)
  }

  if (action === 'call') {
    const callAmt = state.currentBet - hero.betThisStreet
    if (callAmt > hero.stack) return state
    hero.stack -= callAmt
    hero.betThisStreet += callAmt
    next.pot += callAmt
    if (hero.stack === 0 && callAmt > 0) hero.isAllIn = true
    const entry: PlayerAction = { playerIdx: 0, action: 'call', amount: callAmt, street: state.street }
    next.actions = [...next.actions, entry]
    return advanceAfterAction(next)
  }

  if (action === 'check') {
    const entry: PlayerAction = { playerIdx: 0, action: 'check', amount: 0, street: state.street }
    next.actions = [...next.actions, entry]
    return advanceAfterAction(next)
  }

  if (action === 'raise' || action === 'all-in') {
    const raiseAmt = action === 'all-in'
      ? hero.stack
      : Math.min(amount ?? state.pot, hero.stack)
    if (raiseAmt <= 0) return state
    hero.stack -= raiseAmt
    hero.betThisStreet += raiseAmt
    next.pot += raiseAmt
    next.currentBet = hero.betThisStreet
    if (hero.stack === 0 && raiseAmt > 0) hero.isAllIn = true
    const entry: PlayerAction = {
      playerIdx: 0, action: 'raise', amount: raiseAmt, street: state.street,
    }
    next.actions = [...next.actions, entry]
    return advanceAfterAction(next)
  }

  return next
}

export function processNextAi(state: GameState): GameState {
  if (state.phase !== 'ai-turn') return state

  const playerIdx = state.currentPlayerIndex
  const decision = opponentDecision(state, playerIdx)
  let next = applyDecision(state, playerIdx, decision)
  next = { ...next, actions: [...next.actions, decision] }

  // Hand over?
  if (next.players.filter(p => !p.folded).length <= 1) {
    const winnerIdx = next.players.findIndex(p => !p.folded)
    next.phase = 'finished'
    if (winnerIdx >= 0) {
      next.result = { winnerIdx, handName: 'Others folded', winners: [winnerIdx], pot: next.pot }
    }
    return finalizeFeedback(next)
  }

  return advanceAfterAction(next)
}

function showdown(state: GameState): GameState {
  let bestScore = -1
  let bestPlayers: number[] = []
  let bestHandName = ''

  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].folded) continue
    const allCards = [...state.players[i].cards, ...state.communityCards]
    const result = evaluateHand(allCards)
    if (result.score > bestScore) {
      bestScore = result.score
      bestPlayers = [i]
      bestHandName = result.name
    } else if (result.score === bestScore) {
      bestPlayers.push(i)
    }
  }

  const s: GameState = {
    ...state,
    phase: 'finished',
    result: {
      winnerIdx: bestPlayers[0],
      handName: bestHandName,
      winners: bestPlayers,
      pot: state.pot,
    },
  }
  return finalizeFeedback(s)
}

function awardPot(s: GameState): GameState {
  if (!s.result) return s
  const pot = s.pot
  const winners = s.result.winners
  const share = Math.floor(pot / winners.length)
  const newPlayers = s.players.map((p, i) =>
    winners.includes(i) ? { ...p, stack: p.stack + share } : p
  )
  return { ...s, players: newPlayers }
}

function finalizeFeedback(state: GameState): GameState {
  const feedback = generateFeedback(state)
  return awardPot({ ...state, feedback })
}

function generateFeedback(state: GameState): FeedbackLine[] {
  const lines: FeedbackLine[] = []
  if (!state.result) return lines

  const hero = state.players[0]
  const heroCardsStr = `${hero.cards[0].rank}${hero.cards[1].rank}${hero.cards[0].suit === hero.cards[1].suit ? 's' : 'o'}`

  lines.push({
    street: 'preflop',
    message: `Your hand: ${heroCardsStr}. ${preflopAdvice(hero.cards)}`,
    type: 'info',
  })

  const heroActions = state.actions.filter(a => a.playerIdx === 0)
  const heroFolded = heroActions.some(a => a.action === 'fold')

  if (heroFolded) {
    if (isPremium(hero.cards)) {
      lines.push({
        street: 'preflop',
        message: `You folded ${heroCardsStr} — this is typically a strong hand worth playing.`,
        type: 'bad',
      })
    } else if (isMarginal(hero.cards)) {
      lines.push({
        street: 'preflop',
        message: `Folding ${heroCardsStr} is reasonable — it's a marginal hand.`,
        type: 'good',
      })
    } else {
      lines.push({
        street: 'preflop',
        message: `Folding ${heroCardsStr} — good discipline with a weak hand.`,
        type: 'info',
      })
    }
  } else {
    const heroRaise = heroActions.some(a => a.action === 'raise')
    if (heroRaise && isPremium(hero.cards)) {
      lines.push({
        street: 'preflop',
        message: `Good raise with ${heroCardsStr} — premium hands want to build the pot preflop.`,
        type: 'good',
      })
    }
  }

  const heroWon = state.result.winners.includes(0)
  if (heroWon) {
    if (state.result.winners.length > 1) {
      lines.push({
        street: 'river',
        message: `You split the pot (${state.result.pot} chips) with ${state.result.handName}.`,
        type: 'info',
      })
    } else {
      lines.push({
        street: 'river',
        message: `You won ${state.result.pot} chips with ${state.result.handName}.`,
        type: 'good',
      })
    }
  } else {
    lines.push({
      street: 'river',
      message: `You lost. ${state.players[state.result.winnerIdx].name} had ${state.result.handName}.`,
      type: 'bad',
    })
  }

  return lines
}

function isPremium(cards: [Card, Card]): boolean {
  const r1 = rankVal(cards[0].rank)
  const r2 = rankVal(cards[1].rank)
  const paired = r1 === r2
  return paired || (r1 >= 12 && r2 >= 12) || (r1 >= 14 && r2 >= 11)
}

function isMarginal(cards: [Card, Card]): boolean {
  const r1 = rankVal(cards[0].rank)
  const r2 = rankVal(cards[1].rank)
  const suited = cards[0].suit === cards[1].suit
  return (r1 >= 10 && r2 >= 10 && !isPremium(cards)) ||
    (r1 >= 11 && r2 >= 8 && suited)
}

function preflopAdvice(cards: [Card, Card]): string {
  const r1 = rankVal(cards[0].rank)
  const r2 = rankVal(cards[1].rank)
  const suited = cards[0].suit === cards[1].suit
  const paired = r1 === r2

  if (paired) {
    if (r1 >= 14) return `Pocket Aces — the best starting hand. Raise strong.`
    if (r1 >= 13) return `Pocket Kings — second best hand. Raise.`
    if (r1 >= 12) return `Pocket Queens — premium pair. Raise.`
    if (r1 >= 11) return `Pocket Jacks — strong but vulnerable to overcards. Raise.`
    if (r1 >= 10) return `Pocket Tens — good pair. Raise.`
    return `Low pocket pair — play for set value. Call or limp.`
  }

  if (r1 >= 14 && r2 >= 13 && suited) return `Ace-King suited — premium drawing hand. Raise.`
  if (r1 >= 14 && r2 >= 13) return `Ace-King offsuit — strong hand. Raise.`
  if (r1 >= 14 && r2 >= 12 && suited) return `Ace-Queen suited — strong. Raise.`
  if (r1 >= 14 && r2 >= 10 && suited) return `Ace-Ten suited — playable. Raise in late position.`

  const gap = Math.max(r1, r2) - Math.min(r1, r2)
  if (r1 >= 10 && r2 >= 10 && gap <= 2) return `Strong broadway hand. Raise.`
  if (suited && r1 >= 9 && gap <= 3) return `Suited connector — can play for draws. Call.`

  return `Marginal hand. Fold to aggression.`
}
