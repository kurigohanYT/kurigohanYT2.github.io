import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  runTransaction,
  onValue,
  onDisconnect,
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
let forfeitRef = null;
let forfeitListener = null;
let rematchRef = null;
let rematchListener = null;
let lastRevision = -1;
let stateWatchStarted = false;
let matchStarted = false;
let lastFinishedRevision = -1;
let ownPresenceRef = null;
let opponentPresenceRef = null;
let presenceConnectionRef = null;
let opponentPresenceListener = null;
let presenceConnectionListener = null;
let opponentDisconnected = false;
let opponentPresenceMissing = false;
let forfeitDeclared = false;
let forfeitWritePending = false;
let forfeitStatusMessage = "";
let currentMatchFinished = false;
let latestStatusMessage = "";
let lastOpponentPresenceSnapshot = null;

const statusEl = document.getElementById("onlineStatus");
const codeEl = document.getElementById("onlineRoomCode");
const panelEl = document.getElementById("onlinePanel");
const connectionStatusEl = document.getElementById("onlineConnectionStatus");
const rematchButton = document.getElementById("rematchOnlineButton");
const rematchDecision = document.getElementById("rematchDecision");
const acceptRematchButton = document.getElementById("acceptRematchOnlineButton");
const declineRematchButton = document.getElementById("declineRematchOnlineButton");
let latestRoomState = null;
let latestRematch = null;

onValue(ref(db, ".info/connected"), snapshot => {
  if (!connectionStatusEl) return;
  connectionStatusEl.textContent = snapshot.val() === true
    ? "Firebaseに接続中"
    : "Firebaseに接続できません。通信を確認してください。";
});

function status(message) {
  latestStatusMessage = message;
  if (statusEl) statusEl.textContent = forfeitDeclared ? forfeitStatusMessage : message;
  const gameStatus = document.getElementById("onlineGameStatus");
  if (gameStatus) gameStatus.textContent = forfeitDeclared
    ? forfeitStatusMessage
    : opponentDisconnected
      ? "相手の接続が切れました。判定しています…"
    : opponentPresenceMissing
      ? "相手の接続情報がありません。相手側もページを更新して、新しい部屋で接続してください。"
      : message;
}

function stopPresenceTracking(markOffline = false) {
  if (opponentPresenceRef && opponentPresenceListener) {
    off(opponentPresenceRef, "value", opponentPresenceListener);
  }
  if (presenceConnectionRef && presenceConnectionListener) {
    off(presenceConnectionRef, "value", presenceConnectionListener);
  }
  const previousOwnPresenceRef = ownPresenceRef;
  if (markOffline && previousOwnPresenceRef) {
    set(previousOwnPresenceRef, false)
      .then(() => onDisconnect(previousOwnPresenceRef).cancel())
      .catch(() => {});
  }
  ownPresenceRef = null;
  opponentPresenceRef = null;
  presenceConnectionRef = null;
  opponentPresenceListener = null;
  presenceConnectionListener = null;
  opponentDisconnected = false;
  opponentPresenceMissing = false;
  forfeitDeclared = false;
  forfeitWritePending = false;
  forfeitStatusMessage = "";
  currentMatchFinished = false;
}

function startPresenceTracking() {
  stopPresenceTracking(true);
  if (!roomCode || roomColor === null) return;
  lastOpponentPresenceSnapshot = null;

  ownPresenceRef = ref(db, `rooms/${roomCode}/presence/${roomColor}`);
  const opponentColor = 1 - roomColor;
  opponentPresenceRef = ref(db, `rooms/${roomCode}/presence/${opponentColor}`);
  presenceConnectionRef = ref(db, ".info/connected");

  opponentPresenceListener = onValue(opponentPresenceRef, snapshot => {
    lastOpponentPresenceSnapshot = snapshot;
    updateOpponentPresenceMessage();
  }, error => status(`相手の接続状態を確認できません: ${error.message}`));

  presenceConnectionListener = onValue(presenceConnectionRef, async snapshot => {
    if (snapshot.val() !== true || !ownPresenceRef) return;
    try {
      // Queue the server-side disconnect action before advertising this client as online.
      await onDisconnect(ownPresenceRef).set(false);
      await set(ownPresenceRef, true);
    } catch (error) {
      status(`退出通知を設定できません: ${error.message}`);
    }
  });
}

