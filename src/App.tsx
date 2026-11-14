import { useCallback, useEffect, useRef, useState } from "react";

type Bubble = {
  id: number;
  x: number;
  y: number;
  color: number;
  heart?: boolean;
  popping?: number;
};

type GameStatus = "playing" | "won" | "lost";
type View = "game" | "collection";

const W = 720;
const H = 720;
const R = 25;
const X_GAP = 55;
const Y_GAP = 47;
const ROWS = 13;
const COLORS = ["#ef655d", "#f0a94c", "#f5d95a", "#8fcb66", "#75a8ed", "#d85a9c", "#8c5bd8"];
const DARKS = ["#b84342", "#c27d34", "#cfad34", "#5d9c4d", "#4b78bd", "#ad3d75", "#6441ac"];
const FACES = [
  ["•", "ᴗ", "•"],
  ["•", "⌣", "•"],
  ["•", "ө", "•"],
  ["•", "﹏", "•"],
  ["•", "⌒", "•"],
  ["•", "ᵕ", "•"],
  ["•", "o", "•"],
];
const JELLIES = [
  {
    name: "열정이",
    color: 0,
    cost: 0,
    trait: "마음이 너무 뜨거웠던 젤리",
    story:
      "열정이는 무엇이든 가장 잘해야 한다고 생각하던 학생이었어요. 쉬는 시간에도 쉬지 못하고 달리다가 뜨거워진 마음이 빨간 젤리로 녹아버렸죠. 이제는 천천히 해도 괜찮다는 말을 듣고 싶어 해요.",
  },
  {
    name: "몽글이",
    color: 1,
    cost: 20,
    trait: "걱정을 혼자 삼켰던 젤리",
    story:
      "몽글이는 친구들에게 걱정을 말하면 폐를 끼친다고 생각했어요. 속에 담아 둔 걱정이 점점 부풀어 어느 날 주황빛 젤리가 되었답니다. 누군가 먼저 '무슨 일 있어?'라고 물어보면 금세 마음을 열어요.",
  },
  {
    name: "반짝이",
    color: 2,
    cost: 30,
    trait: "칭찬 한마디를 기다린 젤리",
    story:
      "반짝이는 늘 다른 사람을 빛내 주었지만 정작 자신은 칭찬받아 본 적이 없었어요. 간직한 작은 바람이 노란 별빛 젤리가 되었죠. 진심 어린 칭찬을 들으면 누구보다 환하게 빛나요.",
  },
  {
    name: "느긋이",
    color: 3,
    cost: 40,
    trait: "잠깐 멈추고 싶었던 젤리",
    story:
      "느긋이는 빽빽한 일정표를 따라가느라 좋아하는 풀 냄새도 잊고 살았어요. 어느 날 운동장 잔디에 누운 채 초록 젤리가 되었답니다. 아무것도 하지 않는 시간도 소중하다는 걸 배우는 중이에요.",
  },
  {
    name: "소심이",
    color: 4,
    cost: 50,
    trait: "하고 싶은 말을 숨긴 젤리",
    story:
      "소심이는 손을 들고 싶어도 틀릴까 봐 늘 책상만 바라봤어요. 삼킨 말들이 파란 물방울처럼 차올라 젤리가 되었죠. 기다려 주는 친구 앞에서는 아주 멋진 이야기를 들려준답니다.",
  },
  {
    name: "두근이",
    color: 5,
    cost: 60,
    trait: "좋아하는 마음이 넘친 젤리",
    story:
      "두근이는 모두를 좋아해서 부탁을 거절하지 못했어요. 다른 사람을 챙기느라 지친 마음이 분홍 하트 젤리가 되었답니다. 이제는 자기 마음도 먼저 돌보는 연습을 하고 있어요.",
  },
  {
    name: "새벽이",
    color: 6,
    cost: 70,
    trait: "혼자 깨어 있던 젤리",
    story:
      "새벽이는 내일이 걱정되어 매일 밤 늦도록 잠들지 못했어요. 창밖의 보랏빛 새벽을 너무 오래 바라보다가 보라 젤리가 되었죠. 따뜻한 우유와 다정한 이야기를 들으면 편안히 잠들 수 있어요.",
  },
];

