import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  runTransaction,
  onValue,
  off
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

// Firebase web-app settings from the registered "chess" project.
const firebaseConfig = {
  apiKey: "AIzaSyDD21b53FDPxXfqaSwsKZv3WTlKq7vW3Jg",
  authDomain: "chess-d7c7b.firebaseapp.com",
  databaseURL: "https://chess-d7c7b-default-rtdb.firebaseio.com",
  projectId: "chess-d7c7b",
  storageBucket: "chess-d7c7b.firebasestorage.app",
  messagingSenderId: "468872849032",
  appId: "1:468872849032:web:900deb20325085ef63613d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const roomAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let roomCode = "";
let roomColor = null;
let roomStateRef = null;
let playersListener = null;
let stateListener = null;
let lastRevision = -1;
let stateWatchStarted = false;
let matchStarted = false;
let lastFinishedRevision = -1;

const statusEl = document.getElementById("onlineStatus");
const codeEl = document.getElementById("onlineRoomCode");
const panelEl = document.getElementById("onlinePanel");

function status(message) {
  if (statusEl) statusEl.textContent = message;
  const gameStatus = document.getElementById("onlineGameStatus");
  if (gameStatus) gameStatus.textContent = message;
}

async function currentUser() {
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

function playersRefFor(code) {
  return ref(db, `rooms/${code}/players`);
}

function stateRefFor(code) {
  return ref(db, `rooms/${code}/state`);
}

function createCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += roomAlphabet[Math.floor(Math.random() * roomAlphabet.length)];
  }
  return code;
}

function standardBoard() {
  return [
    ["R0", "B0", "K0", "N0", "Q0"],
    ["　", "　", "　", "　", "　"],
    ["　", "　", "　", "　", "　"],
    ["　", "　", "　", "　", "　"],
    ["Q1", "N1", "K1", "B1", "R1"]
  ];
}

function stopRoomListeners() {
  if (roomCode && playersListener) off(playersRefFor(roomCode), "value", playersListener);
  if (roomStateRef && stateListener) off(roomStateRef, "value", stateListener);
  playersListener = null;
  stateListener = null;
}

function prepareRoom(code, color) {
  stopRoomListeners();
  roomCode = code;
  roomColor = color;
  roomStateRef = stateRefFor(code);
  stateWatchStarted = false;
  matchStarted = false;
  lastRevision = -1;
  lastFinishedRevision = -1;
  window.onlineColor = color;
  window.onlineRoomCode = code;
}

function watchState() {
  if (stateWatchStarted) return;
  stateWatchStarted = true;
  stateListener = onValue(roomStateRef, snapshot => {
    if (!snapshot.exists()) {
      status(`部屋 ${roomCode} を作成しました。相手の参加を待っています…`);
      return;
    }

    const data = snapshot.val();
    if (!Array.isArray(data.board) && (!data.board || typeof data.board !== "object")) {
      status("部屋データを読み取れません。新しい部屋を作ってください。");
      return;
    }
    const revision = Number(data.revision || 0);
    if (revision <= lastRevision) return;
    lastRevision = revision;

    if (!matchStarted) {
      window.onlineMode = true;
      window.onlineColor = roomColor;
      window.playMode = 0;
      window.rule = 0;
      document.getElementById("UI").hidden = true;
      document.getElementById("container").hidden = false;
      document.getElementById("onlineGameStatus").hidden = false;
      panelEl.hidden = true;
      document.getElementById("modePanel").hidden = true;
      window.init();
      matchStarted = true;
    }

    window.board = Array.from({ length: 5 }, (_, y) =>
      Array.from({ length: 5 }, (_, x) => {
        const row = data.board[y];
        return row && row[x] !== undefined ? row[x] : "　";
      })
    );
    window.turn = Number(data.turn || 0);
    window.StartGame = !data.finished;
    window.resetBoard();
    window.flipText();
    status(`部屋 ${roomCode} ／ ${roomColor === 0 ? "白" : "黒"} ／ ${window.turn === roomColor ? "あなたの手番" : "相手の手番"}`);

    if (data.finished && lastFinishedRevision !== revision) {
      lastFinishedRevision = revision;
      const message = Number(data.winner) === roomColor ? "あなたの勝ちです！" : "対局終了。相手の勝ちです。";
      setTimeout(() => alert(message), 0);
    }
  }, error => status(`通信エラー: ${error.message}`));
}

