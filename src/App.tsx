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
type View = "game" | "collection" | "shop";
type WeaponId = "blaster" | "bbgun" | "sword" | "rainbow" | "shield";

// Coins unlock a jelly's story without clearing its stage.
const JELLY_PRICE = 60;
const BASE_SHOTS = 12;

const WEAPONS: {
  id: WeaponId;
  name: string;
  price: number;
  effect: string;
  description: string;
}[] = [
  {
    id: "blaster",
    name: "젤리 블래스터",
    price: 0,
    effect: "기본 무기 · 발사 12회",
    description: "보건실 서랍에서 꺼낸 은영의 첫 무기. 무난하고 믿음직하다.",
  },
  {
    id: "bbgun",
    name: "비비탄 총",
    price: 100,
    effect: "발사 횟수 +3",
    description: "문방구에서 산 장난감 비비탄 총. 은영이 쏘면 젤리에게는 진짜다.",
  },
  {
    id: "sword",
    name: "플라스틱 장난감 칼",
    price: 150,
    effect: "클리어 코인 2배",
    description: "형광빛 플라스틱 칼. 휘두를 때마다 젤리가 남긴 코인이 두 배로 튄다.",
  },
  {
    id: "rainbow",
    name: "무지개 광선검",
    price: 250,
    effect: "젤리 6개 이상 터뜨리면 발사 +1",
    description: "은영의 기운을 가득 담은 최종 무기. 크게 터뜨릴수록 힘이 돌아온다.",
  },
  {
    id: "shield",
    name: "홍인표의 보호막",
    price: 200,
    effect: "빗나간 발사 3번까지 횟수 보호",
    description:
      "홍인표 선생님을 감싸고 있는 신비한 보호막. 손을 잡으면 은영의 힘이 다시 채워진다.",
  },
];

const SHIELD_CHARGES = 3;

const shotsFor = (weapon: WeaponId) => BASE_SHOTS + (weapon === "bbgun" ? 3 : 0);

// How each weapon looks on the board: launcher tint + aim-line style.
const WEAPON_LOOK: Record<WeaponId, { base: string; aim: string; dash: number[]; width: number }> =
  {
    blaster: { base: "#eee9fa", aim: "rgba(255,255,255,.75)", dash: [2, 13], width: 2 },
    bbgun: { base: "#cfe0ff", aim: "#a9caff", dash: [1, 8], width: 4 },
    sword: { base: "#e4fbc4", aim: "#c8f57a", dash: [14, 9], width: 4 },
    rainbow: { base: "#fde6f6", aim: "rainbow", dash: [10, 6], width: 5 },
    shield: { base: "#efe0ff", aim: "#c79bff", dash: [6, 6], width: 4 },
  };

const readWeapon = (): WeaponId => {
  try {
    const saved = localStorage.getItem("jelly-weapon");
    return WEAPONS.some((w) => w.id === saved) ? (saved as WeaponId) : "blaster";
  } catch {
    return "blaster";
  }
};

// 16x16 pixel-art weapon sprites. Rows list fill colours only ("." = empty);
// the dark outline is generated around every filled pixel so it stays crisp.
const PIXEL_PALETTE: Record<string, string> = {
  w: "#ffffff",
  g: "#c9d8f5",
  s: "#d6d1ea",
  b: "#75a8ed",
  d: "#4b78bd",
  p: "#ef729e",
  y: "#f5d95a",
  o: "#f0a94c",
  r: "#ef655d",
  G: "#9fdc5a",
  v: "#8c5bd8",
  m: "#5f5880",
  k: "#2d2752",
  c: "#ef655d",
  n: "#e4dff0",
};

// 거위 상점 주인: white goose (fills only; outline is generated)
const GOOSE_SPRITE = [
  "........................",
  "............wwww........",
  "...........wwwwww.......",
  "...........wwkwwww......",
  "...........wwwwwwoooo...",
  "...........wwwwwwooo....",
  "............wwwwww......",
  ".............wwww.......",
  ".............wwww.......",
  ".............wwww.......",
  "............wwwww.......",
  "..ww.......wwwwww.......",
  ".wwww....wwwwwwwww......",
  ".wwwwwwwwwwwwwwwwww.....",
  "..wwwwwnnwwwwwwwwwww....",
  "..wwwnnnwwwwwwwwwwww....",
  "...wwnnwwwwwwwwwwww.....",
  "...wwwwwwwwwwwwwwww.....",
  "....wwwwwwwwwwwwww......",
  ".....wwwwwwwwwwww.......",
  "........oo....oo........",
  ".......ooo...ooo........",
  "........................",
  "........................",
];
const WEAPON_SPRITES: Record<WeaponId, string[]> = {
  blaster: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "..wwwwwwwwwwg...",
    "..wbbwwppwwwgbb.",
    "..wbbwwppwwwgbb.",
    "..wwwwwwwwwwg...",
    ".....ggg........",
    ".....ggg........",
    "....ggg.........",
    "....ggg.........",
    "................",
    "................",
    "................",
  ],
  bbgun: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "..bbbbbbbbbbbs..",
    "..bwwbbbbbbbbs..",
    "..dddddddddddd..",
    "....ddd..d......",
    "....ddd.dd......",
    "...ddd..........",
    "...ddd..........",
    "...ddd..........",
    "................",
    "................",
    "................",
  ],
  sword: [
    "................",
    ".............GG.",
    "............GwG.",
    "...........GwG..",
    "..........GwG...",
    ".........GwG....",
    "........GwG.....",
    ".......GGG......",
    ".....yyyy.......",
    ".....ypy........",
    "....pp..........",
    "...pp...........",
    "..yy............",
    "................",
    "................",
    "................",
  ],
  rainbow: [
    "................",
    ".............rr.",
    "............ror.",
    "...........oyo..",
    "..........yGy...",
    ".........GbG....",
    "........bvb.....",
    ".......vvv......",
    ".....ssss.......",
    ".....sms........",
    "....mm..........",
    "...mm...........",
    "..ss............",
    "................",
    "................",
    "................",
  ],
  shield: [
    "................",
    ".....vvvvvv.....",
    "...vvppppppvv...",
    "..vppwwppppppv..",
    "..vpwwpppppppv..",
    ".vppwppppppppbv.",
    ".vppppppppppbbv.",
    ".vpppppppppbbbv.",
    ".vpppppppppbbbv.",
    ".vppppppppbbbbv.",
    ".vpppppppbbbbbv.",
    "..vppppbbbbbbv..",
    "..vppbbbbbbbbv..",
    "...vvbbbbbbvv...",
    ".....vvvvvv.....",
    "................",
  ],
};

