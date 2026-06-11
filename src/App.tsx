import { useState } from 'react'
import type { Action } from './utils/types'
import { dealNewHand, heroActs } from './utils/engine'
import { CardComponent } from './components/CardComponent'
import { ActionButtons } from './components/ActionButtons'
import { GameLog } from './components/GameLog'
import { FeedbackPanel } from './components/FeedbackPanel'
import { displayCard } from './utils/card'
import './App.css'

export default function App() {
  const [game, setGame] = useState(dealNewHand)
  const [showOpponent, setShowOpponent] = useState(false)
  const [dealt, setDealt] = useState(false)

  function handleDeal() {
    setGame(dealNewHand())
    setShowOpponent(false)
    setDealt(true)
  }

  function handleAction(action: Action, amount?: number) {
    const next = heroActs(game, action, amount)
    setGame(next)
    if (next.phase === 'finished') {
      setShowOpponent(true)
    }
  }

  function handleShowOpponent() {
    setShowOpponent(true)
  }

  const heroHand = dealt ? game.heroCards : null
  const oppHand = dealt ? game.opponentCards : null
  const community = game.communityCards
  const isFinished = game.phase === 'finished'

  return (
    <div className="app">
      <header className="header">
        <h1>♠ Poker Trainer ♥</h1>
        <p>Practice your Texas Hold'em decisions</p>
      </header>

      <div className="table">
        <div className="player-area opponent-area">
          <div className="player-label">Opponent</div>
          <div className="card-row">
            {oppHand && oppHand.map((c, i) => (
              <CardComponent key={i} card={c} hidden={!showOpponent} size="sm" />
            ))}
          </div>
          {showOpponent && oppHand && (
            <div style={{ fontSize: 11, color: '#8899aa', marginTop: 4 }}>
              {displayCard(oppHand[0])} {displayCard(oppHand[1])}
            </div>
          )}
          <div className="stack">
            Stack: {game.opponentStack}
          </div>
        </div>

        <div className="board-area">
          <div className="community-cards">
            {community.length === 0 && dealt && (
              <div className="community-label">Preflop</div>
            )}
            {community.length === 3 && <div className="community-label">Flop</div>}
            {community.length === 4 && <div className="community-label">Turn</div>}
            {community.length === 5 && <div className="community-label">River</div>}

            {!dealt ? (
              <div className="deal-prompt">Click "Deal Hand" to start</div>
            ) : (
              <div className="card-row">
                {[0, 1, 2, 3, 4].map(i => (
                  community[i] ? (
                    <CardComponent key={i} card={community[i]} size="md" />
                  ) : (
                    <div key={i} className="card-placeholder" />
                  )
                ))}
              </div>
            )}
          </div>

          <div className="pot-display">
            Pot: {game.pot}
          </div>
        </div>

        <div className="player-area hero-area">
          <div className="player-label">You</div>
          <div className="card-row">
            {heroHand && heroHand.map((c, i) => (
              <CardComponent key={i} card={c} size="sm" />
            ))}
          </div>
          <div className="stack">
            Stack: {game.heroStack}
          </div>
        </div>
      </div>

      <div className="controls">
        {!dealt && (
          <button className="btn btn-deal" onClick={handleDeal}>
            Deal Hand
          </button>
        )}

        {dealt && !isFinished && (
          <div>
            <ActionButtons
              heroStack={game.heroStack}
              currentBet={game.currentBet}
              heroBetThisStreet={game.heroBetThisStreet}
              disabled={game.phase !== 'hero-turn'}
              onAction={handleAction}
            />
            {game.phase === 'opponent-turn' && (
              <div style={{ textAlign: 'center', color: '#8899aa', fontSize: 13, marginTop: 4 }}>
                Opponent is deciding...
              </div>
            )}
          </div>
        )}

        {dealt && game.phase === 'hero-turn' && (
          <div style={{ textAlign: 'center', color: '#27ae60', fontSize: 13, marginTop: 4, fontWeight: 600 }}>
            Your turn — choose an action
          </div>
        )}
      </div>

      <div className="side-panel">
        {dealt && game.actions.length > 0 && (
          <div className="panel-section">
            <h3>Actions</h3>
            <GameLog actions={game.actions} />
          </div>
        )}

        {isFinished && !showOpponent && (
          <button className="btn btn-show" onClick={handleShowOpponent}>
            Show Opponent's Hand
          </button>
        )}

        {showOpponent && isFinished && (
          <div className="panel-section">
            <h3>Result</h3>
            {game.result && (
              <div className="result-box">
                {game.result.winner === 'hero' && (
                  <div className="result-win">You won {game.result.pot} chips!</div>
                )}
                {game.result.winner === 'opponent' && (
                  <div className="result-lose">Opponent won {game.result.pot} chips</div>
                )}
                {game.result.winner === 'tie' && (
                  <div className="result-tie">Split pot — {game.result.pot / 2} each</div>
                )}
                <div className="result-detail">
                  You: {game.result.heroHand} | Opponent: {game.result.opponentHand}
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