async function startHostMatch() {
  const stateSnapshot = await get(roomStateRef);
  if (!stateSnapshot.exists()) {
    await set(roomStateRef, {
      board: standardBoard(),
      turn: 0,
      revision: 0,
      finished: false,
      winner: -1
    });
  }
}

function watchPlayersAsHost() {
  const playersRef = playersRefFor(roomCode);
  playersListener = onValue(playersRef, async snapshot => {
    const players = snapshot.val() || {};
    if (!players["1"]) {
      status(`部屋コード ${roomCode} を相手に伝えてください。参加待ちです…`);
      return;
    }
    status("相手が参加しました。対局を準備しています…");
    try {
      await startHostMatch();
      watchState();
    } catch (error) {
      status(`対局の開始に失敗しました: ${error.message}`);
    }
  }, error => status(`通信エラー: ${error.message}`));
}

window.openOnlineSetup = function () {
  panelEl.hidden = false;
  status("接続しています…");
  currentUser().then(() => status("部屋を作るか、相手のコードを入力してください。"))
    .catch(error => status(`Firebase認証に失敗しました: ${error.message}`));
};

window.leaveOnlineGame = function () {
  stopRoomListeners();
  roomCode = "";
  roomColor = null;
  roomStateRef = null;
  stateWatchStarted = false;
  matchStarted = false;
  window.onlineColor = null;
  window.onlineRoomCode = "";
  document.getElementById("onlineGameStatus").hidden = true;
};

window.publishOnlineState = async function () {
  if (!window.onlineMode || !roomStateRef || roomColor !== 1 - window.turn) return;
  const counts = [0, 0];
  const kings = [false, false];
  for (const row of window.board) for (const piece of row) {
    if (!piece || piece === "　" || piece[0] === "P") continue;
    const color = Number(piece[1]);
    counts[color]++;
    if (piece[0] === "K") kings[color] = true;
  }
  let winner = -1;
  if (!kings[0] || counts[0] <= 2) winner = 1;
  else if (!kings[1] || counts[1] <= 2) winner = 0;
  else if (!window.CanMove(window.turn)) winner = 1 - window.turn;

  const revision = lastRevision + 1;
  try {
    await set(roomStateRef, {
      board: window.board.map(row => row.slice()),
      turn: window.turn,
      revision,
      finished: winner !== -1,
      winner
    });
    lastRevision = revision;
  } catch (error) {
    status(`手を送信できませんでした: ${error.message}`);
  }
};

document.getElementById("createOnlineRoom").addEventListener("click", async () => {
  try {
    const user = await currentUser();
    status("部屋を作成しています…");
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = createCode();
      const result = await runTransaction(playersRefFor(code), current =>
        current === null ? { "0": user.uid } : undefined,
        { applyLocally: false }
      );
      if (!result.committed) continue;
      prepareRoom(code, 0);
      status(`部屋コード ${code} を相手に伝えてください。参加待ちです…`);
      watchPlayersAsHost();
      return;
    }
    status("部屋を作成できませんでした。もう一度お試しください。");
  } catch (error) {
    status(`部屋を作成できませんでした: ${error.message}`);
  }
});

document.getElementById("joinOnlineRoom").addEventListener("click", async () => {
  const code = (codeEl.value || "").trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
    status("6文字の部屋コードを入力してください。");
    return;
  }
  try {
    const user = await currentUser();
    const result = await runTransaction(playersRefFor(code), current => {
      if (!current || !current["0"] || current["0"] === user.uid || current["1"]) return undefined;
      return { ...current, "1": user.uid };
    }, { applyLocally: false });
    if (!result.committed) {
      status("部屋が見つからないか、すでに満員です。コードを確認してください。");
      return;
    }
    prepareRoom(code, 1);
    status("部屋に参加しました。相手が対局を開始するまでお待ちください…");
    watchState();
  } catch (error) {
    status(`参加できませんでした: ${error.message}`);
  }
});

document.getElementById("closeOnlinePanel").addEventListener("click", () => {
  panelEl.hidden = true;
  const modePanel = document.getElementById("modePanel");
  modePanel.hidden = false;
  setTimeout(() => modePanel.classList.add("show"), 10);
});
