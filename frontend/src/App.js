import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

/**
 * This file contains the UI boundary (React component) for the Tic-Tac-Toe game,
 * and a small, reusable, pure-ish "domain logic" section for computing outcomes.
 *
 * Flow name: TicTacToeGameFlow
 * Entry point: <App /> (this file)
 *
 * Contract:
 * - Inputs (UI events): square index clicks, reset clicks
 * - Outputs (UI): board state, current player, winner/draw status, winning line highlight
 * - Invariants:
 *   - board has length 9
 *   - each cell is null | "X" | "O"
 *   - currentPlayer is always "X" or "O"
 * - Errors: none expected; invalid clicks are ignored deterministically
 * - Side effects: minimal; console logging of flow start/reset/win for debuggability
 */

const PLAYER_X = "X";
const PLAYER_O = "O";

/**
 * All 8 potential winning line triplets (indexes into the 9-cell board).
 * Order is stable and used to return the first matching line for highlighting.
 */
const WINNING_LINES = Object.freeze([
  [0, 1, 2], // rows
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6], // cols
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8], // diagonals
  [2, 4, 6],
]);

/**
 * @typedef {("X"|"O"|null)} Cell
 */

/**
 * @typedef {Object} GameOutcome
 * @property {("X"|"O"|null)} winner - The winning player, if any.
 * @property {number[]|null} winningLine - The three indices that won, or null.
 * @property {boolean} isDraw - True if the game has no winner and no empty cells.
 * @property {boolean} isGameOver - True if winner exists OR draw.
 */

/**
 * Domain logic: compute outcome for a given board.
 * Pure function: no side effects, deterministic output.
 *
 * @param {Cell[]} board
 * @returns {GameOutcome}
 */
function computeOutcome(board) {
  // Validate invariant cheaply (useful during debugging if board ever changes shape).
  if (!Array.isArray(board) || board.length !== 9) {
    // In a UI app we avoid throwing here; return a safe "no outcome".
    return { winner: null, winningLine: null, isDraw: false, isGameOver: false };
  }

  for (const [a, b, c] of WINNING_LINES) {
    const v = board[a];
    if (v && v === board[b] && v === board[c]) {
      return { winner: v, winningLine: [a, b, c], isDraw: false, isGameOver: true };
    }
  }

  const hasEmpty = board.some((cell) => cell === null);
  const isDraw = !hasEmpty;
  return { winner: null, winningLine: null, isDraw, isGameOver: isDraw };
}

/**
 * Domain logic: toggle player symbol.
 * Pure function.
 *
 * @param {("X"|"O")} player
 * @returns {("X"|"O")}
 */
function nextPlayer(player) {
  return player === PLAYER_X ? PLAYER_O : PLAYER_X;
}

/**
 * Creates a new, empty game state board.
 * Pure function.
 *
 * @returns {Cell[]}
 */
function createEmptyBoard() {
  return Array(9).fill(null);
}

/**
 * Formats the status line shown above the board.
 * Pure function.
 *
 * @param {GameOutcome} outcome
 * @param {("X"|"O")} currentPlayer
 * @returns {string}
 */
function getStatusText(outcome, currentPlayer) {
  if (outcome.winner) return `Winner: ${outcome.winner}`;
  if (outcome.isDraw) return "Draw game";
  return `Turn: ${currentPlayer}`;
}

/**
 * A single square button.
 *
 * @param {{ value: Cell, onClick: () => void, isHighlighted: boolean, isDisabled: boolean, index: number }} props
 * @returns {JSX.Element}
 */
function Square({ value, onClick, isHighlighted, isDisabled, index }) {
  const ariaLabel = value ? `Square ${index + 1}, ${value}` : `Square ${index + 1}, empty`;
  return (
    <button
      type="button"
      className={`ttt-square${isHighlighted ? " ttt-square--highlight" : ""}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
    >
      {value}
    </button>
  );
}

// PUBLIC_INTERFACE
function App() {
  /**
   * UI Boundary state:
   * - board: Cell[9]
   * - currentPlayer: "X" | "O"
   */
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(PLAYER_X);

  // Derive outcome from board (single canonical source of truth for win/draw).
  const outcome = useMemo(() => computeOutcome(board), [board]);
  const statusText = useMemo(() => getStatusText(outcome, currentPlayer), [outcome, currentPlayer]);

  // Observability: log flow start (once).
  useEffect(() => {
    // Keep logs simple and stable for future debugging.
    // eslint-disable-next-line no-console
    console.info("[TicTacToeGameFlow] start");
  }, []);

  // Observability: log game-over transitions.
  useEffect(() => {
    if (outcome.winner) {
      // eslint-disable-next-line no-console
      console.info("[TicTacToeGameFlow] game_over winner=%s line=%o", outcome.winner, outcome.winningLine);
    } else if (outcome.isDraw) {
      // eslint-disable-next-line no-console
      console.info("[TicTacToeGameFlow] game_over draw=true");
    }
  }, [outcome.isDraw, outcome.winner, outcome.winningLine]);

  const resetGame = useCallback(() => {
    // eslint-disable-next-line no-console
    console.info("[TicTacToeGameFlow] reset");
    setBoard(createEmptyBoard());
    setCurrentPlayer(PLAYER_X);
  }, []);

  const handleSquareClick = useCallback(
    /**
     * Entry boundary for a user click on a square.
     * Contract:
     * - index must be 0..8
     * - if game is over or cell occupied, click is ignored deterministically
     *
     * @param {number} index
     */
    (index) => {
      // Guard: ignore out-of-range indexes (should never happen).
      if (index < 0 || index > 8) return;

      // Guard: if game already ended, ignore clicks.
      if (outcome.isGameOver) return;

      setBoard((prev) => {
        // Guard: ignore if cell already set (prevents overwrites).
        if (prev[index] !== null) return prev;

        const next = prev.slice();
        next[index] = currentPlayer;
        return next;
      });

      // Update the player turn only if the move is valid.
      // We cannot safely base this on board state here without duplicating logic;
      // instead, we optimistically toggle, and we ensure invalid moves exit early above.
      setCurrentPlayer((p) => nextPlayer(p));
    },
    [currentPlayer, outcome.isGameOver]
  );

  return (
    <div className="App">
      <main className="ttt-page" role="main">
        <section className="ttt-card" aria-label="Tic Tac Toe game">
          <h1 className="ttt-title">Tic Tac Toe</h1>

          <div className="ttt-status" role="status" aria-live="polite">
            {statusText}
          </div>

          <div className="ttt-board" role="grid" aria-label="Tic Tac Toe board">
            {board.map((cell, idx) => (
              <Square
                key={idx}
                value={cell}
                index={idx}
                isHighlighted={Boolean(outcome.winningLine?.includes(idx))}
                isDisabled={outcome.isGameOver || cell !== null}
                onClick={() => handleSquareClick(idx)}
              />
            ))}
          </div>

          <div className="ttt-actions">
            <button type="button" className="ttt-reset-btn" onClick={resetGame}>
              Reset
            </button>
          </div>

          <p className="ttt-hint">
            Tip: {PLAYER_X} goes first. Tap a square to place your mark.
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
