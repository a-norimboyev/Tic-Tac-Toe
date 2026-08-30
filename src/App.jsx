import { useEffect, useRef, useState } from "react";
import { playSound } from "./audio";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const EMPTY_BOARD = ["", "", "", "", "", "", "", "", ""];
const SCORE_KEY = "xo-neon-arena-score-v3";
const STREAK_KEY = "xo-neon-streak-v1";
const THEME_KEY = "xo-neon-theme";
const SOUND_KEY = "xo-neon-sound";

const DIFFICULTIES = {
  medium: {
    id: "medium",
    name: "O‘rtacha",
    badge: "50% AI",
    tag: "O‘rtacha AI",
    color: "#66e3a1",
    desc: "AI ba'zida xato qiladi va himoyani o‘tkazib yuborishi mumkin. Sinab ko‘rish va g‘alaba qozonish uchun qulay daraja!",
    stat: "Yutish imkoni: Yuqori",
  },
  hard: {
    id: "hard",
    name: "Qiyin",
    badge: "85% AI",
    tag: "Qiyin AI",
    color: "#ffd166",
    desc: "AI o‘z yurishlarini puxta hisoblaydi, hujumlaringizni to‘sadi va g‘alaba uchun jiddiy raqobat ko‘rsatadi.",
    stat: "Yutish imkoni: O‘rtacha",
  },
  expert: {
    id: "expert",
    name: "Yuqori",
    badge: "100% AI",
    tag: "Minimax AI",
    color: "#ff7aa8",
    desc: "Yengilmas Minimax algoritmi. Birorta ham xatoga yo‘l qo‘ymaydi — uni yengib bo‘lmaydi (eng yaxshi natija: durrang)!",
    stat: "Yutish imkoni: 0% (Yengilmas)",
  },
};

const THEMES = [
  { id: "cyberpunk", name: "Cyberpunk", icon: "🌌", color: "#6ee7ff" },
  { id: "matrix", name: "Matrix", icon: "🟢", color: "#00ff88" },
  { id: "sunset", name: "Sunset", icon: "🔥", color: "#ff8c42" },
];

function getResult(state) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (state[a] && state[a] === state[b] && state[a] === state[c]) {
      return { winner: state[a], line };
    }
  }
  return state.every(Boolean) ? { winner: "draw", line: [] } : null;
}

function minimax(state, maximizing, depth = 0) {
  const result = getResult(state);
  if (result) {
    if (result.winner === "0") return 10 - depth;
    if (result.winner === "X") return depth - 10;
    return 0;
  }

  let best = maximizing ? -Infinity : Infinity;
  state.forEach((value, index) => {
    if (!value) {
      state[index] = maximizing ? "0" : "X";
      const score = minimax(state, !maximizing, depth + 1);
      state[index] = "";
      best = maximizing ? Math.max(best, score) : Math.min(best, score);
    }
  });
  return best;
}