function WeaponIcon({ id }: { id: WeaponId }) {
  // 홍인표의 보호막 uses the supplied pixel-art bubble image.
  if (id === "shield") {
    return <img className="weapon-img" src="./shield.png" alt="" draggable={false} />;
  }
  return <PixelSprite rows={WEAPON_SPRITES[id]} />;
}

function PixelSprite({ rows, className }: { rows: string[]; className?: string }) {
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const filled = (x: number, y: number) => {
    const ch = rows[y]?.[x];
    return ch !== undefined && ch !== ".";
  };
  const pixels: { x: number; y: number; c: string }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (filled(x, y)) {
        pixels.push({ x, y, c: PIXEL_PALETTE[rows[y][x]] });
      } else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        pixels.push({ x, y, c: "#2d2752" });
      }
    }
  }
  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {pixels.map(({ x, y, c }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={c} />
      ))}
    </svg>
  );
}
type CollectionTab = "profile" | "story" | "observe" | "secret";

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
    name: "옴벌레 젤리",
    title: "작고 성가신 마음",
    color: 0,
    image: "./jellies/bug.png",
    emotion: "집착과 질투",
    motif: "전학생 옴 / 럭키, 혼란",
    location: "본관 2층 신발장 앞",
    personality: "끈질기고 성가시지만 쉽게 외로워진다.",
    record: "은영의 신발 끝에 매달린 채 17분 동안 떨어지지 않았다.",
    story:
      "처음에는 그저 작은 벌레 한 마리였다.\n\n누군가의 뒤를 졸졸 따라다니고, 누군가가 웃으면 같이 웃었다. 하지만 어느 순간부터 자신을 바라봐 주지 않는 사람들을 견딜 수 없게 되었다.\n\n한 번만 더 봐줘. 조금만 더 신경 써줘.\n\n그 마음은 점점 부풀어 올라 작은 다리와 더듬이를 가진 붉은 젤리가 되었다.\n\n은영은 녀석을 없애려다 잠시 멈췄다. 녀석은 공격하는 대신 은영의 신발 끝에 매달려 떨어지지 않으려고 했다.\n\n“아, 진짜 귀찮게 하네.”\n\n은영은 한숨을 쉬고 녀석을 떼어냈다.",
    lastLine: "누군가를 좋아하는 마음이 반드시 예쁜 모양으로 남는 건 아니다.",
  },
  {
    name: "문어 젤리",
    title: "여덟 개의 손",
    color: 1,
    image: "./jellies/octopus.png",
    emotion: "그리움과 미련",
    motif: "토요일의 데이트메이트",
    location: "토요일 오후의 빈 놀이터",
    personality: "오래 기다리고, 한번 잡은 것은 좀처럼 놓지 않는다.",
    record: "낡은 그네를 여덟 다리로 붙잡고 같은 토요일을 반복하고 있었다.",
    story:
      "토요일 오후, 놀이터에는 아무도 없었다.\n\n그런데 미끄럼틀 아래에서 주황색 무언가가 꿈틀거렸다.\n\n문어 젤리는 여덟 개의 다리로 낡은 그네를 붙잡고 있었다. 누군가 자신을 밀어주기를 기다리는 것처럼.\n\n예전에 이곳에서 만났던 사람을 기억하고 있었다. 약속했던 토요일도, 함께 먹었던 아이스크림도, 끝내 하지 못한 인사도.\n\n시간은 흘렀지만 문어 젤리에게 토요일은 아직 끝나지 않았다.\n\n은영이 다가가자 문어는 다리 하나를 내밀었다. 악수를 청하는 것 같았다. 은영은 잠시 그 손을 잡아주었다.\n\n그제야 그네가 천천히 멈췄다.",
    lastLine: "기다림이 길어지면, 기억도 그 자리에 눌러앉는다.",
  },
  {
    name: "두꺼비 젤리",
    title: "행운을 삼킨 아이",
    color: 2,
    image: "./jellies/toad.png",
    emotion: "욕심과 행운",
    motif: "럭키, 혼란",
    location: "소원이 가장 많이 오가는 시험 기간의 교실",
    personality: "반짝이는 소원을 좋아하고 무엇이든 삼키려 한다.",
    record: "삼킨 소원이 너무 많아지자 등에 난 혹이 불규칙하게 빛나기 시작했다.",
    story:
      "두꺼비 젤리는 행운을 좋아했다.\n\n시험을 잘 보게 해달라고, 좋아하는 사람과 짝이 되게 해달라고, 내일은 조금 더 행복하게 해달라고.\n\n사람들의 작은 소원을 하나씩 삼킬 때마다 몸집은 커졌고, 등에 달린 혹은 반짝반짝 빛났다.\n\n하지만 행운을 삼킨 사람들은 점점 더 많은 행운을 원했다. 한 번의 행운으로는 만족할 수 없었고, 두 번의 행운은 세 번의 불안을 만들었다.\n\n결국 두꺼비 젤리는 자신이 삼킨 소원들을 모두 토해내기 시작했다.\n\n은영은 그 앞에서 장난감 총을 내려놓았다.\n\n“행운도 적당히 먹어야지. 체하겠다.”",
    lastLine: "행운을 너무 많이 삼키면, 자기 소원조차 기억나지 않는다.",
  },
  {
    name: "이끼 젤리",
    title: "아무도 모르는 자리",
    color: 3,
    image: "./jellies/moss.png",
    emotion: "고립과 외로움",
    motif: "오리 선생 한아름",
    location: "햇빛이 들지 않는 구관 계단과 창고",
    personality: "말이 없고 느리지만 잊힌 것들의 온기를 기억한다.",
    record: "오래된 책상, 지워진 낙서, 명찰 없는 사물함 위에서 동시에 발견됐다.",
    story:
      "오래된 학교 구석에는 이끼 젤리가 살고 있었다.\n\n아무도 찾아오지 않는 창고, 오래된 책상 아래, 햇빛이 들지 않는 계단 옆. 이끼 젤리는 그곳에 붙어 조용히 자랐다.\n\n처음에는 누군가 자신을 발견해 주기를 바랐다. 하지만 아무도 오지 않았다. 그러자 점점 더 많은 곳에 뿌리를 내리기 시작했다.\n\n학교의 구석구석이 초록색으로 뒤덮였다.\n\n은영은 녀석을 떼어내려 했지만, 이끼 젤리가 붙어 있는 곳마다 작은 온기가 남아 있었다. 누군가 버리고 간 물건, 오래된 낙서, 잊힌 이름들.\n\n은영은 녀석을 전부 없애지 않았다. 대신 햇빛이 드는 창가로 옮겨주었다.",
    lastLine: "아무도 찾지 않는다고 해서, 그곳에 아무것도 없는 건 아니다.",
  },
  {
    name: "두발 젤리",
    title: "어디로든 도망치는 아이",
    color: 4,
    image: "./jellies/twoleg.png",
    emotion: "불안과 두려움",
    motif: "원어민 교사 매켄지",
    location: "수업이 끝난 뒤의 긴 복도",
    personality: "조그만 소리에도 놀라며 멈추는 법을 모른다.",
    record: "복도를 43바퀴 달렸지만 처음 발견된 자리에서 한 걸음도 벗어나지 못했다.",
    story:
      "두발 젤리는 항상 뛰어다녔다.\n\n두 개의 다리로는 부족해서 여러 개의 다리를 만들었다. 빨리 도망치기 위해서였다.\n\n누군가 자신을 잡으러 오는 것 같았고, 어디에 있든 안전하지 않다고 느꼈다. 복도를 달리고, 계단을 뛰어내리고, 교실 사이를 헤집었다.\n\n그런데 이상하게도 아무리 달려도 제자리였다.\n\n은영은 젤리를 쫓아가다가 결국 복도 한가운데 주저앉았다.\n\n“야. 나도 힘들거든?”\n\n그제야 두발 젤리가 멈췄다. 은영은 녀석이 도망치던 방향을 바라보았다. 아무도 없었다. 쫓아오는 것도 없었다. 그저 오래전부터 혼자 겁을 먹고 있었을 뿐이었다.",
    lastLine: "도망치는 것도 습관이 되면, 멈추는 법을 잊는다.",
  },
  {
    name: "해파리 젤리",
    title: "투명한 마음",
    color: 6,
    image: "./jellies/jellyfish.png",
    emotion: "사랑과 동경",
    motif: "사랑해 젤리피시",
    location: "해 질 무렵의 과학실 창가",
    personality: "수줍고 투명하다. 시선이 닿으면 보랏빛으로 흔들린다.",
    record: "공격성은 없었다. 특정 이름을 들을 때마다 촉수가 아주 조금 움직였다.",
    story:
      "해파리 젤리는 학교에서 가장 투명한 젤리였다.\n\n빛을 받으면 보랏빛으로 반짝였고, 가까이 다가가면 희미하게 흔들렸다.\n\n녀석은 누군가를 좋아하는 마음에서 태어났다. 처음에는 그저 멀리서 바라보는 것만으로도 행복했다. 같은 교실에 있는 것, 복도에서 마주치는 것, 이름을 한 번 불러보는 것만으로도 충분했다.\n\n하지만 그 마음을 들킬까 봐 두려웠다. 그래서 점점 투명해졌다. 아무도 자신을 알아보지 못하도록.\n\n은영은 해파리 젤리를 발견하고도 공격하지 않았다.\n\n“좋아하는 건 죄가 아닌데.”\n\n해파리의 촉수가 아주 조금 흔들렸다.",
    lastLine: "보이지 않는다고 해서, 마음까지 없는 것은 아니다.",
  },
  {
    name: "하트 젤리",
    title: "남겨진 온기",
    color: 5,
    image: "./jellies/heart.png",
    emotion: "애정과 상실",
    motif: "가로등 아래 김강선",
    location: "매일 같은 시간, 운동장 끝의 오래된 가로등 아래",
    personality: "조용하고 따뜻하다. 기다림을 방해하면 잠시 흐려진다.",
    record: "퇴치가 필요하지 않은 젤리. 은영은 그날 장난감 총을 꺼내지 않았다.",
    story:
      "하트 젤리는 다른 젤리들과 달랐다.\n\n누군가를 해치지도 않았고, 학교를 어지럽히지도 않았다. 그저 어두운 가로등 아래에서 조용히 빛났다.\n\n하트 젤리에게는 오래된 기억이 있었다. 함께 웃었던 사람, 아무렇지 않게 건넸던 인사, 다시는 돌아오지 않을 평범한 하루.\n\n그 사람은 이제 이곳에 없었다.\n\n그런데도 하트 젤리는 매일 같은 시간에 나타났다. 누군가를 기다리는 것처럼.\n\n은영은 그 모습을 한참 바라보았다. 가끔은 퇴치해야 하는 것보다 그냥 곁에 있어 줘야 하는 것이 더 많았다.\n\n“오늘은 여기까지만 하자.”\n\n하트 젤리는 마지막으로 한 번 반짝이고 사라졌다.",
    lastLine: "사라진 사람의 자리에도, 사랑했던 마음은 남는다.",
  },
  {
    name: "흰수염고래 젤리",
    title: "바다보다 깊은 기억",
    color: 4,
    image: "./jellies/whale.png",
    emotion: "기억과 공존",
    motif: "돌풍 속에 우리 둘이 안고 있었지 / 학교에 숨겨진 오래된 힘",
    location: "학교 지하실 아래, 존재하지 않는 바다",
    personality: "느리고 거대하며 공격하지 않는다. 수많은 목소리를 품고 있다.",
    record: "단일한 욕망이 아니라 학교에 쌓인 기억과 감정이 함께 만든 존재로 추정된다.",
    special: true,
    story:
      "아주 오래전부터 학교에는 이상한 소문이 있었다. 학교 아래에는 바다가 있다는 소문이었다.\n\n아무도 믿지 않았다. 학교는 바다에서 한참 떨어져 있었고, 지하실에는 오래된 창고와 먼지 쌓인 물건들만 있었으니까.\n\n그런데 어느 날부터 학교 곳곳에서 물방울이 발견되기 시작했다. 복도에는 파도 소리가 들렸고, 창문에는 바다에서나 볼 법한 푸른 빛이 일렁였다.\n\n그리고 지하실에서 거대한 고래 한 마리가 나타났다.\n\n흰수염고래 젤리는 다른 젤리들과 달리 누구의 욕망 하나만으로 만들어진 존재가 아니었다. 오랜 시간 학교에 쌓인 수많은 기억과 감정, 바람과 후회가 한데 모여 만들어진 존재였다.\n\n은영은 고래를 향해 무지개 칼을 겨누었다. 하지만 고래는 공격하지 않았다. 그저 아주 천천히, 깊은 바다를 헤엄치듯 은영의 곁을 지나갔다.\n\n그 순간 은영은 알았다. 이 젤리는 없애야 하는 존재가 아니라, 오랫동안 누군가가 기억해 주기를 기다렸던 존재라는 것을.",
    lastLine: "세상에는 퇴치할 수 없는 마음도 있다. 그저 함께 헤엄쳐야 하는 마음도.",
  },
];

