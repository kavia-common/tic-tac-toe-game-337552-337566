import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

/**
 * Test helpers
 */
function getSquares() {
  // Squares are <button> elements with aria-label "Square N, ..."
  return screen.getAllByRole("button", { name: /^Square \d+,/i });
}

function clickSquare(index) {
  const squares = getSquares();
  fireEvent.click(squares[index]);
  return getSquares(); // re-fetch to avoid stale references after rerender
}

describe("Tic Tac Toe core behaviors", () => {
  test("initial state: title renders, X goes first, board is empty, reset is available", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /tic tac toe/i })).toBeInTheDocument();

    // Status line should indicate X starts
    expect(screen.getByRole("status")).toHaveTextContent("Turn: X");

    // Board has 9 empty squares
    const squares = getSquares();
    expect(squares).toHaveLength(9);
    squares.forEach((sq, idx) => {
      expect(sq).toHaveTextContent("");
      expect(sq).toHaveAttribute("aria-label", `Square ${idx + 1}, empty`);
      expect(sq).not.toBeDisabled();
    });

    // Reset button present
    expect(screen.getByRole("button", { name: /reset game/i })).toBeInTheDocument();
  });

  test("turn alternation: first click places X then turn becomes O; second click places O then turn becomes X", () => {
    render(<App />);

    clickSquare(0);
    expect(getSquares()[0]).toHaveTextContent("X");
    expect(screen.getByRole("status")).toHaveTextContent("Turn: O");

    clickSquare(1);
    expect(getSquares()[1]).toHaveTextContent("O");
    expect(screen.getByRole("status")).toHaveTextContent("Turn: X");
  });

  test("win messaging: displays Winner and locks board after a winning move", () => {
    render(<App />);

    // X wins top row: X(0), O(3), X(1), O(4), X(2)
    clickSquare(0); // X
    clickSquare(3); // O
    clickSquare(1); // X
    clickSquare(4); // O
    clickSquare(2); // X -> win

    expect(screen.getByRole("status")).toHaveTextContent("Winner: X");

    // After win, all squares should be disabled (game over)
    getSquares().forEach((sq) => expect(sq).toBeDisabled());

    // Attempting to click does not change board
    const before = getSquares().map((sq) => sq.textContent);
    fireEvent.click(getSquares()[8]);
    const after = getSquares().map((sq) => sq.textContent);
    expect(after).toEqual(before);
  });

  test("draw messaging: displays Draw game and locks board when full with no winner", () => {
    render(<App />);

    /**
     * Draw sequence (indexes):
     * X:0 O:1 X:2
     * O:4 X:3 O:5
     * X:7 O:6 X:8
     *
     * Final board:
     * [X,O,X,
     *  X,O,O,
     *  O,X,X]
     */
    const moves = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    moves.forEach((idx) => clickSquare(idx));

    expect(screen.getByRole("status")).toHaveTextContent("Draw game");

    // Game over disables all squares
    getSquares().forEach((sq) => expect(sq).toBeDisabled());
  });

  test("reset: clears the board and restores Turn: X after a game over", () => {
    render(<App />);

    // Create a win for X (same as win test)
    clickSquare(0); // X
    clickSquare(3); // O
    clickSquare(1); // X
    clickSquare(4); // O
    clickSquare(2); // X -> win

    expect(screen.getByRole("status")).toHaveTextContent("Winner: X");

    fireEvent.click(screen.getByRole("button", { name: /reset game/i }));

    // Back to initial state
    expect(screen.getByRole("status")).toHaveTextContent("Turn: X");
    const squares = getSquares();
    squares.forEach((sq, idx) => {
      expect(sq).toHaveTextContent("");
      expect(sq).toHaveAttribute("aria-label", `Square ${idx + 1}, empty`);
      expect(sq).not.toBeDisabled();
    });
  });
});