const cellCenter = (row: number, col: number) => ({
  x: 73 + col * X_GAP + (row % 2 ? X_GAP / 2 : 0),
  y: 52 + row * Y_GAP,
});

function initialBubbles() {
  const bubbles: Bubble[] = [];
  let id = 1;
  for (let row = 0; row < 5; row++) {
    const count = row % 2 ? 10 : 11;
    for (let col = 0; col < count; col++) {
      const { x, y } = cellCenter(row, col);
      bubbles.push({
        id: id++,
        x,
        y,
        color: (row * 3 + col * 2 + Math.floor(col / 3)) % 6,
        heart: (row + col) % 7 === 3,
      });
    }
  }
  return bubbles;
}

function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 2.6 6.1 6.6.6-5 4.4 1.5 6.5L12 16.2l-5.7 3.4 1.5-6.5-5-4.4 6.6-.6L12 2Z" />
    </svg>
  );
}

function JellyPreview({ color, heart = false }: { color: number; heart?: boolean }) {
  return (
    <div
      className={`preview-jelly ${heart ? "preview-heart" : ""}`}
      style={{ "--jelly": COLORS[color], "--jelly-dark": DARKS[color] } as React.CSSProperties}
    >
      <i className="eye eye-left" />
      <i className="eye eye-right" />
      <i className="mouth" />
    </div>
  );
}

