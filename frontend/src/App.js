import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 * - Side effects:
 *   - minimal; console logging of flow start/reset/win for debuggability
 *   - focus management on reset and game over (accessibility)
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
 * @param {{
 *  value: Cell,
 *  onClick: () => void,
 *  isHighlighted: boolean,
 *  isDisabled: boolean,
 *  index: number,
 *  currentPlayer: ("X"|"O"),
 *  isGameOver: boolean
 * }} props
 * @returns {JSX.Element}
 */
function Square({ value, onClick, isHighlighted, isDisabled, index, currentPlayer, isGameOver }) {
  const ariaLabel = value ? `Square ${index + 1}, ${value}` : `Square ${index + 1}, empty`;

  // Helpful hint for screen readers:
  // - If empty and game is active: announces the action + which mark will be placed.
  // - If game over: avoid implying further action is possible.
  const ariaDescription = isGameOver
    ? "Game over."
    : value
      ? "Occupied."
      : `Press to place ${currentPlayer}.`;

  return (
    <button
      type="button"
      className={`ttt-square${isHighlighted ? " ttt-square--highlight" : ""}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-describedby={`square-desc-${index}`}
      aria-current={isHighlighted ? "true" : undefined}
    >
      <span className="ttt-square__value" aria-hidden="true">
        {value}
      </span>
      {/* Visually-hidden description for AT */}
      <span id={`square-desc-${index}`} className="sr-only">
        {ariaDescription}
      </span>
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

  const resetButtonRef = useRef(null);

  // Derive outcome from board (single canonical source of truth for win/draw).
  const outcome = useMemo(() => computeOutcome(board), [board]);
  const statusText = useMemo(() => getStatusText(outcome, currentPlayer), [outcome, currentPlayer]);

  const isGameOver = outcome.isGameOver;

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

  // Accessibility: move focus to the Reset button when the game ends.
  useEffect(() => {
    if (isGameOver) {
      resetButtonRef.current?.focus();
    }
  }, [isGameOver]);

  const resetGame = useCallback(() => {
    // eslint-disable-next-line no-console
    console.info("[TicTacToeGameFlow] reset");
    setBoard(createEmptyBoard());
    setCurrentPlayer(PLAYER_X);

    // After reset, keep keyboard users oriented.
    // Using rAF ensures focus happens after the state flush/rerender.
    window.requestAnimationFrame(() => {
      resetButtonRef.current?.focus();
    });
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
      if (isGameOver) return;

      // Guard: ignore if cell already set (prevents overwrites).
      if (board[index] !== null) return;

      // Valid move: update board and toggle player.
      setBoard((prev) => {
        const next = prev.slice();
        next[index] = currentPlayer;
        return next;
      });

      setCurrentPlayer((p) => nextPlayer(p));
    },
    [board, currentPlayer, isGameOver]
  );

  const statusTone = outcome.winner ? "win" : outcome.isDraw ? "draw" : "turn";

  const gameHelpText = isGameOver
    ? "Game over. Press Reset to play again."
    : "Use Tab to focus a square, then press Enter/Space to place your mark.";

  return (
    <div className="App">
      <main className="ttt-page" role="main">
        <section className="ttt-card" aria-label="Tic Tac Toe game">
          <header className="ttt-header">
            <h1 className="ttt-title">Tic Tac Toe</h1>
            <p className="ttt-subtitle">A clean, accessible 2‑player game.</p>
          </header>

          <div className={`ttt-status ttt-status--${statusTone}`} role="status" aria-live="polite">
            {statusText}
          </div>

          <div className="ttt-board-wrap">
            <div
              className="ttt-board"
              role="grid"
              aria-label="Tic Tac Toe board"
              aria-describedby="game-help"
            >
              {board.map((cell, idx) => (
                <Square
                  key={idx}
                  value={cell}
                  index={idx}
                  currentPlayer={currentPlayer}
                  isGameOver={isGameOver}
                  isHighlighted={Boolean(outcome.winningLine?.includes(idx))}
                  isDisabled={isGameOver || cell !== null}
                  onClick={() => handleSquareClick(idx)}
                />
              ))}
            </div>
          </div>

          <div className="ttt-actions">
            <button
              ref={resetButtonRef}
              type="button"
              className="ttt-reset-btn"
              onClick={resetGame}
              aria-label="Reset game"
            >
              Reset
            </button>
          </div>

          <p id="game-help" className="ttt-hint">
            {gameHelpText}
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