function updateOpponentPresenceMessage() {
  if (!matchStarted) return;
  const gameStatus = document.getElementById("onlineGameStatus");
  if (forfeitDeclared) {
    window.StartGame = false;
    if (window.setGameFinished) window.setGameFinished(true);
    if (gameStatus) gameStatus.textContent = forfeitStatusMessage;
    return;
  }
  if (currentMatchFinished) return;
  if (!lastOpponentPresenceSnapshot || !lastOpponentPresenceSnapshot.exists()) {
    opponentDisconnected = false;
    opponentPresenceMissing = true;
    if (gameStatus) gameStatus.textContent = "相手の接続情報がありません。相手側もページを更新して、新しい部屋で接続してください。";
    return;
  }
  if (lastOpponentPresenceSnapshot.val() === true) {
    opponentDisconnected = false;
    opponentPresenceMissing = false;
    if (gameStatus) gameStatus.textContent = forfeitDeclared ? forfeitStatusMessage : latestStatusMessage;
  } else {
    opponentDisconnected = true;
    opponentPresenceMissing = false;
    if (!forfeitDeclared && !forfeitWritePending) {
      forfeitWritePending = true;
      set(forfeitRef, roomColor).catch(error => {
        forfeitWritePending = false;
        applyForfeit(roomColor);
        forfeitStatusMessage += `（Firebaseへの結果保存に失敗: ${error.message}）`;
        status(forfeitStatusMessage);
      });
    }
  }
}

function applyForfeit(winner) {
  if (winner !== 0 && winner !== 1) return;
  forfeitDeclared = true;
  forfeitWritePending = false;
  currentMatchFinished = true;
  forfeitStatusMessage = winner === roomColor
    ? `相手が切断したため、あなたの勝ちです（${roomColor === 0 ? "白" : "黒"}）。`
    : "相手が勝ちました。対局を終了しました。";
  window.StartGame = false;
  if (window.setGameFinished) window.setGameFinished(true);
  if (rematchButton) rematchButton.hidden = true;
  if (statusEl) statusEl.textContent = forfeitStatusMessage;
  const gameStatus = document.getElementById("onlineGameStatus");
  if (gameStatus) gameStatus.textContent = forfeitStatusMessage;
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
  if (forfeitRef && forfeitListener) off(forfeitRef, "value", forfeitListener);
  if (rematchRef && rematchListener) off(rematchRef, "value", rematchListener);
  playersListener = null;
  stateListener = null;
  forfeitListener = null;
  rematchListener = null;
}