function Doctor() {
  return (
    <img
      className="doctor"
      src="/doctor.png"
      alt="젤리 블래스터를 든 픽셀 아트 보건교사"
      draggable={false}
    />
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(12340);
  const [shots, setShots] = useState(24);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [currentColor, setCurrentColor] = useState(5);
  const [nextColor, setNextColor] = useState(5);
  const [combo, setCombo] = useState(2);
  const [gameKey, setGameKey] = useState(0);
  const [view, setView] = useState<View>("game");
  const [coins, setCoins] = useState(120);
  const [unlocked, setUnlocked] = useState<Set<number>>(() => new Set([0]));
  const [selectedJelly, setSelectedJelly] = useState(0);
  const pausedRef = useRef(paused);
  const statusRef = useRef<GameStatus>(status);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const restart = useCallback(() => {
    setScore(12340);
    setShots(24);
    setPaused(false);
    setStatus("playing");
    setCurrentColor(5);
    setNextColor(5);
    setCombo(2);
    setGameKey((v) => v + 1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let bubbles = initialBubbles();
    let projectile: (Bubble & { vx: number; vy: number }) | null = null;
    let aimX = W / 2;
    let aimY = 330;
    let current = 5;
    let next = 5;
    let id = 1000;
    let raf = 0;
    let last = performance.now();
    let burst = 0;

    const randomAvailableColor = () => {
      const present = [...new Set(bubbles.map((b) => b.color))];
      return (
        present[Math.floor(Math.random() * present.length)] ??
        Math.floor(Math.random() * COLORS.length)
      );
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform((rect.width / W) * dpr, 0, 0, (rect.height / H) * dpr, 0, 0);
    };

    const drawPixelCloud = (x: number, y: number, scale = 1) => {
      ctx.fillStyle = "rgba(255,255,255,.46)";
      const u = 11 * scale;
      [
        [0, 1],
        [1, 0],
        [2, 0],
        [3, 1],
        [1, 1],
        [2, 1],
        [4, 1],
      ].forEach(([cx, cy]) => ctx.fillRect(x + cx * u, y + cy * u, u + 1, u + 1));
    };

    const drawBubble = (b: Bubble, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const r = R * (b.popping ? Math.max(0.1, 1 - b.popping) : 1);
      ctx.translate(b.x, b.y);
      ctx.shadowColor = DARKS[b.color];
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = DARKS[b.color];
      ctx.beginPath();
      if (b.heart) {
        ctx.moveTo(0, r * 0.9);
        ctx.bezierCurveTo(-r * 1.15, r * 0.18, -r * 1.08, -r * 0.65, -r * 0.42, -r * 0.75);
        ctx.bezierCurveTo(-r * 0.1, -r * 0.82, 0, -r * 0.55, 0, -r * 0.45);
        ctx.bezierCurveTo(0, -r * 0.55, r * 0.1, -r * 0.82, r * 0.42, -r * 0.75);
        ctx.bezierCurveTo(r * 1.08, -r * 0.65, r * 1.15, r * 0.18, 0, r * 0.9);
      } else {
        ctx.moveTo(-r * 0.95, r * 0.35);
        ctx.quadraticCurveTo(-r * 1.1, -r * 0.75, -r * 0.22, -r);
        ctx.quadraticCurveTo(r * 0.75, -r * 1.06, r, -r * 0.2);
        ctx.quadraticCurveTo(r * 1.03, r * 0.75, r * 0.15, r);
        ctx.quadraticCurveTo(-r * 0.75, r * 1.04, -r * 0.95, r * 0.35);
      }
      ctx.fill();
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = COLORS[b.color];
      ctx.translate(0, -3);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.54)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-r * 0.42, -r * 0.42, r * 0.18, Math.PI, Math.PI * 1.55);
      ctx.stroke();
      ctx.fillStyle = "#343052";
      ctx.beginPath();
      ctx.arc(-r * 0.3, 1, 2.5, 0, Math.PI * 2);
      ctx.arc(r * 0.3, 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#343052";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const mouth = FACES[b.color][1];
      if (mouth === "o" || mouth === "ө") ctx.arc(0, 8, 3, 0, Math.PI * 2);
      else ctx.arc(0, 5, 5, 0.25, Math.PI - 0.25);
      ctx.stroke();
      if (b.color === 5) {
        ctx.fillStyle = "#ffb4c8";
        ctx.beginPath();
        ctx.arc(-r * 0.55, 8, 3, 0, Math.PI * 2);
        ctx.arc(r * 0.55, 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const nearestNeighbors = (source: Bubble, list = bubbles) =>
      list.filter((b) => b.id !== source.id && Math.hypot(b.x - source.x, b.y - source.y) < 61);

    const resolveMatches = (added: Bubble) => {
      const cluster: Bubble[] = [];
      const queue = [added];
      const seen = new Set<number>();
      while (queue.length) {
        const b = queue.shift()!;
        if (seen.has(b.id) || b.color !== added.color) continue;
        seen.add(b.id);
        cluster.push(b);
        nearestNeighbors(b).forEach((n) => queue.push(n));
      }

      if (cluster.length < 3) return;
      const removed = new Set(cluster.map((b) => b.id));
      const connected = new Set<number>();
      const topQueue = bubbles.filter((b) => b.y < 82 && !removed.has(b.id));
      while (topQueue.length) {
        const b = topQueue.shift()!;
        if (connected.has(b.id) || removed.has(b.id)) continue;
        connected.add(b.id);
        nearestNeighbors(b).forEach((n) => {
          if (!removed.has(n.id)) topQueue.push(n);
        });
      }
      bubbles.forEach((b) => {
        if (!removed.has(b.id) && !connected.has(b.id)) removed.add(b.id);
      });
      bubbles = bubbles.filter((b) => !removed.has(b.id));
      const earned = removed.size * 120 * Math.max(1, Math.min(4, Math.floor(removed.size / 3)));
      setScore((s) => s + earned);
      setCombo(Math.min(9, Math.max(2, Math.floor(removed.size / 3) + 1)));
      burst = 1;
      if (bubbles.length === 0) {
        statusRef.current = "won";
        setStatus("won");
        setCoins((value) => value + 30);
      }
    };

    const attachProjectile = () => {
      if (!projectile) return;
      let best = { row: 0, col: 0, dist: Infinity, x: 0, y: 0 };
      for (let row = 0; row < ROWS; row++) {
        const count = row % 2 ? 10 : 11;
        for (let col = 0; col < count; col++) {
          const p = cellCenter(row, col);
          if (bubbles.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 20)) continue;
          const dist = Math.hypot(projectile.x - p.x, projectile.y - p.y);
          if (dist < best.dist) best = { row, col, dist, ...p };
        }
      }
      const placed: Bubble = {
        id: id++,
        x: best.x,
        y: best.y,
        color: projectile.color,
        heart: Math.random() > 0.82,
      };
      bubbles.push(placed);
      projectile = null;
      resolveMatches(placed);
      current = next;
      next = randomAvailableColor();
      setCurrentColor(current);
      setNextColor(next);
      setShots((s) => {
        const remaining = s - 1;
        if (remaining <= 0 && bubbles.length > 0) {
          statusRef.current = "lost";
          setStatus("lost");
        }
        return Math.max(0, remaining);
      });
      if (placed.y > 545) {
        statusRef.current = "lost";
        setStatus("lost");
      }
    };

    const pointerPosition = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * W,
        y: ((event.clientY - rect.top) / rect.height) * H,
      };
    };

    const onMove = (event: PointerEvent) => {
      const p = pointerPosition(event);
      aimX = Math.max(50, Math.min(W - 50, p.x));
      aimY = Math.max(70, Math.min(590, p.y));
    };
    const onDown = (event: PointerEvent) => {
      event.preventDefault();
      const p = pointerPosition(event);
      aimX = p.x;
      aimY = p.y;
      if (pausedRef.current || statusRef.current !== "playing" || projectile || p.y > 635) return;
      const origin = { x: W / 2, y: 641 };
      const angle = Math.atan2(Math.min(p.y, 590) - origin.y, p.x - origin.x);
      if (Math.sin(angle) > -0.18) return;
      const speed = 650;
      projectile = {
        id: id++,
        x: origin.x,
        y: origin.y,
        color: current,
        heart: Math.random() > 0.82,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    };

    const draw = (now: number) => {
      const dt = Math.min(0.025, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, "#555293");
      gradient.addColorStop(0.55, "#7775bc");
      gradient.addColorStop(1, "#a8b6e4");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      drawPixelCloud(18, 440, 1.25);
      drawPixelCloud(565, 495, 1);
      drawPixelCloud(90, 545, 0.85);
      ctx.fillStyle = "rgba(85,91,151,.22)";
      for (let x = -10; x < W; x += 74) {
        const bh = 55 + ((x * 7) % 70);
        ctx.fillRect(x, H - bh, 62, bh);
        ctx.fillStyle = "rgba(255,255,255,.12)";
        for (let yy = H - bh + 15; yy < H - 10; yy += 22) {
          ctx.fillRect(x + 10, yy, 13, 10);
          ctx.fillRect(x + 34, yy, 13, 10);
        }
        ctx.fillStyle = "rgba(85,91,151,.22)";
      }

      if (!pausedRef.current && statusRef.current === "playing") {
        if (projectile) {
          projectile.x += projectile.vx * dt;
          projectile.y += projectile.vy * dt;
          if (projectile.x < R + 8) {
            projectile.x = R + 8;
            projectile.vx *= -1;
          }
          if (projectile.x > W - R - 8) {
            projectile.x = W - R - 8;
            projectile.vx *= -1;
          }
          const collision =
            projectile.y < R + 5 ||
            bubbles.some((b) => Math.hypot(b.x - projectile!.x, b.y - projectile!.y) < R * 1.88);
          if (collision) attachProjectile();
        }
      }

      bubbles.forEach((b) => drawBubble(b));

      const originX = W / 2;
      const originY = 641;
      if (!projectile && statusRef.current === "playing") {
        const angle = Math.atan2(aimY - originY, aimX - originX);
        ctx.fillStyle = "#f39ac3";
        for (let d = 65; d < 245; d += 36) {
          const px = originX + Math.cos(angle) * d;
          const py = originY + Math.sin(angle) * d;
          if (py < 40) break;
          ctx.beginPath();
          ctx.arc(px, py, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.translate(originX, originY + 29);
      ctx.fillStyle = "#343052";
      ctx.beginPath();
      ctx.roundRect(-67, -28, 134, 60, 28);
      ctx.fill();
      ctx.fillStyle = "#eee9fa";
      ctx.beginPath();
      ctx.roundRect(-60, -32, 120, 56, 25);
      ctx.fill();
      ctx.fillStyle = "#afa5cc";
      ctx.beginPath();
      ctx.roundRect(-38, 20, 76, 16, 8);
      ctx.fill();
      ctx.strokeStyle = "#353058";
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.restore();
      if (!projectile)
        drawBubble({ id: 0, x: originX, y: originY, color: current, heart: current === 5 });
      else drawBubble(projectile);

      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#353058";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(originX, 598);
      ctx.lineTo(originX - 16, 616);
      ctx.lineTo(originX - 7, 616);
      ctx.lineTo(originX - 7, 630);
      ctx.lineTo(originX + 7, 630);
      ctx.lineTo(originX + 7, 616);
      ctx.lineTo(originX + 16, 616);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (burst > 0) {
        burst -= dt * 2.2;
        ctx.save();
        ctx.globalAlpha = Math.max(0, burst);
        ctx.fillStyle = "#fff6a3";
        ctx.font = "900 34px Jua, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("NICE!", W / 2, 390 - (1 - burst) * 35);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    raf = requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(raf);
    };
  }, [gameKey, view]);

  const openJelly = (index: number) => {
    const jelly = JELLIES[index];
    if (unlocked.has(index)) {
      setSelectedJelly(index);
      return;
    }
    if (coins < jelly.cost) return;
    setCoins((value) => value - jelly.cost);
    setUnlocked((currentUnlocked) => new Set(currentUnlocked).add(index));
    setSelectedJelly(index);
  };

  const returnToGame = () => {
    restart();
    setView("game");
  };

  if (view === "collection") {
    const selected = JELLIES[selectedJelly];
    return (
      <main className="collection-shell">
        <header className="collection-header">
          <button className="back-button" onClick={returnToGame}>
            <span aria-hidden="true">‹</span> 게임으로
          </button>
          <div>
            <small>보건실 비밀 기록</small>
            <h1>젤리 도감</h1>
          </div>
          <div className="collection-coins">
            <span className="coin">J</span>
            <span>×</span>
            <strong>{coins}</strong>
          </div>
        </header>

        <section className="collection-content">
          <div className="jelly-grid" aria-label="젤리 목록">
            {JELLIES.map((jelly, index) => {
              const isUnlocked = unlocked.has(index);
              return (
                <button
                  className={`jelly-card ${selectedJelly === index && isUnlocked ? "selected" : ""} ${!isUnlocked ? "locked" : ""}`}
                  onClick={() => openJelly(index)}
                  disabled={!isUnlocked && coins < jelly.cost}
                  key={jelly.name}
                >
                  <span className="jelly-number">NO. {String(index + 1).padStart(2, "0")}</span>
                  <div className="card-jelly">
                    <JellyPreview color={jelly.color} heart={jelly.color === 5} />
                    {!isUnlocked && <span className="lock-mark">?</span>}
                  </div>
                  <strong>{isUnlocked ? jelly.name : "아직 모르는 젤리"}</strong>
                  <span className="unlock-cost">
                    {isUnlocked ? (
                      "사연 보기"
                    ) : coins < jelly.cost ? (
                      "코인이 부족해요"
                    ) : (
                      <>
                        <i className="tiny-coin">J</i> {jelly.cost} 해금
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <article className="story-book">
            <div className="story-tape" />
            <span className="story-label">JELLY STORY</span>
            <div className="story-jelly">
              <JellyPreview color={selected.color} heart={selected.color === 5} />
            </div>
            <small>NO. {String(selectedJelly + 1).padStart(2, "0")}</small>
            <h2>{selected.name}</h2>
            <h3>{selected.trait}</h3>
            <div className="story-divider">
              <StarIcon />
            </div>
            <p>{selected.story}</p>
            <div className="teacher-note">
              <img src="/doctor.png" alt="" />
              <span>
                “젤리의 이야기를 들어주면
                <br />
                마음이 조금씩 원래 모습으로 돌아와요.”
              </span>
            </div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <div className="sky-decor sky-star-one">✦</div>
      <div className="sky-decor sky-star-two">✦</div>
      <header className="topbar">
        <div className="teacher-badge">
          <span className="bunny" aria-hidden="true">
            <i />
            <b />
            <em />
          </span>
          <small>보건교사</small>
          <strong>안은영</strong>
          <span className="capsule" />
        </div>
        <div className="stat-card stage-card">
          <StarIcon />
          <span>STAGE 1-1</span>
        </div>
        <div className="stat-card score-card">
          <StarIcon />
          <span>SCORE</span>
          <strong>{score.toLocaleString()}</strong>
        </div>
        <div className="stat-card coin-card">
          <span className="coin">J</span>
          <span>×</span>
          <strong>{coins}</strong>
        </div>
        <button
          className="pause-button"
          onClick={() => status === "playing" && setPaused((v) => !v)}
          aria-label={paused ? "게임 계속하기" : "게임 일시정지"}
        >
          {paused ? (
            <span className="play-icon" />
          ) : (
            <>
              <i />
              <i />
            </>
          )}
        </button>
      </header>

      <section className="game-layout">
        <aside className="left-panel">
          <div className="shots-note paper-card">
            <span className="tape" />
            <small>남은 발사 횟수</small>
            <strong>{shots}</strong>
            <span className="mini-capsule" />
          </div>
          <Doctor />
        </aside>

        <div className="board-wrap">
          <canvas ref={canvasRef} className="game-canvas" aria-label="버블 슈터 게임 보드" />
          {(paused || status !== "playing") && (
            <div className="game-overlay">
              <div className="overlay-card">
                <JellyPreview color={status === "lost" ? 0 : 5} heart={status !== "lost"} />
                <h2>
                  {paused
                    ? "잠시 쉬는 중"
                    : status === "won"
                      ? "모든 젤리 정화 완료!"
                      : "발사 횟수를 다 썼어요"}
                </h2>
                <p>
                  {paused
                    ? "준비되면 다시 시작해요"
                    : status === "won"
                      ? "보건실이 다시 평화로워졌어요."
                      : "각도를 바꿔 다시 도전해 보세요."}
                </p>
                <button
                  onClick={
                    paused
                      ? () => setPaused(false)
                      : status === "won"
                        ? () => setView("collection")
                        : restart
                  }
                >
                  {paused ? "계속하기" : status === "won" ? "젤리 도감으로" : "다시 도전"}
                </button>
                {status === "won" && <span className="clear-reward">클리어 보상 +30 코인</span>}
              </div>
            </div>
          )}
        </div>

        <aside className="right-panel">
          <div className="combo-card paper-card">
            <span>콤보!</span>
            <strong>×{combo}</strong>
          </div>
          <div className="mission-card paper-card">
            <div className="mission-title">
              <StarIcon /> 미션
            </div>
            <p>
              젤리를 모두
              <br />
              제거하세요!
            </p>
            <JellyPreview color={5} />
          </div>
          <div className="next-bubble">
            <span>다음 젤리</span>
            <div className="preview-glass">
              <JellyPreview color={nextColor} heart />
            </div>
          </div>
        </aside>
      </section>
      <div className="foreground-jellies" aria-hidden="true">
        <JellyPreview color={3} />
        <JellyPreview color={4} />
        <JellyPreview color={2} />
      </div>
      <p className="help-text">화면을 움직여 조준하고 클릭하거나 터치해 발사하세요</p>
    </main>
  );
}
