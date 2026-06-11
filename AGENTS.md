# Poker Trainer — Agent Context

## Build commands
- `npm run dev` — start dev server
- `npm run build` — type-check and build (always run this before committing)

## Project structure
- `src/utils/types.ts` — `GameState`, `Player`, `PlayerAction`, etc.
- `src/utils/engine.ts` — game logic: dealing, betting, AI (one-per-tick via `processNextAi`), showdown, feedback
- `src/utils/card.ts` — card/suit/rank utilities
- `src/utils/evaluator.ts` — hand evaluation
- `src/App.tsx` — main UI with player count selector
- `src/components/ActionButtons.tsx` — fold/check/call/raise/all-in buttons
- `src/components/CardComponent.tsx` — card rendering
- `src/components/GameLog.tsx` — action log
- `src/components/FeedbackPanel.tsx` — post-hand review

## Conventions
- Hero is always `players[0]` (index 0)
- Folding: hero's fold only removes them from the hand; remaining bots continue playing out the streets with delays
- `PlayerAction.playerIdx` refers to the player index
- Blinds: SB = dealer+1, BB = dealer+2 (dealer+1 for heads-up)
- Full betting rounds: after a raise, all remaining players get a chance to act again (street ends when all active players except the last raiser have acted since the last raise)
- First to act preflop: first active player after BB (SB for heads-up)
- First to act postflop: first active player after dealer
- Stacks carry over between hands; total chips constant
- AI uses hand-strength-based decisions with pot odds