function prepareRoom(code, color) {
  stopRoomListeners();
  roomCode = code;
  roomColor = color;
  roomStateRef = stateRefFor(code);
  forfeitRef = ref(db, `rooms/${code}/forfeit`);
  rematchRef = ref(db, `rooms/${code}/rematch`);
  latestRoomState = null;
  latestRematch = null;
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
    latestRoomState = data;
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
      if (window.setOnlineBoardOrientation) window.setOnlineBoardOrientation(roomColor === 0);
      window.playMode = 0;
      window.rule = 0;
      document.getElementById("UI").hidden = true;
      document.getElementById("container").hidden = false;
      document.getElementById("onlineGameStatus").hidden = false;
      if (connectionStatusEl) connectionStatusEl.hidden = false;
      if (rematchButton) rematchButton.hidden = true;
      panelEl.hidden = true;
      document.getElementById("modePanel").hidden = true;
      window.init();
      matchStarted = true;
      forfeitListener = onValue(forfeitRef, snapshot => {
        if (snapshot.exists()) applyForfeit(Number(snapshot.val()));
      }, error => status(`不戦勝の結果を読み取れません: ${error.message}`));
      rematchListener = onValue(rematchRef, snapshot => {
        latestRematch = snapshot.val();
        updateRematchControls();
        if (latestRematch && latestRematch.status === "rejected" && Number(latestRematch.from) === roomColor) {
          status("相手は再戦を断りました。対局結果に戻りました。");
        }
      }, error => status(`再戦の申し込みを確認できません: ${error.message}`));
    }

    window.board = Array.from({ length: 5 }, (_, y) =>
      Array.from({ length: 5 }, (_, x) => {
        const row = data.board[y];
        return row && row[x] !== undefined ? row[x] : "　";
      })
    );
    window.turn = Number(data.turn || 0);
    window.StartGame = !data.finished;
    currentMatchFinished = Boolean(data.finished);
    if (window.setGameFinished) window.setGameFinished(Boolean(data.finished));
    window.resetBoard();
    window.flipText();
    status(data.finished
      ? `部屋 ${roomCode} ／ ${roomColor === 0 ? "白" : "黒"} ／ ${Number(data.winner) === roomColor ? "あなたの勝ちです" : "相手の勝ちです"}`
      : `部屋 ${roomCode} ／ ${roomColor === 0 ? "白" : "黒"} ／ ${window.turn === roomColor ? "あなたの手番" : "相手の手番"}`);
    updateOpponentPresenceMessage();
    updateRematchControls();

    if (data.finished && lastFinishedRevision !== revision) {
      lastFinishedRevision = revision;
      const message = Number(data.winner) === roomColor ? "あなたの勝ちです！" : "対局終了。相手の勝ちです。";
      setTimeout(() => alert(message), 0);
    }
  }, error => status(`通信エラー: ${error.message}`));
}

function updateRematchControls() {
  if (!rematchButton || !latestRoomState) return;
  const finished = Boolean(latestRoomState.finished) && !forfeitDeclared;
  const pending = latestRematch && latestRematch.status === "pending";
  const ownRequestPending = pending && Number(latestRematch.from) === roomColor;
  const opponentRequestPending = pending && Number(latestRematch.from) !== roomColor;
  const isWinner = Number(latestRoomState.winner) === roomColor;
  rematchButton.hidden = !finished || isWinner || Boolean(opponentRequestPending);
  rematchButton.disabled = Boolean(ownRequestPending);
  rematchButton.textContent = ownRequestPending
    ? "再戦の返事を待っています…"
    : latestRematch && latestRematch.status === "rejected"
      ? "もう一度申し込む"
      : "再戦を申し込む";
  if (rematchDecision) rematchDecision.hidden = !finished || !isWinner || !opponentRequestPending;
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
  if (connectionStatusEl) connectionStatusEl.hidden = false;
  setTimeout(() => panelEl.classList.add("show"), 10);
  status("接続しています…");
  currentUser().then(() => status("部屋を作るか、相手のコードを入力してください。"))
    .catch(error => status(`Firebase認証に失敗しました: ${error.message}`));
};

window.leaveOnlineGame = function () {
  stopRoomListeners();
  stopPresenceTracking(true);
  if (window.setOnlineBoardOrientation) window.setOnlineBoardOrientation(false);
  roomCode = "";
  roomColor = null;
  roomStateRef = null;
  stateWatchStarted = false;
  matchStarted = false;
  window.onlineColor = null;
  window.onlineRoomCode = "";
  document.getElementById("onlineGameStatus").hidden = true;
  if (connectionStatusEl) connectionStatusEl.hidden = true;
  if (rematchButton) rematchButton.hidden = true;
};

if (rematchButton) rematchButton.addEventListener("click", async () => {
  if (!roomStateRef || !rematchRef || roomColor === null || !latestRoomState || Number(latestRoomState.winner) === roomColor) return;
  rematchButton.disabled = true;
  status("再戦を申し込んでいます…");
  try {
    const result = await runTransaction(rematchRef, current => {
      if (!latestRoomState.finished || Number(latestRoomState.winner) === roomColor || (current && current.status === "pending")) return;
      return { status: "pending", from: roomColor, requestedAt: Date.now() };
    }, { applyLocally: false });
    if (!result.committed) status("再戦を申し込めませんでした。対局の状態を確認してください。");
    else status("再戦を申し込みました。勝者の返事を待っています…");
  } catch (error) {
    status(`再戦を申し込めませんでした: ${error.message}`);
  } finally {
    updateRematchControls();
  }
});