function findBestMove(state, targetSymbol = "0") {
  const isZero = targetSymbol === "0";
  let bestScore = isZero ? -Infinity : Infinity;
  let choices = [];

  state.forEach((value, index) => {
    if (!value) {
      state[index] = targetSymbol;
      const score = minimax(state, !isZero);
      state[index] = "";
      if (isZero) {
        if (score > bestScore) {
          bestScore = score;
          choices = [index];
        } else if (score === bestScore) {
          choices.push(index);
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          choices = [index];
        } else if (score === bestScore) {
          choices.push(index);
        }
      }
    }
  });
  if (choices.includes(4)) return 4;
  const corners = choices.filter((index) => [0, 2, 6, 8].includes(index));
  const pool = corners.length ? corners : choices;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getWinningIndex(state, symbol) {
  for (let i = 0; i < state.length; i++) {
    if (!state[i]) {
      const copy = [...state];
      copy[i] = symbol;
      const res = getResult(copy);
      if (res && res.winner === symbol) return i;
    }
  }
  return -1;
}

function getAvailableIndices(state) {
  const indices = [];
  state.forEach((v, i) => {
    if (!v) indices.push(i);
  });
  return indices;
}

function computeAIMove(state, difficulty) {
  const available = getAvailableIndices(state);
  if (available.length === 0) return -1;

  if (difficulty === "expert") {
    return findBestMove(state, "0");
  }

  if (difficulty === "hard") {
    const winMove = getWinningIndex(state, "0");
    if (winMove !== -1) return winMove;

    const blockMove = getWinningIndex(state, "X");
    if (blockMove !== -1 && Math.random() < 0.9) return blockMove;

    if (Math.random() < 0.75) {
      return findBestMove(state, "0");
    }
    const centerAndCorners = available.filter((i) => [4, 0, 2, 6, 8].includes(i));
    const pool = centerAndCorners.length ? centerAndCorners : available;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Medium:
  const winMove = getWinningIndex(state, "0");
  if (winMove !== -1 && Math.random() < 0.7) return winMove;

  const blockMove = getWinningIndex(state, "X");
  if (blockMove !== -1 && Math.random() < 0.5) return blockMove;

  if (Math.random() < 0.35) {
    return findBestMove(state, "0");
  }
  return available[Math.floor(Math.random() * available.length)];
}

function readScore() {
  try {
    const saved = JSON.parse(localStorage.getItem(SCORE_KEY));
    return {
      X: Number.isFinite(saved?.X) ? saved.X : 0,
      "0": Number.isFinite(saved?.["0"]) ? saved["0"] : 0,
      draw: Number.isFinite(saved?.draw) ? saved.draw : 0,
    };
  } catch {
    return { X: 0, "0": 0, draw: 0 };
  }
}

function readStreak() {
  try {
    const saved = JSON.parse(localStorage.getItem(STREAK_KEY));
    return {
      current: Number.isFinite(saved?.current) ? saved.current : 0,
      max: Number.isFinite(saved?.max) ? saved.max : 0,
    };
  } catch {
    return { current: 0, max: 0 };
  }
}

function Confetti() {
  return (
    <div className="celebration" aria-hidden="true">
      {Array.from({ length: 38 }, (_, index) => (
        <i
          className="confetti"
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            background: ["#6ee7ff", "#b78cff", "#66e3a1", "#ffd166", "#ff7aa8", "#00ff88"][index % 6],
            "--drift": `${((index * 53) % 180) - 90}px`,
            animationDelay: `${(index % 8) * 0.04}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [history, setHistory] = useState([EMPTY_BOARD]);
  const [turn, setTurn] = useState("X");
  const [mode, setMode] = useState("computer");
  const [difficulty, setDifficulty] = useState("hard");
  const [gameOver, setGameOver] = useState(false);
  const [winningLine, setWinningLine] = useState([]);
  const [scores, setScores] = useState(readScore);
  const [streak, setStreak] = useState(readStreak);
  const [celebrate, setCelebrate] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [hintIndex, setHintIndex] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem(SOUND_KEY);
    return saved !== null ? saved === "true" : true;
  });
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "cyberpunk");
  const [blitzMode, setBlitzMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  const timerRef = useRef(null);
  const blitzIntervalRef = useRef(null);
  const hintTimeoutRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  }, [streak]);

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(blitzIntervalRef.current);
      clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  // Blitz Timer logic
  useEffect(() => {
    if (!blitzMode || gameOver) {
      clearInterval(blitzIntervalRef.current);
      return;
    }

    setTimeLeft(10);
    clearInterval(blitzIntervalRef.current);

    blitzIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(blitzIntervalRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(blitzIntervalRef.current);
  }, [turn, blitzMode, gameOver]);

  function handleTimeOut() {
    if (gameOver || thinking) return;
    const available = getAvailableIndices(board);
    if (available.length > 0) {
      const randomIdx = available[Math.floor(Math.random() * available.length)];
      applyMove(randomIdx, turn);
    }
  }

  function finish(result) {
    setGameOver(true);
    setWinningLine(result.line);
    setHintIndex(null);

    setScores((current) => ({
      ...current,
      [result.winner === "draw" ? "draw" : result.winner]:
        current[result.winner === "draw" ? "draw" : result.winner] + 1,
    }));

    if (result.winner === "X") {
      playSound("win", soundEnabled);
      setCelebrate(true);
      if (mode === "computer") {
        setStreak((prev) => {
          const nextCur = prev.current + 1;
          return { current: nextCur, max: Math.max(nextCur, prev.max) };
        });
      }
    } else if (result.winner === "0") {
      if (mode === "computer") {
        playSound("lose", soundEnabled);
        setStreak((prev) => ({ ...prev, current: 0 }));
      } else {
        playSound("win", soundEnabled);
        setCelebrate(true);
      }
    } else {
      playSound("draw", soundEnabled);
      if (mode === "computer") {
        setStreak((prev) => ({ ...prev, current: 0 }));
      }
    }
  }

  function applyMove(index, symbol, state = board) {
    const next = [...state];
    next[index] = symbol;
    const result = getResult(next);
    setBoard(next);
    setHistory((prev) => [...prev, next]);
    setHintIndex(null);

    playSound(symbol === "X" ? "x-move" : "zero-move", soundEnabled);

    if (result) {
      finish(result);
      return true;
    }
    setTurn(symbol === "X" ? "0" : "X");
    return false;
  }

  function computerMove(state) {
    const index = computeAIMove([...state], difficulty);
    setThinking(false);
    if (index >= 0) {
      applyMove(index, "0", state);
    }
  }

  function handleCell(index) {
    if (gameOver || board[index] || thinking) return;
    const ended = applyMove(index, turn);
    if (ended || mode !== "computer" || turn !== "X") return;
    setThinking(true);
    const nextState = [...board];
    nextState[index] = "X";
    timerRef.current = setTimeout(() => computerMove(nextState), 380);
  }

  function restart() {
    clearTimeout(timerRef.current);
    clearInterval(blitzIntervalRef.current);
    clearTimeout(hintTimeoutRef.current);
    setBoard([...EMPTY_BOARD]);
    setHistory([EMPTY_BOARD]);
    setTurn("X");
    setGameOver(false);
    setWinningLine([]);
    setThinking(false);
    setCelebrate(false);
    setHintIndex(null);
    setTimeLeft(10);
    playSound("click", soundEnabled);
  }

  function undoMove() {
    if (thinking || history.length <= 1) return;
    clearTimeout(timerRef.current);
    clearTimeout(hintTimeoutRef.current);
    playSound("click", soundEnabled);

    setGameOver(false);
    setWinningLine([]);
    setCelebrate(false);
    setHintIndex(null);

    if (mode === "computer") {
      if (history.length >= 3) {
        const targetState = history[history.length - 3];
        setHistory((prev) => prev.slice(0, prev.length - 2));
        setBoard(targetState);
        setTurn("X");
      } else if (history.length === 2) {
        setHistory([EMPTY_BOARD]);
        setBoard([...EMPTY_BOARD]);
        setTurn("X");
      }
    } else {
      const targetState = history[history.length - 2];
      setHistory((prev) => prev.slice(0, prev.length - 1));
      setBoard(targetState);
      setTurn(turn === "X" ? "0" : "X");
    }
  }

  function triggerHint() {
    if (gameOver || thinking) return;
    const best = findBestMove([...board], turn);
    if (best >= 0) {
      setHintIndex(best);
      playSound("hint", soundEnabled);
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => setHintIndex(null), 3500);
    }
  }

  function switchMode(nextMode) {
    if (mode === nextMode) return;
    setMode(nextMode);
    playSound("click", soundEnabled);
    restart();
  }

  function selectDifficulty(diff) {
    if (difficulty === diff) return;
    setDifficulty(diff);
    playSound("click", soundEnabled);
    restart();
  }

  function clearScore() {
    playSound("click", soundEnabled);
    setScores({ X: 0, "0": 0, draw: 0 });
    setStreak({ current: 0, max: 0 });
  }

  function toggleSound() {
    setSoundEnabled((prev) => !prev);
  }

  const currentDiff = DIFFICULTIES[difficulty];
  const result = gameOver ? getResult(board) : null;
  const xName = mode === "computer" ? "Siz" : "1-o‘yinchi";
  const zeroName = mode === "computer" ? "Kompyuter" : "2-o‘yinchi";
  const zeroRole = mode === "computer" ? currentDiff.tag : "Ikkinchi o‘yinchi";

  const status = result?.winner === "draw"
    ? "Durrang! Yaxshi o‘yin."
    : result?.winner
      ? mode === "computer"
        ? (result.winner === "X" ? "Siz g‘alaba qozondingiz! 🎉" : "Kompyuter g‘alaba qozondi! 🤖")
        : `${result.winner} g‘alaba qozondi! 🎉`
      : thinking
        ? "Kompyuter o‘ylamoqda…"
        : mode === "computer"
          ? "Sizning navbatingiz (X)"
          : `${turn} navbati`;

  return (
    <main className="app">
      <header className="header">
        <div>
          <div className="brand-row">
            <span className="logo-mark">×0</span>
            <span className="brand-name">NEON ARENA</span>
            <span className="beta-pill">ULTRA</span>
            <div className="header-controls">
              <button
                className={`icon-btn ${soundEnabled ? "active" : ""}`}
                onClick={toggleSound}
                title={soundEnabled ? "Ovozni o‘chirish" : "Ovozni yoqish"}
                aria-label="Ovoz sozlamasi"
              >
                {soundEnabled ? "🔊" : "🔇"}
              </button>
              <div className="theme-pills">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={`theme-btn ${theme === t.id ? "active" : ""}`}
                    onClick={() => setTheme(t.id)}
                    title={`${t.name} mavzusi`}
                  >
                    {t.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="eyebrow">Klassik o‘yin</p>
          <h1>X va 0 <span>ARENA</span></h1>
          <p className="subtitle">Aql bilan o‘ynang. Har bir yurish g‘alabaga yaqinlashtiradi.</p>
        </div>

        <div className="header-right">
          <div className="mode-switcher" role="group" aria-label="O‘yin rejimini tanlang">
            <button className={mode === "computer" ? "mode-btn active" : "mode-btn"} onClick={() => switchMode("computer")}>
              Kompyuterga qarshi
            </button>
            <button className={mode === "twoPlayer" ? "mode-btn active" : "mode-btn"} onClick={() => switchMode("twoPlayer")}>
              2 kishilik
            </button>
          </div>
          <div className="blitz-toggle">
            <button
              className={`blitz-btn ${blitzMode ? "active" : ""}`}
              onClick={() => setBlitzMode(!blitzMode)}
              title="10 soniyalik tezkor taymer"
            >
              ⏱️ Blitz Taymer: {blitzMode ? "YOQILGAN" : "O‘CHIK"}
            </button>
          </div>
        </div>
      </header>

      <section className="layout">
        <section className="panel game-panel" aria-label="O‘yin taxtasi">
          <div className="match-line">
            <span>Jonli o‘yin</span>
            <span className="match-id">
              {mode === "computer" ? `DARAJA: ${currentDiff.name.toUpperCase()}` : "2 KISHILIK REJIM"}
            </span>
          </div>

          <div className="status-row">
            <p className="status" aria-live="polite">
              <span className={`status-dot ${result?.winner === "draw" ? "draw" : result ? "win" : turn === "0" ? "zero" : ""}`} />
              <span>{status}</span>
            </p>
            <div className="status-meta">
              {blitzMode && !gameOver && (
                <span className={`timer-badge ${timeLeft <= 3 ? "danger" : ""}`}>
                  ⏱️ {timeLeft}s
                </span>
              )}
              <span className="turn-label">
                {result ? `${result.winner === "draw" ? "O‘yin" : result.winner} tugadi` : `${turn} navbatda`}
              </span>
            </div>
          </div>

          {blitzMode && !gameOver && (
            <div className="timer-bar-container">
              <div className="timer-bar-fill" style={{ width: `${(timeLeft / 10) * 100}%` }} />
            </div>
          )}

          <div className="player-bar">
            <div className={`player-card ${turn === "X" && !gameOver ? "active" : ""}`}>
              <span className="player-symbol">X</span>
              <div>
                <div className="player-name">{xName}</div>
                <div className="player-role">Birinchi o‘yinchi</div>
              </div>
            </div>
            <span className="versus">VS</span>
            <div className={`player-card ${turn === "0" && !gameOver ? "active" : ""}`}>
              <span className="player-symbol">0</span>
              <div>
                <div className="player-name">{zeroName}</div>
                <div className="player-role">{zeroRole}</div>
              </div>
            </div>
          </div>

          <div className="board" role="grid" aria-label="3x3 o‘yin taxtasi">
            {board.map((value, index) => {
              const isHint = hintIndex === index;
              return (
                <button
                  className={`cell ${value === "X" ? "x" : value === "0" ? "zero" : ""} ${winningLine.includes(index) ? "winner" : ""} ${isHint ? "hint-cell" : ""}`}
                  key={index}
                  disabled={Boolean(value) || gameOver || thinking}
                  onClick={() => handleCell(index)}
                  aria-label={`${index + 1}-katak, ${value || "bo‘sh"}`}
                >
                  {value}
                  {isHint && <span className="hint-pulse">★ TAVSIYA</span>}
                </button>
              );
            })}
          </div>

          <div className="actions-grid">
            <button className="action-btn primary" onClick={restart}>↻ &nbsp; Yangi o‘yin</button>
            <button
              className="action-btn hint-btn"
              onClick={triggerHint}
              disabled={gameOver || thinking || Boolean(result)}
              title="Eng yaxshi yurishni ko‘rsatadi"
            >
              💡 &nbsp; Maslahat
            </button>
            <button
              className="action-btn undo-btn"
              onClick={undoMove}
              disabled={thinking || history.length <= 1}
              title="Oxirgi yurishni bekor qilish"
            >
              ↩ &nbsp; Orqaga
            </button>
            <button className="action-btn" onClick={clearScore}>⌫ &nbsp; Tozalash</button>
          </div>
        </section>

        <aside className="side">
          <section className="panel score-panel">
            <div className="panel-heading">
              <h2>Hisoblar</h2>
              {streak.current > 0 && (
                <span className="streak-tag">🔥 {streak.current} ketma-ket</span>
              )}
              <span className="live-tag">JONLI</span>
            </div>
            <div className="scores">
              <div className="score x">
                <span className="score-number">{scores.X}</span>
                <span className="score-label">X g‘alabalari</span>
              </div>
              <div className="score zero">
                <span className="score-number">{scores["0"]}</span>
                <span className="score-label">0 g‘alabalari</span>
              </div>
              <div className="score draw">
                <span className="score-number">{scores.draw}</span>
                <span className="score-label">Durranglar</span>
              </div>
            </div>
            {mode === "computer" && (
              <div className="streak-row">
                <div className="streak-item">
                  <span className="streak-label">Joriy g‘alabalar seriyasi:</span>
                  <span className="streak-value">{streak.current} 🔥</span>
                </div>
                <div className="streak-item">
                  <span className="streak-label">Rekord seriya:</span>
                  <span className="streak-value">{streak.max} 🏆</span>
                </div>
              </div>
            )}
          </section>

          {mode === "computer" ? (
            <section className="panel hint-panel difficulty-panel">
              <div className="panel-heading">
                <div className="diff-title-row">
                  <div className="hint-icon">✦</div>
                  <h2>Qiyinlik darajasi</h2>
                </div>
                <span className="diff-badge" style={{ borderColor: currentDiff.color, color: currentDiff.color }}>
                  {currentDiff.badge}
                </span>
              </div>

              <div className="difficulty-buttons" role="group" aria-label="Qiyinlik darajasini tanlang">
                {Object.values(DIFFICULTIES).map((d) => {
                  const isActive = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      className={`diff-btn ${d.id} ${isActive ? "active" : ""}`}
                      onClick={() => selectDifficulty(d.id)}
                    >
                      <span className="diff-btn-dot" />
                      {d.name}
                    </button>
                  );
                })}
              </div>

              <p className="diff-description">
                <strong>{currentDiff.name}:</strong> {currentDiff.desc}
              </p>

              <div className="mini-stats">
                <span>3 × 3 taxta</span>
                <span>{currentDiff.tag}</span>
                <span>{currentDiff.stat}</span>
              </div>
            </section>
          ) : (
            <section className="panel hint-panel">
              <div className="hint-icon">👥</div>
              <p><strong>2 kishilik rejim:</strong> Bir xil qurilmada do‘stingiz bilan navbatma-navbat o‘ynang. Birinchi o‘yinchi <strong>X</strong>, ikkinchi o‘yinchi <strong>0</strong>.</p>
              <div className="mini-stats">
                <span>3 × 3 taxta</span>
                <span>Do‘stona o‘yin</span>
              </div>
            </section>
          )}
        </aside>
      </section>
      <p className="footer">React va Web Audio bilan qurilgan · Hisoblar brauzerda avtomatik saqlanadi</p>
      {celebrate && <Confetti />}
    </main>
  );
}