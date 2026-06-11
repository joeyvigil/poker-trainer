import type { Card } from './card'
import { createDeck } from './card'
import { evaluateHand } from './evaluator'
import type { GameState, PlayerAction, FeedbackLine, Action } from './types'

const SMALL_BLIND = 50
const BIG_BLIND = 100

function shuffle(arr: Card[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

export function dealNewHand(prevHeroStack?: number, prevOpponentStack?: number): GameState {
  const deck = createDeck()
  shuffle(deck)
  let idx = 0

  const heroCards: [Card, Card] = [deck[idx++], deck[idx++]]
  const opponentCards: [Card, Card] = [deck[idx++], deck[idx++]]

  const heroStarting = prevHeroStack ?? 10000
  const oppStarting = prevOpponentStack ?? 10000
  const heroAfterBlind = heroStarting - BIG_BLIND
  const oppAfterBlind = oppStarting - SMALL_BLIND

  return {
    phase: 'hero-turn',
    street: 'preflop',
    heroCards,
    opponentCards,
    communityCards: [],
    pot: BIG_BLIND + SMALL_BLIND,
    heroStack: Math.max(0, heroAfterBlind),
    opponentStack: Math.max(0, oppAfterBlind),
    currentBet: BIG_BLIND,
    heroBetThisStreet: BIG_BLIND,
    opponentBetThisStreet: SMALL_BLIND,
    actions: [],
    result: null,
    feedback: [],
    deadCards: [heroCards[0], heroCards[1], opponentCards[0], opponentCards[1]],
    deckOrder: deck,
    deckIdx: idx,
  }
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

function opponentDecision(state: GameState): PlayerAction {
  const allCards = [...state.opponentCards, ...state.communityCards]

  let strength: number
  if (allCards.length < 5) {
    const preflopRank = rankPreflopHand(state.opponentCards)
    strength = preflopStrength(preflopRank)
  } else {
    const oppScore = handStrength([...state.opponentCards, ...state.communityCards])
    const cat = getHandCategory(oppScore)
    const catStrength: Record<string, number> = {
      premium: 0.95, 'very-strong': 0.85, strong: 0.75,
      decent: 0.6, medium: 0.4, weak: 0.15,
    }
    strength = catStrength[cat] ?? 0.3
  }

  const toCall = state.currentBet - state.opponentBetThisStreet
  const potOdds = toCall / (state.pot + toCall + 1)

  if (strength > 0.7) {
    const raiseAmt = Math.min(
      Math.floor(state.pot * 0.75),
      state.opponentStack,
    )
    if (raiseAmt > 0) {
      return {
        player: 'opponent',
        action: 'raise',
        amount: raiseAmt,
        street: state.street,
      }
    }
  }

  if (strength > potOdds + 0.05) {
    if (toCall === 0) {
      return { player: 'opponent', action: 'check', amount: 0, street: state.street }
    }
    return { player: 'opponent', action: 'call', amount: toCall, street: state.street }
  }

  if (toCall > 0) {
    if (strength > 0.15 && toCall < state.pot * 0.3) {
      return { player: 'opponent', action: 'call', amount: toCall, street: state.street }
    }
    return { player: 'opponent', action: 'fold', amount: 0, street: state.street }
  }

  return { player: 'opponent', action: 'check', amount: 0, street: state.street }
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

export function advanceStreet(state: GameState): GameState {
  let next = { ...state, phase: 'hero-turn' as const }

  if (next.street === 'preflop') {
    next = { ...next, street: 'flop', communityCards: [...next.communityCards, ...dealBoard(next, 3)] }
  } else if (next.street === 'flop') {
    next = { ...next, street: 'turn', communityCards: [...next.communityCards, ...dealBoard(next, 1)] }
  } else if (next.street === 'turn') {
    next = { ...next, street: 'river', communityCards: [...next.communityCards, ...dealBoard(next, 1)] }
  }

  next.currentBet = 0
  next.heroBetThisStreet = 0
  next.opponentBetThisStreet = 0
  next.phase = 'hero-turn'
  return next
}

export function heroActs(state: GameState, action: Action, amount?: number): GameState {
  let next = { ...state, actions: [...state.actions] }

  if (action === 'fold') {
    const actionEntry: PlayerAction = {
      player: 'hero', action: 'fold', amount: 0, street: state.street,
    }
    next.actions = [...next.actions, actionEntry]
    next.phase = 'finished'
    next.result = {
      winner: 'opponent',
      heroHand: 'Folded',
      opponentHand: 'Showed',
      pot: state.pot,
    }
    return finalizeFeedback(next)
  }

  if (action === 'call' || action === 'check') {
    const callAmt = action === 'call' ? state.currentBet - state.heroBetThisStreet : 0
    if (callAmt > state.heroStack) return next

    const actionEntry: PlayerAction = {
      player: 'hero', action, amount: callAmt, street: state.street,
    }
    next.actions = [...next.actions, actionEntry]
    next.heroStack -= callAmt
    next.pot += callAmt
    next.heroBetThisStreet += callAmt

    next = { ...next, phase: 'opponent-turn' }
    return executeOpponentTurn(next)
  }

  if (action === 'raise' || action === 'all-in') {
    const raiseAmt = action === 'all-in'
      ? state.heroStack
      : Math.min(amount ?? state.pot, state.heroStack)
    if (raiseAmt <= 0) return next

    const totalBet = state.heroBetThisStreet + raiseAmt
    const actionEntry: PlayerAction = {
      player: 'hero', action: 'raise', amount: raiseAmt, street: state.street,
    }
    next.actions = [...next.actions, actionEntry]
    next.heroStack -= raiseAmt
    next.pot += raiseAmt
    next.heroBetThisStreet += raiseAmt
    next.currentBet = totalBet

    next = { ...next, phase: 'opponent-turn' }
    return executeOpponentTurn(next)
  }

  return next
}

function executeOpponentTurn(state: GameState): GameState {
  const decision = opponentDecision(state)
  let next = { ...state, actions: [...state.actions, decision] }

  if (decision.action === 'fold') {
    next.phase = 'finished'
    next.result = {
      winner: 'hero',
      heroHand: 'Showed',
      opponentHand: 'Folded',
      pot: state.pot,
    }
    return finalizeFeedback(next)
  }

  if (decision.action === 'call') {
    next.opponentStack -= decision.amount
    next.pot += decision.amount
    next.opponentBetThisStreet += decision.amount

    if (state.street === 'river') {
      return showdown(next)
    }
    return advanceStreet(next)
  }

  if (decision.action === 'check') {
    if (state.street === 'river') {
      return showdown(next)
    }
    return advanceStreet(next)
  }

  if (decision.action === 'raise') {
    next.opponentStack -= decision.amount
    next.pot += decision.amount
    next.opponentBetThisStreet += decision.amount
    next.currentBet = decision.amount + state.opponentBetThisStreet
    next.phase = 'hero-turn'
    return next
  }

  return next
}

function showdown(state: GameState): GameState {
  const allCommunity = state.communityCards
  const heroResult = evaluateHand([...state.heroCards, ...allCommunity])
  const oppResult = evaluateHand([...state.opponentCards, ...allCommunity])

  let winner: 'hero' | 'opponent' | 'tie'
  if (heroResult.score > oppResult.score) winner = 'hero'
  else if (oppResult.score > heroResult.score) winner = 'opponent'
  else winner = 'tie'

  const next: GameState = {
    ...state,
    phase: 'finished',
    result: {
      winner,
      heroHand: heroResult.name,
      opponentHand: oppResult.name,
      pot: state.pot,
    },
  }
  return finalizeFeedback(next)
}

function awardPot(s: GameState): GameState {
  if (!s.result) return s
  const pot = s.pot
  if (s.result.winner === 'hero') {
    return { ...s, heroStack: s.heroStack + pot }
  }
  if (s.result.winner === 'opponent') {
    return { ...s, opponentStack: s.opponentStack + pot }
  }
  return { ...s, heroStack: s.heroStack + Math.floor(pot / 2), opponentStack: s.opponentStack + Math.floor(pot / 2) }
}

function finalizeFeedback(state: GameState): GameState {
  const feedback = generateFeedback(state)
  return awardPot({ ...state, feedback })
}

function getHandName(cards: Card[], board: Card[]): string {
  if (cards.length < 2) return 'Unknown'
  return evaluateHand([...cards, ...board]).name
}

function generateFeedback(state: GameState): FeedbackLine[] {
  const lines: FeedbackLine[] = []

  if (!state.result) return lines

  const heroName = (c: Card[]) => `${c[0].rank}${c[1].rank}${c[0].suit === c[1].suit ? 's' : 'o'}`
  const heroCardsStr = heroName(state.heroCards)

  lines.push({
    street: 'preflop',
    message: `Your hand: ${heroCardsStr}. ${preflopAdvice(state.heroCards)}`,
    type: 'info',
  })

  if (state.actions.length >= 2) {
    const heroActions = state.actions.filter(a => a.player === 'hero')
    for (const act of heroActions) {
      if (act.action === 'fold') {
        const hs = state.communityCards.length > 0
          ? getHandName(state.heroCards, state.communityCards)
          : getHandName(state.heroCards, [])
        if (state.communityCards.length >= 3) {
          const oppHand = getHandName(state.opponentCards, state.communityCards)
          if (hs === 'High Card') {
            lines.push({
              street: act.street,
              message: `You folded with ${hs} — usually the right play facing aggression without a made hand.`,
              type: 'good',
            })
          } else {
            lines.push({
              street: act.street,
              message: `You folded with ${hs} vs ${oppHand}. Could be right if opponent showed strength.`,
              type: 'info',
            })
          }
        } else {
          if (isPremium(state.heroCards)) {
            lines.push({
              street: act.street,
              message: `You folded ${heroCardsStr} preflop — this is typically a strong hand worth playing.`,
              type: 'bad',
            })
          } else if (isMarginal(state.heroCards)) {
            lines.push({
              street: act.street,
              message: `Folding ${heroCardsStr} preflop is reasonable — it's a marginal hand.`,
              type: 'good',
            })
          } else {
            lines.push({
              street: act.street,
              message: `Folding ${heroCardsStr} preflop — good discipline with a weak hand.`,
              type: 'info',
            })
          }
        }
      } else if (act.action === 'raise') {
        if (isPremium(state.heroCards) && act.street === 'preflop') {
          lines.push({
            street: act.street,
            message: `Good raise with ${heroCardsStr} — premium hands want to build the pot preflop.`,
            type: 'good',
          })
        }
      }
    }
  }

  if (state.result) {
    if (state.result.winner === 'hero') {
      const potWon = state.result.pot
      lines.push({
        street: 'river',
        message: `You won ${potWon} chips with ${state.result.heroHand} vs ${state.result.opponentHand}.`,
        type: 'good',
      })
    } else if (state.result.winner === 'tie') {
      lines.push({
        street: 'river',
        message: `Split pot — both had ${state.result.heroHand}.`,
        type: 'info',
      })
    } else {
      const lost = state.result.pot
      lines.push({
        street: 'river',
        message: `You lost ${lost} chips. Opponent had ${state.result.opponentHand}, you had ${state.result.heroHand}.`,
        type: 'bad',
      })
    }
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

  if (r1 >= 14 && r2 >= 13) return `Ace-King suited — premium drawing hand. Raise.`
  if (r1 >= 14 && r2 >= 13) return `Ace-King offsuit — strong hand. Raise.`
  if (r1 >= 14 && r2 >= 12 && suited) return `Ace-Queen suited — strong. Raise.`
  if (r1 >= 14 && r2 >= 10 && suited) return `Ace-Ten suited — playable. Raise in late position.`

  const gap = Math.max(r1, r2) - Math.min(r1, r2)
  if (r1 >= 10 && r2 >= 10 && gap <= 2) return `Strong broadway hand. Raise.`
  if (suited && r1 >= 9 && gap <= 3) return `Suited connector — can play for draws. Call.`

  return `Marginal hand. Fold to aggression.`
}