if (acceptRematchButton) acceptRematchButton.addEventListener("click", async () => {
  if (!rematchRef || !roomStateRef || !latestRoomState || !latestRematch || latestRematch.status !== "pending") return;
  acceptRematchButton.disabled = true;
  declineRematchButton.disabled = true;
  try {
    const response = await runTransaction(rematchRef, current => {
      if (!current || current.status !== "pending" || Number(current.from) === roomColor || Number(latestRoomState.winner) !== roomColor) return;
      return { ...current, status: "accepted", decidedAt: Date.now() };
    }, { applyLocally: false });
    if (!response.committed) throw new Error("申し込みはすでに取り消されたか、処理済みです。");
    const restart = await runTransaction(roomStateRef, current => {
      if (!current || !current.finished || Number(current.winner) !== roomColor) return;
      return {
        board: standardBoard(),
        turn: 1 - Number(current.turn),
        revision: Number(current.revision || 0) + 1,
        finished: false,
        winner: -1
      };
    }, { applyLocally: false });
    if (!restart.committed) throw new Error("盤面を再開できませんでした。ページを更新して状態を確認してください。");
    status("再戦を開始します！");
  } catch (error) {
    status(`再戦を開始できませんでした: ${error.message}`);
  } finally {
    acceptRematchButton.disabled = false;
    declineRematchButton.disabled = false;
  }
});

if (declineRematchButton) declineRematchButton.addEventListener("click", async () => {
  if (!rematchRef || !latestRoomState || !latestRematch || latestRematch.status !== "pending") return;
  acceptRematchButton.disabled = true;
  declineRematchButton.disabled = true;
  try {
    const result = await runTransaction(rematchRef, current => {
      if (!current || current.status !== "pending" || Number(current.from) === roomColor || Number(latestRoomState.winner) !== roomColor) return;
      return { ...current, status: "rejected", decidedAt: Date.now() };
    }, { applyLocally: false });
    status(result.committed ? "再戦の申し込みを断りました。" : "申し込みはすでに処理されています。");
  } catch (error) {
    status(`申し込みを断れませんでした: ${error.message}`);
  } finally {
    acceptRematchButton.disabled = false;
    declineRematchButton.disabled = false;
    updateRematchControls();
  }
});

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
      startPresenceTracking();
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
    const targetPlayersRef = playersRefFor(code);
    // Prime the local cache with the room's current players before starting
    // the transaction. Otherwise a fresh client can see null locally and
    // abort the transaction before it has the server value.
    const existingSnapshot = await get(targetPlayersRef);
    const existingPlayers = existingSnapshot.val();
    if (!existingPlayers || !existingPlayers["0"] || existingPlayers["1"]) {
      status("部屋が見つからないか、すでに満員です。コードを確認してください。");
      return;
    }
    if (existingPlayers["0"] === user.uid) {
      status("自分が作成した部屋には参加できません。別のブラウザか端末から参加してください。");
      return;
    }

    const result = await runTransaction(targetPlayersRef, current => {
      // A fresh client may initially have no local cache for this node even
      // though the preceding get() found it on the server. Use that snapshot
      // as the transaction's first candidate; Firebase will retry against
      // the server value if the room changed meanwhile.
      const players = current ?? existingPlayers;
      if (!players || !players["0"] || players["0"] === user.uid || players["1"]) return undefined;
      return { ...players, "1": user.uid };
    }, { applyLocally: false });
    if (!result.committed) {
      status("部屋が見つからないか、すでに満員です。コードを確認してください。");
      return;
    }
    prepareRoom(code, 1);
    startPresenceTracking();
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