const cellCenter = (row: number, col: number) => ({
  x: 73 + col * X_GAP + (row % 2 ? X_GAP / 2 : 0),
  y: 52 + row * Y_GAP,
});

// STAGE 1-2 is the deliberately hard stage for the demo.
const HARD_STAGE = 2;

function hardBubbles() {
  const bubbles: Bubble[] = [];
  let id = 1;
  // Deterministic scatter: 6 rows, 5 colors, small mixed clusters.
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let row = 0; row < 6; row++) {
    const count = row % 2 ? 10 : 11;
    for (let col = 0; col < count; col++) {
      const { x, y } = cellCenter(row, col);
      bubbles.push({
        id: id++,
        x,
        y,
        color: Math.floor(rand() * 5),
        heart: rand() > 0.85,
      });
    }
  }
  return bubbles;
}

function initialBubbles(stage = 1) {
  if (stage === HARD_STAGE) return hardBubbles();
  const bubbles: Bubble[] = [];
  let id = 1;
  // Demo difficulty: four vertical color columns, each reaching the bottom row.
  // One matching hit pops a whole column, so a stage clears in about 4–6 shots.
  const stageRows = 3;
  for (let row = 0; row < stageRows; row++) {
    const count = row % 2 ? 10 : 11;
    for (let col = 0; col < count; col++) {
      const { x, y } = cellCenter(row, col);
      bubbles.push({
        id: id++,
        x,
        y,
        color: (Math.floor(col / 3) + stage - 1) % 4,
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

function BookIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <path d="M4 5.5c4.1-.8 7.4.2 10 2.3v16c-2.6-2.1-5.9-3.1-10-2.3v-16Zm20 0c-4.1-.8-7.4.2-10 2.3v16c2.6-2.1 5.9-3.1 10-2.3v-16Z" />
      <path d="M7 9.5c1.5-.1 2.8.2 4 .8M7 13c1.5-.1 2.8.2 4 .8m10-4.3c-1.5-.1-2.8.2-4 .8m4 2.7c-1.5-.1-2.8.2-4 .8" />
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

// 안은영 holding each weapon (the blaster in doctor.png recoloured per weapon).
const DOCTOR_IMAGES: Record<WeaponId, string> = {
  blaster: "./doctor.png",
  bbgun: "./doctor-bbgun.png",
  sword: "./doctor-sword.png",
  rainbow: "./doctor-rainbow.png",
  shield: "./doctor.png",
};

function Doctor({ weapon }: { weapon: WeaponId }) {
  const name = WEAPONS.find((w) => w.id === weapon)!.name;
  return (
    <img
      key={weapon}
      className={`doctor ${weapon === "shield" ? "shielded" : ""}`}
      src={DOCTOR_IMAGES[weapon]}
      alt={`${name}을(를) 든 픽셀 아트 보건교사 안은영`}
      title={`장착 무기: ${name}`}
      draggable={false}
    />
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setScore] = useState(0);
  const [equippedWeapon, setEquippedWeapon] = useState<WeaponId>(readWeapon);
  const [ownedWeapons, setOwnedWeapons] = useState<Set<WeaponId>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("jelly-owned-weapons") ?? "[]");
      return new Set<WeaponId>(["blaster", ...(Array.isArray(saved) ? saved : [])]);
    } catch {
      return new Set<WeaponId>(["blaster"]);
    }
  });
  const [shopMessage, setShopMessage] = useState("");
  const [shieldCharges, setShieldCharges] = useState(SHIELD_CHARGES);
  const equippedRef = useRef(equippedWeapon);
  const [shots, setShots] = useState(() => shotsFor(readWeapon()));
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [currentColor, setCurrentColor] = useState(0);
  const [nextColor, setNextColor] = useState(1);
  const [combo, setCombo] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [stage, setStage] = useState(1);
  const [view, setView] = useState<View>("game");
  const [coins, setCoins] = useState(() => {
    try {
      return Number(localStorage.getItem("jelly-coins")) || 120;
    } catch {
      return 120;
    }
  });
  const [unlocked, setUnlocked] = useState<Set<number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("jelly-unlocked") ?? "[]");
      return new Set<number>(Array.isArray(saved) ? saved.filter(Number.isInteger) : []);
    } catch {
      return new Set<number>();
    }
  });
  const [selectedJelly, setSelectedJelly] = useState(0);
  const [collectionTab, setCollectionTab] = useState<CollectionTab>("profile");
  const [observing, setObserving] = useState(false);
  // Collection shows the jelly list first; a jelly's story opens only after clicking it.
  const [detailOpen, setDetailOpen] = useState(false);
  const pausedRef = useRef(paused);
  const statusRef = useRef<GameStatus>(status);
  const boardSnapshotRef = useRef<{
    gameKey: number;
    stage: number;
    bubbles: Bubble[];
    id: number;
    projectile: (Bubble & { vx: number; vy: number }) | null;
    aimX: number;
    aimY: number;
  } | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    try {
      localStorage.setItem("jelly-coins", String(coins));
      localStorage.setItem("jelly-unlocked", JSON.stringify([...unlocked]));
    } catch {
      // The game remains playable when browser storage is unavailable.
    }
  }, [coins, unlocked]);
  useEffect(() => {
    equippedRef.current = equippedWeapon;
    try {
      localStorage.setItem("jelly-weapon", equippedWeapon);
      localStorage.setItem("jelly-owned-weapons", JSON.stringify([...ownedWeapons]));
    } catch {
      // Storage is optional.
    }
  }, [equippedWeapon, ownedWeapons]);
  useEffect(() => {
    if (!shopMessage) return;
    const timer = window.setTimeout(() => setShopMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [shopMessage]);

  const restart = useCallback(() => {
    setScore(0);
    setShots(shotsFor(equippedRef.current));
    setPaused(false);
    setStatus("playing");
    setCurrentColor(0);
    setNextColor(1);
    setCombo(0);
    boardSnapshotRef.current = null;
    setGameKey((v) => v + 1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const savedBoard = boardSnapshotRef.current;
    let bubbles =
      savedBoard?.gameKey === gameKey && savedBoard.stage === stage
        ? savedBoard.bubbles
        : initialBubbles(stage);
    let projectile =
      savedBoard?.gameKey === gameKey && savedBoard.stage === stage ? savedBoard.projectile : null;
    let aimX =
      savedBoard?.gameKey === gameKey && savedBoard.stage === stage ? savedBoard.aimX : W / 2;
    let aimY =
      savedBoard?.gameKey === gameKey && savedBoard.stage === stage ? savedBoard.aimY : 330;
    let current = currentColor;
    let next = nextColor;
    let id = savedBoard?.gameKey === gameKey && savedBoard.stage === stage ? savedBoard.id : 1000;
    let raf = 0;
    let last = performance.now();
    let burst = 0;
    let burstText = "NICE!";
    // Pop / drop animations for jellies that were just removed
    type JellyFx = {
      b: Bubble;
      t: number;
      delay: number;
      kind: "pop" | "drop";
      vy: number;
      vx: number;
    };
    type Particle = { x: number; y: number; vx: number; vy: number; t: number; color: string };
    let fx: JellyFx[] = [];
    let particles: Particle[] = [];
    let winTimer = 0;
    let winPending = false;
    // 홍인표의 보호막: missed shots this round that will not cost a shot
    let shieldLeft = SHIELD_CHARGES;
    setShieldCharges(SHIELD_CHARGES);

    const randomAvailableColor = () => {
      const present = [...new Set(bubbles.map((b) => b.color))];
      return (
        present[Math.floor(Math.random() * present.length)] ??
        Math.floor(Math.random() * COLORS.length)
      );
    };

    const resize = () => {
      // Full-resolution board (sharp on high-DPI screens).
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
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

    const drawBubble = (b: Bubble, alpha = 1, scale = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const r = R * scale * (b.popping ? Math.max(0.1, 1 - b.popping) : 1);
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

      if (cluster.length < 3) {
        setCombo(0);
        return false;
      }
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
      const clusterIds = new Set(cluster.map((b) => b.id));
      bubbles.forEach((b) => {
        if (!removed.has(b.id)) return;
        if (clusterIds.has(b.id)) {
          // matched: chain-pop outward from the jelly that was just placed
          const dist = Math.hypot(b.x - added.x, b.y - added.y);
          fx.push({ b, t: 0, delay: dist / 900, kind: "pop", vx: 0, vy: 0 });
        } else {
          // cut loose: fall with a small random sideways drift
          fx.push({ b, t: 0, delay: 0.12, kind: "drop", vx: (Math.random() - 0.5) * 90, vy: -120 });
        }
      });
      bubbles = bubbles.filter((b) => !removed.has(b.id));
      const earned = removed.size * 120 * Math.max(1, Math.min(4, Math.floor(removed.size / 3)));
      setScore((s) => s + earned);
      setCombo((previous) => Math.min(9, previous + 1));
      burst = 1;
      burstText = "NICE!";
      // 무지개 광선검: a big pop gives one shot back.
      if (equippedRef.current === "rainbow" && removed.size >= 6) setShots((s) => s + 1);
      if (bubbles.length === 0) {
        statusRef.current = "won";
        // let the last pop play before the clear card appears
        winPending = true;
        winTimer = window.setTimeout(() => {
          winPending = false;
          setStatus("won");
        }, 700);
        setCoins((value) => value + (equippedRef.current === "sword" ? 60 : 30));
        setSelectedJelly(stage - 1);
        setCollectionTab("story");
        setUnlocked((currentUnlocked) => {
          const nextUnlocked = new Set(currentUnlocked).add(stage - 1);
          if ([0, 1, 2, 3, 4, 5, 6].every((index) => nextUnlocked.has(index))) {
            nextUnlocked.add(7);
          }
          return nextUnlocked;
        });
      }
      return true;
    };

    const attachProjectile = () => {
      if (!projectile) return;
      let best = { row: 0, col: 0, dist: Infinity, x: 0, y: 0 };
      for (let row = 0; row < ROWS; row++) {
        const count = row % 2 ? 10 : 11;
        for (let col = 0; col < count; col++) {
          const p = cellCenter(row, col);
          const nearby = bubbles.filter((b) => Math.hypot(b.x - p.x, b.y - p.y) < 61);
          if (bubbles.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 48)) continue;
          if (row > 0 && nearby.length === 0) continue;
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
      const popped = resolveMatches(placed);
      // 홍인표의 보호막 blocks a missed shot: it does not cost a shot.
      const shielded = !popped && equippedRef.current === "shield" && shieldLeft > 0;
      if (shielded) {
        shieldLeft -= 1;
        setShieldCharges(shieldLeft);
        burst = 1;
        burstText = "보호막!";
      }
      // Never load a color that is no longer on the board (no wasted demo shots).
      const isPresent = (color: number) => bubbles.some((b) => b.color === color);
      current = isPresent(next) ? next : randomAvailableColor();
      next = randomAvailableColor();
      setCurrentColor(current);
      setNextColor(next);
      setShots((s) => {
        const remaining = shielded ? s : s - 1;
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
      const speed = 560;
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
            bubbles.some((b) => Math.hypot(b.x - projectile!.x, b.y - projectile!.y) < R * 2.08);
          if (collision) attachProjectile();
        }
      }

      bubbles.forEach((b) => drawBubble(b));

      // Jelly pop / drop animations
      fx = fx.filter((e) => {
        e.t += dt;
        const local = e.t - e.delay;
        if (local < 0) {
          drawBubble(e.b);
          return true;
        }
        if (e.kind === "pop") {
          const p = local / 0.24;
          if (p >= 1) return false;
          if (!e.vy) {
            // first frame of the pop: burst into pixel particles
            e.vy = 1;
            for (let i = 0; i < 9; i++) {
              const a = (Math.PI * 2 * i) / 9 + Math.random() * 0.4;
              const sp = 160 + Math.random() * 160;
              particles.push({
                x: e.b.x,
                y: e.b.y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 60,
                t: 0,
                color: i % 3 === 0 ? "#ffffff" : COLORS[e.b.color],
              });
            }
          }
          drawBubble(e.b, 1 - p, 1 + p * 0.45);
          return true;
        }
        // drop
        if (local > 0.9) return false;
        e.vy += 1500 * dt;
        e.b = { ...e.b, x: e.b.x + e.vx * dt, y: e.b.y + e.vy * dt };
        drawBubble(e.b, Math.max(0, 1 - local / 0.9));
        return true;
      });
      particles = particles.filter((pt) => {
        pt.t += dt;
        if (pt.t > 0.5) return false;
        pt.vy += 900 * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        ctx.save();
        ctx.globalAlpha = 1 - pt.t / 0.5;
        ctx.fillStyle = pt.color;
        const size = 7 - pt.t * 6;
        ctx.fillRect(pt.x - size / 2, pt.y - size / 2, size, size);
        ctx.restore();
        return true;
      });

      const originX = W / 2;
      const originY = 641;
      if (!projectile && statusRef.current === "playing") {
        const angle = Math.atan2(aimY - originY, aimX - originX);
        let x = originX;
        let y = originY;
        let vx = Math.cos(angle);
        const vy = Math.sin(angle);
        let hit = false;
        const look = WEAPON_LOOK[equippedRef.current];
        ctx.fillStyle = "rgba(255,255,255,.9)";
        if (look.aim === "rainbow") {
          const rainbow = ctx.createLinearGradient(originX, originY, originX, 40);
          ["#ef655d", "#f5d95a", "#8fcb66", "#75a8ed", "#8c5bd8"].forEach((c, i) =>
            rainbow.addColorStop(i / 4, c),
          );
          ctx.strokeStyle = rainbow;
        } else {
          ctx.strokeStyle = look.aim;
        }
        ctx.lineWidth = look.width;
        ctx.setLineDash(look.dash);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let step = 0; step < 220; step++) {
          x += vx * 4;
          y += vy * 4;
          if (x < R + 8) {
            x = R + 8;
            vx = Math.abs(vx);
          } else if (x > W - R - 8) {
            x = W - R - 8;
            vx = -Math.abs(vx);
          }
          if (y < R + 5 || bubbles.some((b) => Math.hypot(b.x - x, b.y - y) < R * 2.08)) {
            hit = true;
            break;
          }
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        if (hit) {
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fillStyle = COLORS[current];
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.translate(originX, originY + 29);
      ctx.fillStyle = "#343052";
      ctx.beginPath();
      ctx.roundRect(-67, -28, 134, 60, 28);
      ctx.fill();
      ctx.fillStyle = WEAPON_LOOK[equippedRef.current].base;
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
        ctx.fillText(burstText, W / 2, 390 - (1 - burst) * 35);
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
      boardSnapshotRef.current = { gameKey, stage, bubbles, id, projectile, aimX, aimY };
      observer.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(raf);
      // leaving mid-animation: show the clear result right away
      if (winPending) {
        window.clearTimeout(winTimer);
        setStatus("won");
      }
    };
  }, [gameKey, stage, view]);

  const buyJelly = (index: number) => {
    if (unlocked.has(index) || JELLIES[index].special) return;
    if (coins < JELLY_PRICE) {
      setShopMessage(`코인이 ${JELLY_PRICE - coins}개 부족해요. 스테이지를 클리어해 모아 보세요!`);
      return;
    }
    setCoins((value) => value - JELLY_PRICE);
    setUnlocked((currentUnlocked) => {
      const nextUnlocked = new Set(currentUnlocked).add(index);
      if ([0, 1, 2, 3, 4, 5, 6].every((i) => nextUnlocked.has(i))) nextUnlocked.add(7);
      return nextUnlocked;
    });
    setShopMessage(`${JELLIES[index].name}의 기록을 해금했어요!`);
    setSelectedJelly(index);
    setCollectionTab("story");
    setObserving(false);
    setDetailOpen(true);
  };

  const buyWeapon = (id: WeaponId) => {
    const weapon = WEAPONS.find((w) => w.id === id)!;
    // The new weapon applies immediately, even mid-round (shot bonus is swapped in).
    const applyNow = () => {
      const delta = shotsFor(id) - shotsFor(equippedRef.current);
      if (delta !== 0 && statusRef.current === "playing") {
        setShots((s) => Math.max(1, s + delta));
      }
      equippedRef.current = id;
    };
    if (ownedWeapons.has(id)) {
      applyNow();
      setEquippedWeapon(id);
      setShopMessage(`${weapon.name} 장착 완료! 잘 어울리네, 꽉!`);
      return;
    }
    if (coins < weapon.price) {
      setShopMessage(`꽉… 코인이 ${weapon.price - coins}개 모자라. 젤리를 더 잡아 와!`);
      return;
    }
    setCoins((value) => value - weapon.price);
    setOwnedWeapons((current) => new Set(current).add(id));
    applyNow();
    setEquippedWeapon(id);
    setShopMessage(`꽉꽉! ${weapon.name}, 좋은 선택이야. 바로 장착해 뒀어!`);
  };

  // Combo card click: wipe all progress (coins, jelly book, weapons) and start over at 1-1.
  const resetAll = () => {
    try {
      ["jelly-coins", "jelly-unlocked", "jelly-weapon", "jelly-owned-weapons"].forEach((key) =>
        localStorage.removeItem(key),
      );
    } catch {
      // Storage is optional.
    }
    setCoins(120);
    setUnlocked(new Set<number>());
    setOwnedWeapons(new Set<WeaponId>(["blaster"]));
    setEquippedWeapon("blaster");
    equippedRef.current = "blaster";
    setSelectedJelly(0);
    setDetailOpen(false);
    setStage(1);
    restart();
    setShopMessage("게임을 처음부터 다시 시작해요!");
  };

  const openShop = () => {
    setPaused(false);
    setView("shop");
  };

  const openJelly = (index: number) => {
    if (!unlocked.has(index)) {
      buyJelly(index);
      return;
    }
    setSelectedJelly(index);
    setCollectionTab("profile");
    setObserving(false);
    setDetailOpen(true);
  };

  const openCollection = () => {
    setDetailOpen(false);
    setView("collection");
  };

  const returnToGame = () => {
    if (status === "won") {
      if (stage < 7) setStage((currentStage) => currentStage + 1);
      restart();
    }
    setView("game");
  };

  if (view === "collection") {
    const selected = JELLIES[selectedJelly];
    const selectedUnlocked = unlocked.has(selectedJelly);
    const renderJellyCard = (jelly: (typeof JELLIES)[number], index: number) => {
      const isUnlocked = unlocked.has(index);
      return (
        <button
          className={`jelly-card ${jelly.special ? "special-jelly-card" : ""} ${selectedJelly === index && isUnlocked ? "selected" : ""} ${!isUnlocked ? "locked" : ""}`}
          onClick={() => openJelly(index)}
          disabled={!isUnlocked && jelly.special}
          key={jelly.name}
        >
          <span className="jelly-number">
            {jelly.special ? "SPECIAL" : `NO. ${String(index + 1).padStart(2, "0")}`}
          </span>
          <div className="card-jelly">
            <img src={jelly.image} alt="" draggable={false} />
            {!isUnlocked && (
              <span className="lock-mark" aria-label="잠김">
                <svg viewBox="0 0 20 22" aria-hidden="true">
                  <path d="M5 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="#2d2752" strokeWidth="3" />
                  <rect x="2" y="10" width="16" height="11" rx="2" fill="#2d2752" />
                  <rect x="9" y="13" width="2" height="5" fill="#f6c445" />
                </svg>
              </span>
            )}
          </div>
          <strong>{jelly.name}</strong>
          {isUnlocked || jelly.special ? (
            <span className="unlock-cost">{isUnlocked ? "기록 열람" : "기본 젤리 7종 수집"}</span>
          ) : (
            <span className={`unlock-cost buy-cost ${coins < JELLY_PRICE ? "too-poor" : ""}`}>
              <span className="tiny-coin">J</span>
              {JELLY_PRICE} 코인으로 해금
            </span>
          )}
        </button>
      );
    };
    return (
      <main className="collection-shell">
        <header className="collection-header">
          <button
            className="back-button"
            onClick={detailOpen ? () => setDetailOpen(false) : returnToGame}
          >
            <span aria-hidden="true">‹</span> {detailOpen ? "목록으로" : "게임으로"}
          </button>
          <div>
            <small>보건실 비밀 기록</small>
            <h1>젤리 도감</h1>
          </div>
          <div className="collection-coins">
            <span className="coin">J</span>
            <strong>{coins}</strong>
          </div>
        </header>
        {shopMessage && <div className="shop-toast">{shopMessage}</div>}

        <section className={`collection-content ${detailOpen ? "detail-only" : "list-only"}`}>
          {!detailOpen && (
            <div className="collection-list" aria-label="젤리 목록">
              <div className="collection-section-title">
                <span>
                  기본 젤리 · 수집 {unlocked.size}/{JELLIES.length}
                </span>
              </div>
              <div className="jelly-grid">{JELLIES.slice(0, 7).map(renderJellyCard)}</div>
              <div className="collection-section-title special-title">
                <span>특별 젤리</span>
              </div>
              <div className="special-jelly-grid">
                {JELLIES.slice(7).map((jelly, index) => renderJellyCard(jelly, index + 7))}
              </div>
            </div>
          )}

          {!detailOpen ? null : selectedUnlocked ? (
            <article className="story-book">
              <div className="story-tape" />
              <span className="story-label">EUN-YOUNG'S JELLY FILE</span>
              <div
                className={`story-jelly ${selected.special ? "special-story-jelly" : ""} ${observing ? "is-observing" : ""}`}
              >
                <img src={selected.image} alt={selected.name} draggable={false} />
              </div>
              <small>
                {selected.special
                  ? "SPECIAL JELLY"
                  : `FILE ${String(selectedJelly + 1).padStart(2, "0")}`}
              </small>
              <h2>{selected.title}</h2>
              <h3>
                {selected.name} · {selected.emotion}
              </h3>
              <nav className="story-tabs" aria-label="젤리 기록 메뉴">
                <button
                  className={collectionTab === "profile" ? "active" : ""}
                  onClick={() => setCollectionTab("profile")}
                >
                  프로필
                </button>
                <button
                  className={collectionTab === "story" ? "active" : ""}
                  onClick={() => setCollectionTab("story")}
                >
                  이야기
                </button>
                <button
                  className={collectionTab === "observe" ? "active" : ""}
                  onClick={() => setCollectionTab("observe")}
                >
                  관찰
                </button>
                <button
                  className={collectionTab === "secret" ? "active" : ""}
                  onClick={() => setCollectionTab("secret")}
                >
                  기록
                </button>
              </nav>
              <div className="story-divider">
                <StarIcon />
              </div>

              {collectionTab === "profile" && (
                <dl className="jelly-profile">
                  <div>
                    <dt>감정 잔여물</dt>
                    <dd>{selected.emotion}</dd>
                  </div>
                  <div>
                    <dt>출현 장소</dt>
                    <dd>{selected.location}</dd>
                  </div>
                  <div>
                    <dt>관찰 성격</dt>
                    <dd>{selected.personality}</dd>
                  </div>
                  <div>
                    <dt>연관 모티프</dt>
                    <dd>{selected.motif}</dd>
                  </div>
                </dl>
              )}
              {collectionTab === "story" && (
                <div className="episode-story">
                  <p>{selected.story}</p>
                  <blockquote>{selected.lastLine}</blockquote>
                </div>
              )}
              {collectionTab === "observe" && (
                <div className="observe-panel">
                  <p>
                    젤리를 눌러 반응을 관찰해 보세요. 공격하지 않고 가만히 기다리면 다른 움직임을
                    보여줄지도 모릅니다.
                  </p>
                  <button onClick={() => setObserving((value) => !value)}>
                    {observing ? "관찰 멈추기" : "젤리 관찰하기"}
                  </button>
                  <small>{observing ? "젤리가 당신의 시선을 알아챘다." : "현재 반응 없음"}</small>
                </div>
              )}
              {collectionTab === "secret" && (
                <div className={`secret-record ${selected.special ? "whale-record" : ""}`}>
                  <span>{selected.special ? "HIDDEN RECORD" : "발견 기록"}</span>
                  <p>{selected.record}</p>
                  {selected.special && (
                    <p>
                      학교 아래의 바다는 장소가 아니라, 오랫동안 쌓인 마음이 만든 깊이일지도 모른다.
                    </p>
                  )}
                </div>
              )}
              <div className="teacher-note">
                <img src="./doctor.png" alt="" />
                <span>
                  “젤리는 무조건 없애는 게 아니야.
                  <br />
                  어떤 마음은 끝까지 들어줘야 하거든.”
                </span>
              </div>
            </article>
          ) : (
            <article className="story-book locked-story-book">
              <div className="story-tape" />
              <span className="story-label">LOCKED JELLY FILE</span>
              <div className="locked-file-mark">?</div>
              <h2>아직 발견하지 못한 기록</h2>
              <p>
                {selected.special
                  ? "기본 젤리 7종의 이야기를 모두 모으면 학교 아래에 숨겨진 마지막 기록이 열립니다."
                  : `STAGE 1-${selectedJelly + 1}을 클리어하면 이 젤리가 남긴 마음의 흔적을 읽을 수 있습니다.`}
              </p>
            </article>
          )}
        </section>
      </main>
    );
  }

  if (view === "shop") {
    const equipped = WEAPONS.find((w) => w.id === equippedWeapon)!;
    return (
      <main className="collection-shell shop-shell">
        <header className="collection-header">
          <button className="back-button" onClick={() => setView("game")}>
            <span aria-hidden="true">‹</span> 게임으로
          </button>
          <div>
            <small>은영의 비밀 무기고</small>
            <h1>무기 상점</h1>
          </div>
          <div className="collection-coins">
            <span className="coin">J</span>
            <strong>{coins}</strong>
          </div>
        </header>

        <section className="shop-content">
          <div className="shop-hero goose-shop paper-card">
            <div className="goose-keeper">
              <PixelSprite rows={GOOSE_SPRITE} className="goose-sprite" />
              <span className="goose-counter" />
            </div>
            <div className="goose-talk">
              <span className="story-label">거위 상점</span>
              <p className="goose-bubble" aria-live="polite">
                {shopMessage ||
                  `꽉! 어서 와, 은영. 지금 쥐고 있는 건 ${equipped.name}네. 오늘은 뭘 사 갈 거야?`}
              </p>
            </div>
          </div>

          <div className="weapon-grid">
            {WEAPONS.map((weapon) => {
              const owned = ownedWeapons.has(weapon.id);
              const isEquipped = equippedWeapon === weapon.id;
              return (
                <article
                  key={weapon.id}
                  className={`weapon-card ${isEquipped ? "equipped" : ""} ${owned ? "owned" : ""}`}
                >
                  <span className="weapon-icon">
                    <WeaponIcon id={weapon.id} />
                  </span>
                  <strong>{weapon.name}</strong>
                  <span className="weapon-effect">{weapon.effect}</span>
                  <p>{weapon.description}</p>
                  <button
                    className={`weapon-buy ${!owned && coins < weapon.price ? "too-poor" : ""}`}
                    onClick={() => buyWeapon(weapon.id)}
                    disabled={isEquipped}
                  >
                    {isEquipped ? (
                      "장착 중"
                    ) : owned ? (
                      "장착하기"
                    ) : (
                      <>
                        <span className="tiny-coin">J</span>
                        {weapon.price} 코인
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <div className="sky-decor sky-star-one">✦</div>
      <div className="sky-decor sky-star-two">✦</div>
      <header className="topbar">
        {/* Hidden trick: clicking the title gives +100 coins */}
        <div
          className="teacher-badge"
          onClick={() => {
            setCoins((value) => value + 100);
            setShopMessage("숨겨진 보너스 발견! +100 코인");
          }}
        >
          <span className="bunny" aria-hidden="true">
            <i />
            <b />
            <em />
          </span>
          <small>보건교사 안은영의</small>
          <strong>JELLY HUNT</strong>
          <span className="logo-spark">✦</span>
        </div>
        <div
          className={`stat-card stage-card ${stage === HARD_STAGE ? "hard-stage" : ""}`}
          data-level={stage === HARD_STAGE ? "HARD" : "SUPER EASY"}
        >
          <StarIcon />
          <span>
            <small>STAGE</small> 1-{stage}
          </span>
        </div>
        <button className="stat-card coin-card shop-button" onClick={openShop}>
          <span className="coin">J</span>
          <strong>{coins}</strong>
          <span className="shop-label">상점</span>
        </button>
        <button className="collection-button" onClick={openCollection}>
          <BookIcon />
          <span>젤리 도감</span>
          <b>
            {unlocked.size}/{JELLIES.length}
          </b>
        </button>
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
          <span className="side-caption">HEALTH TEACHER</span>
          <div className="shots-note paper-card">
            <span className="tape" />
            <small>남은 발사 횟수</small>
            <strong>{shots}</strong>
            {equippedWeapon === "shield" && (
              <span className="shield-charges" aria-label={`보호막 ${shieldCharges}회 남음`}>
                보호막
                {Array.from({ length: SHIELD_CHARGES }, (_, i) => (
                  <i key={i} className={i < shieldCharges ? "on" : ""} />
                ))}
              </span>
            )}
            <span className="mini-capsule" />
          </div>
          <Doctor weapon={equippedWeapon} />
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
                      ? `STAGE 1-${stage} CLEAR!`
                      : "발사 횟수를 다 썼어요"}
                </h2>
                <p>
                  {paused ? (
                    "준비되면 다시 시작해요"
                  ) : status === "won" ? (
                    <>
                      <span className="clear-chip">
                        +{equippedWeapon === "sword" ? 60 : 30} 코인
                      </span>
                      <span className="clear-chip">{JELLIES[stage - 1].name} 해금</span>
                    </>
                  ) : (
                    "각도를 바꿔 다시 도전해 보세요."
                  )}
                </p>
                <button
                  onClick={
                    paused
                      ? () => setPaused(false)
                      : status === "won"
                        ? stage < 7
                          ? () => {
                              setStage((currentStage) => currentStage + 1);
                              restart();
                            }
                          : openCollection
                        : restart
                  }
                >
                  {paused
                    ? "계속하기"
                    : status === "won"
                      ? stage < 7
                        ? "NEXT STAGE ▶"
                        : "젤리 도감 보기"
                      : "다시 도전"}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="right-panel">
          <span className="side-caption right-caption">JELLY STATUS</span>
          <div className="combo-card paper-card reset-trigger" onClick={resetAll}>
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
      {shopMessage && <div className="shop-toast game-toast">{shopMessage}</div>}
      <p className="help-text">화면을 움직여 조준하고 클릭하거나 터치해 발사하세요</p>
    </main>
  );
}
