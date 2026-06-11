import { useState, useEffect, useRef } from 'react'
import type { Action } from './utils/types'
import type { Card } from './utils/card'
import { dealNewHand, heroActs, processNextAi } from './utils/engine'
import { CardComponent } from './components/CardComponent'
import { ActionButtons } from './components/ActionButtons'
import { GameLog } from './components/GameLog'
import { FeedbackPanel } from './components/FeedbackPanel'
import { displayCard } from './utils/card'
import { evaluateHand } from './utils/evaluator'
import './App.css'

function handLabel(cards: [Card, Card], board: Card[]): string {
  const result = evaluateHand([...cards, ...board])
  return result.name
}

const STARTING_STACK = 10000
const AI_DELAY_MIN = 600
const AI_DELAY_MAX = 1400

export default function App() {
  const [numPlayers, setNumPlayers] = useState(3)
  const [game, setGame] = useState(() =>
    dealNewHand(Array(numPlayers).fill(STARTING_STACK), numPlayers - 1)
  )
  const [showCards, setShowCards] = useState<boolean[]>(() =>
    Array(numPlayers).fill(false)
  )
  const [dealt, setDealt] = useState(false)
  const dealtRef = useRef(dealt)
  dealtRef.current = dealt

  // Auto-process AI turns with a delay
  useEffect(() => {
    if (game.phase !== 'ai-turn') return
    if (!dealtRef.current) return

    const delay = AI_DELAY_MIN + Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN)
    const timer = setTimeout(() => {
      const next = processNextAi(game)
      setGame(next)
      if (next.phase === 'finished') {
        setShowCards(prev => prev.map((_, i) =>
          i === 0 ? true : !next.players[i].folded
        ))
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [game])

  function handleDeal() {
    const stacks = game.players.map(p => p.stack)
    const newGame = dealNewHand(stacks, game.dealerIndex)
    setGame(newGame)
    setShowCards(Array(numPlayers).fill(false))
    setDealt(true)
  }

  function handleStartNew() {
    const stacks = Array(numPlayers).fill(STARTING_STACK)
    const newGame = dealNewHand(stacks, numPlayers - 1)
    setGame(newGame)
    setShowCards(Array(numPlayers).fill(false))
    setDealt(false)
  }

  function handleAction(action: Action, amount?: number) {
    const next = heroActs(game, action, amount)
    setGame(next)
    if (next.phase === 'finished') {
      setShowCards(prev => prev.map((_, i) =>
        i === 0 ? true : !next.players[i].folded
      ))
    }
  }

  function handleShowAll() {
    setShowCards(prev => prev.map(() => true))
  }

  const hero = game.players[0]
  const isFinished = game.phase === 'finished'
  const allShown = showCards.every(Boolean)
  const isAiTurn = game.phase === 'ai-turn'
  const thinkingBot = isAiTurn ? game.players[game.currentPlayerIndex]?.name : null

  return (
    <div className="app">
      <header className="header">
        <h1>&spades; Poker Trainer &hearts;</h1>
        <p>Practice your Texas Hold'em decisions</p>
      </header>

      <div className="setup-bar">
        <label className="setup-label">Players:</label>
        <div className="player-select">
          {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              className={`player-opt${n === numPlayers ? ' active' : ''}`}
              onClick={() => setNumPlayers(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <button className="btn btn-new" onClick={handleStartNew}>
          New Game
        </button>
      </div>

      <div className="opponents-row">
        {game.players.slice(1).map((opp, i) => {
          const realIdx = i + 1
          const isDealer = game.dealerIndex === realIdx
          const isThinking = isAiTurn && game.currentPlayerIndex === realIdx
          return (
            <div
              key={i}
              className={`player-box${isThinking ? ' thinking' : ''}`}
            >
              <div className="player-box-label">
                {opp.name}
                {isDealer && <span className="dealer-chip">D</span>}
                {opp.folded && <span className="status-badge folded">FOLD</span>}
                {opp.isAllIn && <span className="status-badge allin">ALL-IN</span>}
              </div>
              <div className="card-row">
                {opp.cards.map((c, ci) => (
                  <CardComponent
                    key={ci}
                    card={c}
                    hidden={!showCards[realIdx]}
                    size="sm"
                  />
                ))}
              </div>
              {showCards[realIdx] && (
                <>
                  <div style={{ fontSize: 11, color: '#8899aa', marginTop: 2 }}>
                    {displayCard(opp.cards[0])} {displayCard(opp.cards[1])}
                  </div>
                  {!opp.folded && game.communityCards.length >= 3 && (
                    <div className="hand-label">{handLabel(opp.cards, game.communityCards)}</div>
                  )}
                  {opp.folded && allShown && game.communityCards.length >= 3 && (
                    <div className="hand-label">{handLabel(opp.cards, game.communityCards)}</div>
                  )}
                </>
              )}
              <div className="stack">Stack: {opp.stack}</div>
              {isThinking && <div className="thinking-dots">thinking<span>.</span><span>.</span><span>.</span></div>}
            </div>
          )
        })}
      </div>

      {isAiTurn && thinkingBot && (
        <div className="thinking-bar">{thinkingBot} is deciding...</div>
      )}

      <div className="board-area">
        <div className="community-cards">
          {game.communityCards.length === 0 && dealt && (
            <div className="community-label">Preflop</div>
          )}
          {game.communityCards.length === 3 && <div className="community-label">Flop</div>}
          {game.communityCards.length === 4 && <div className="community-label">Turn</div>}
          {game.communityCards.length === 5 && <div className="community-label">River</div>}

          {!dealt ? (
            <div className="deal-prompt">Click "Deal Hand" to start</div>
          ) : (
            <div className="card-row">
              {[0, 1, 2, 3, 4].map(i =>
                game.communityCards[i] ? (
                  <CardComponent key={i} card={game.communityCards[i]} size="md" />
                ) : (
                  <div key={i} className="card-placeholder" />
                )
              )}
            </div>
          )}
        </div>

        <div className="pot-display">Pot: {game.pot}</div>
      </div>

        <div className="player-box hero">
          <div className="player-box-label">
            You
            {game.dealerIndex === 0 && <span className="dealer-chip">D</span>}
            {hero.folded && <span className="status-badge folded">FOLD</span>}
            {hero.isAllIn && <span className="status-badge allin">ALL-IN</span>}
          </div>
          <div className="card-row">
            {hero.cards.map((c, i) => (
              <CardComponent key={i} card={c} size="sm" />
            ))}
          </div>
          {isFinished && !hero.folded && game.communityCards.length >= 3 && (
            <div className="hand-label">{handLabel(hero.cards, game.communityCards)}</div>
          )}
          <div className="stack">Stack: {hero.stack}</div>
        </div>

      <div className="controls">
        {!dealt && (
          <button className="btn btn-deal" onClick={handleDeal}>
            Deal Hand
          </button>
        )}

        {dealt && !isFinished && !isAiTurn && (
          <div>
            <ActionButtons
              heroStack={hero.stack}
              currentBet={game.currentBet}
              heroBetThisStreet={hero.betThisStreet}
              disabled={game.phase !== 'hero-turn'}
              onAction={handleAction}
            />
          </div>
        )}

        {dealt && game.phase === 'hero-turn' && (
          <div className="turn-hint">Your turn — choose an action</div>
        )}
      </div>

      <div className="side-panel">
        {dealt && game.actions.length > 0 && (
          <div className="panel-section">
            <h3>Actions</h3>
            <GameLog actions={game.actions} players={game.players} />
          </div>
        )}

        {isFinished && !allShown && (
          <button className="btn btn-show" onClick={handleShowAll}>
            Show All Hands
          </button>
        )}

        {isFinished && allShown && (
          <div className="panel-section">
            <h3>Result</h3>
            {game.result && (
              <div className="result-box">
                {game.result.winners.includes(0) ? (
                  <div className="result-win">
                    {game.result.winners.length > 1
                      ? `Split pot — you won ${Math.floor(game.result.pot / game.result.winners.length)} chips`
                      : `You won ${game.result.pot} chips!`}
                  </div>
                ) : (
                  <div className="result-lose">
                    {game.players[game.result.winnerIdx].name} won {game.result.pot} chips
                  </div>
                )}
                <div className="result-detail">
                  Winning hand: {game.result.handName}
                </div>
              </div>
            )}
            <FeedbackPanel feedback={game.feedback} />
            <button className="btn btn-deal" onClick={handleDeal} style={{ marginTop: 16 }}>
              New Hand
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
