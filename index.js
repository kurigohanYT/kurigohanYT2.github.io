/* 定義 */
var container = document.getElementById("container");
var grid = document.getElementById("grid");
var w = 5;
var h = 5;
var margin = 40;
var kijun = Math.min(
    window.innerWidth - margin,
    window.innerHeight - 220
);

var size = Math.floor(kijun / w);
var can = document.getElementById("can");
can.width = size * w;
can.height = size * h;
var ctx = can.getContext("2d");
var colorMode = 0;//0　ライトモード　1　ダークモード
var colorSets = [
    ["#EED2AA","#8B4513"],  // ダークモード
    ["#7393B3","#36454F"] // ライトモード
];
var buttonColorMode = ["lightyellow","lightblue"];
var buttonColorModeC = 0;
for(var i=0;i<w;i++){
    for(var j=0;j<h;j++){
        ctx.fillStyle = (i+j)%2==0?colorSets[colorMode][0]:colorSets[colorMode][1];
        ctx.beginPath();
        ctx.rect(i*size,j*size,size,size);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }
}
var button = document.getElementById("sentaku");
grid.style.width = size * w + "px"; 
grid.style.height = size * h + "px"; 
grid.style.border = "none";
button.style.width = size * w + "px";


var move = {
    "K": [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
    "Q": [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
    "R": [[-1,0],[0,-1],[0,1],[1,0]],
    "B": [[-1,-1],[-1,1],[1,-1],[1,1]],
    "N": [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
    "P": [[0,0]],
    "　":[[0,0]]
};

var board = [];
var cells = [];
var turn = 0;
var rule = 0; //0公式 1ランダム
var StartGame = false;
var nextX = [];
var nextY = [];
var lastX = -1;
var lastY = -1;

// 配置用
var placing = true;
var placingColor = "0"; // 白から
var remainingPieces = [];
var selectedPiece = null;

var playMode = 0;// 0:対人戦, 1:コンピューター対戦
var onlineMode = false;
var boardFlipped = false;

// Online player 0 sits at the bottom of the board; player 1 uses the default view.
window.setOnlineBoardOrientation = function(flipped){
    boardFlipped = Boolean(flipped);
    document.getElementById("board").classList.toggle("board-flipped", boardFlipped);
};

// 初期化
function init(){
    board = [];
    cells = [];
    placing = false;
    selectedPiece = null;
    remainingPieces = [];
    sentaku.hidden = true;
    turn = 0;
    StartGame = false;
    nextX = [];
    nextY = [];
    lastX = -1;
    lastY = -1;

    // Remove cells from any previous game before building the new board.
    while(grid.firstChild) grid.removeChild(grid.firstChild);
    ctx.clearRect(0,0,can.width,can.height);

    var cellcount = 0;
    for(var i = 0; i < h; i++){
        board[i] = [];
        cells[i] = [];
        for(var j = 0; j < w; j++){
            cellcount++;
            board[i][j] = "　";
            var cell = document.createElement("img");
            cell.src = "./none.png";
            cell.style.position = "absolute";
            cell.style.width = size + "px";
            cell.style.height = size+"px";
            cell.style.maxHeight = size + "px";
            cell.style.objectFit = "contain";
            cell.style.left = (j*size) + "px";
            cell.style.top = (i*size) + "px";
            cell.style.border = "0px solid black";
            cells[i].push(cell);
            grid.appendChild(cell);
        }
    }
    if(rule==0) kousiki();
    else random();
    // In random setup, the AI must wait until both formations are ready.
    // The random-mode completion handler starts its first turn.
    if(playMode==1 && rule==0){
        if(Math.floor(Math.random()*2)==0){
            setTimeout(aiTurn,100);
        }else{
            turn=Number(playerColor);
        }
    }
}
var pngname = {"K0":"0_king.png","Q0":"0_queen.png","R0":"0_rook.png","B0":"0_bishop.png","N0":"0_knight.png","P0":"0_pawn.png",
               "K1":"1_king.png","Q1":"1_queen.png","R1":"1_rook.png","B1":"1_bishop.png","N1":"1_knight.png","P1":"1_pawn.png",
               "　":"none.png"};
// 公式ルール
function kousiki(){
    board[0][0]="R0"; board[0][1]="B0"; board[0][2]="K0"; board[0][3]="N0"; board[0][4]="Q0";
    board[4][0]="Q1"; board[4][1]="N1"; board[4][2]="K1"; board[4][3]="B1"; board[4][4]="R1";
    for(var i=0;i<h;i++){
        for(var j=0;j<w;j++){
            cells[i][j].src = pngname[board[i][j]];
        }
    }
    StartGame=true;
    flipText();
}

// ランダム配置
function random(){
    sentaku.hidden = false;
    placingColor=playMode==1?playerColor:"0";
    placing=true;
    StartGame=false;

    // 盤初期化
    for(var i=0;i<h;i++){
        for(var j=0;j<w;j++){
            board[i][j]="　";
        }
    }

    // Each king is fixed in the center of its own home row.
    board[0][2] = "K0";
    board[4][2] = "K1";

    remainingPieces=["Q","R","B","N"];
    selectedPiece=null;
    if(playMode==1){
        remainingPieces=["Q","R","B","N"];
        selectedPiece=null;
        alert("自分の色の列に Q,R,B,N を配置してください（AIの配置はゲーム開始まで非表示です）");
    }else{
        alert("白プレイヤー: Q,R,B,N を配置してください（駒を選択後クリック）");
    }
    flipText();
}

// 駒選択用
function choosePiece(piece){
    if(!placing) return;
    if(!remainingPieces.includes(piece)){
        alert(piece+" はもう置けません");
        return;
    }
    selectedPiece=piece;
    alert(piece+" を配置する場所を選んでください");
}

function nextGame(){
    if(StartGame) return;
    container.removeChildren();
    init();
}
var playerColor = "1";
var aiColor = "0";
function resetBoard(){
    for(var i=0;i<w;i++){
        for(var j=0;j<h;j++){
            ctx.fillStyle = (i+j)%2==0?colorSets[colorMode][0]:colorSets[colorMode][1];
            ctx.beginPath();
            ctx.rect(i*size,j*size,size,size);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        }
    }
    ctx.fillStyle = "rgba(255, 165, 0,1)";
    if (pickpieceX !== null && pickpieceY !== null) {
        ctx.fillRect(pickpieceX*size, pickpieceY*size, size, size);
        ctx.stroke();
    }
    for(var i=0;i<h;i++){
        for(var j=0;j<w;j++){
             cells[i][j].src = pngname[board[i][j]];
             cells[i][j].style.opacity = 1;
            if(board[i][j]=="　")cells[i][j].style.opacity = 0.0;
        }
    }
}
var pickpieceX = null;
var pickpieceY = null;
// クリック処理
container.onclick=function(e){
    var rect = can.getBoundingClientRect();
var x = Math.floor((e.clientX - rect.left) / size);
var y = Math.floor((e.clientY - rect.top) / size);
    if(x<0||x>=w||y<0||y>=h) return;
    if(boardFlipped){
        x = w - 1 - x;
        y = h - 1 - y;
    }

    resetBoard();

    // 配置フェーズ
    if(rule==1 && placing){
        if(selectedPiece==null){ alert("駒を選択してください"); return; }
        if(board[y][x]!="　" || (placingColor == "0" && y != 0) || (placingColor == "1" && y != 4)){ alert("ここには置けません"); return; }

        // 駒を配置
        board[y][x]=selectedPiece+placingColor;
        renderPlacementBoard();

        remainingPieces=remainingPieces.filter(p=>p!=selectedPiece);
        selectedPiece=null;

        if(remainingPieces.length==0){
            if(playMode==1){
                var aiRow=Number(aiColor)==0?0:4;
                var emptyCols=[0,1,3,4];
                var aiPieces=["Q","R","B","N"];
                for(var ai=aiPieces.length-1;ai>0;ai--){
                    var swap=Math.floor(Math.random()*(ai+1));
                    [aiPieces[ai],aiPieces[swap]]=[aiPieces[swap],aiPieces[ai]];
                }
                for(var ap=0;ap<aiPieces.length;ap++) board[aiRow][emptyCols[ap]]=aiPieces[ap]+aiColor;
                placing=false; StartGame=true; turn=Number(aiColor);
                sentaku.hidden=true;
                resetBoard(); flipText();
                alert("AIの配置が決まりました。ゲーム開始！");
                if(turn==Number(aiColor)) setTimeout(aiTurn,100);
            }else if(placingColor=="0"){
                placingColor="1"; remainingPieces=["Q","R","B","N"]; selectedPiece=null;
                renderPlacementBoard();
                alert("黒プレイヤー: Q,R,B,N を配置してください");
            }else{
                placing=false; StartGame=true;
                sentaku.hidden=true;
                resetBoard();
                alert("両プレイヤーの配置が完了しました。ゲーム開始！");
            }
        }
        resetBoard();
        flipText();
        return;
    }

    if(!StartGame) return;

    var piece=board[y][x][0];
    if(board[y][x][1]!=String(turn) && board[y][x]!="　") return;
    if(board[y][x][1] != String(turn) && board[y][x] != "　") return;

    if(playMode == 1 && turn != Number(playerColor)){
        return;
    }
    if(onlineMode && turn !== window.onlineColor) return;
    if(!CanMove(turn)){ alert((turn==0?"黒":"白")+"の勝ち"); StartGame=false; return; }
    if(King_Flag()==1){alert("黒の勝ち");StartGame=false;return}
    if(King_Flag()==2){alert("白の勝ち");StartGame=false;return}
                       
    if(piece!="　"){
        nextX=[]; nextY=[]; lastX=x; lastY=y;
        pickpieceX = x; pickpieceY = y;
        flipText();
    }else{
        for(var i=0;i<nextY.length;i++){
            if(nextX[i]==x && nextY[i]==y){
                board[y][x]=board[lastY][lastX];
                board[lastY][lastX]="　";
                if (board[lastY][lastX] == "　") {
                    cells[lastY][lastX].src = pngname["　"];
                    cells[lastY][lastX].style.opacity = 1;
                } else {
                    cells[lastY][lastX].src = pngname[board[lastY][lastX]];
                    cells[lastY][lastX].style.opacity = 1;
                }

                cells[y][x].src=pngname[board[y][x]];
                cells[y][x].style.color=board[y][x][1]=="0"?"red":"blue";
                turn=(turn+1)%2;
                pickpieceX = null; pickpieceY = null;
                nextX=[]; nextY=[];
                Piece_to_Stone(x,y);
                twoPiece();
                flipText();
                if(StartGame && !CanMove(turn)){
                    var winner=turn==0?"黒":"白";
                    if(playMode==1) winner=turn==Number(aiColor)?"プレイヤー":"AI";
                    alert((turn==0?"白":"黒")+"は動けません。"+winner+"の勝ち！");
                    StartGame=false;
                }
                if(StartGame && playMode==1 && turn==Number(aiColor)) setTimeout(aiTurn,100);
                if(onlineMode && typeof window.publishOnlineState==="function") window.publishOnlineState();
                return;
            }
        }
    }
    
    if(piece=="　"||piece=="P") return;
    var moves=move[piece];
    for(var i=0;i<moves.length;i++){
        var nx=x+moves[i][1];
        var ny=y+moves[i][0];
        if(nx<0||nx>=w||ny<0||ny>=h) continue;
        if(board[ny][nx][0]!="　") continue;
        if(piece=="Q"||piece=="R"||piece=="B"){
            while(nx>=0 && nx<w && ny>=0 && ny<h){
                if(board[ny][nx][0]!="　") break;
                /*
                cells[ny][nx].style.backgroundColor="yellow";
                */
               ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
               ctx.fillRect(nx*size, ny*size, size, size);
                nextX.push(nx); nextY.push(ny);
                nx+=moves[i][1]; ny+=moves[i][0];
            }
        }else{
            ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
               ctx.fillRect(nx*size, ny*size, size, size);
            nextX.push(nx); nextY.push(ny);
        }
    }
};
function flipText(){
    if(rule==1 && placing){
        renderPlacementBoard();
        return;
    }
    resetBoard();
    for(var i=0;i<h;i++){
        for(var j=0;j<w;j++){
            if(board[i][j]=="　") continue;
            if(board[i][j][1] == "1"){
                cells[i][j].style.transform="rotate(0deg)";
                continue;
            };
            if(board[i][j][1]=="0"){
                cells[i][j].style.color="red";
                cells[i][j].style.transform="rotate(180deg)";
            }
        }
    }
}

// During random setup, hide the previous player's formation so the next player
// cannot use it when choosing positions. Reveal the complete board at game start.
function renderPlacementBoard(){
    for(var y=0;y<h;y++) for(var x=0;x<w;x++){
        var p=board[y][x];
        var visible=p!=="　" && p[1]===placingColor;
        cells[y][x].src=visible?pngname[p]:pngname["　"];
        cells[y][x].style.opacity=visible?1:0;
        cells[y][x].style.transform="rotate(0deg)";
    }
}

function twoPiece(){
    resetBoard();
    var pieces=["K","Q","R","B","N"];
    var one=0; var two=0;
    for(var i=0;i<h;i++){
        for(var j=0;j<w;j++){
            if(board[i][j]=="　") continue;
            for(var k=0;k<pieces.length;k++){
                if(board[i][j][0]==pieces[k]){
                    if(board[i][j][1]=="0") one++;
                    else two++;
                }
            }
        }
    }
    if(one<=2){ alert("白の駒が2個以下になりました。黒の勝ち！"); StartGame=false; }
    else if(two<=2){ alert("黒の駒が2個以下になりました。白の勝ち！"); StartGame=false; }
}

function King_Flag(){
    var white = false
    var black = false
for(var i=0;i<h;i++){
    for(var j=0;j<w;j++){
        if(board[i][j][0]=="K"){
            if(board[i][j][1]=="0")white=true
            else black = true
        }
    }
}
    if(!white){
        return 1
    }else if(!black){
        return 2
    }else{
        return 0
    }
}

function Piece_to_Stone(x, y) {
    resetBoard();
    if (board[y][x] == "　") return;
    var color = board[y][x][1]; // '0' or '1'
    var dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (var d = 0; d < dirs.length; d++) {
        var dy = dirs[d][0], dx = dirs[d][1];
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (board[ny][nx] == "　") continue;
        if (board[ny][nx][0] == "P") continue;
        if (typeof board[ny][nx][1] !== 'undefined' && board[ny][nx][1] == color) continue;
        var cx = nx, cy = ny;
        var foundSame = false;
        while (cx >= 0 && cx < w && cy >= 0 && cy < h) {
            if (board[cy][cx] == "　") break;
            if (board[cy][cx][0] == "P") break;
            if (typeof board[cy][cx][1] !== 'undefined' && board[cy][cx][1] == color) {
                foundSame = true;
                break;
            }
            cx += dx; cy += dy;
        }
        if (!foundSame) continue;
        var fx = x + dx, fy = y + dy;
        while (fx !== cx || fy !== cy) {
            if (board[fy][fx] != "　") {
                board[fy][fx] = "P" + (color == "0" ? "1" : "0");
            }
            fx += dx; fy += dy;
        }
    }
    var kingResult=King_Flag();
    if(kingResult==1){ alert("白のキングが石になりました。黒の勝ち！"); StartGame=false; }
    else if(kingResult==2){ alert("黒のキングが石になりました。白の勝ち！"); StartGame=false; }
    resetBoard();
}


function CanMove(turn){
    for(var y=0;y<h;y++){
        for(var x=0;x<w;x++){
            if(board[y][x]=="　") continue;
            if(board[y][x][1]!=String(turn)) continue;
            var piece=board[y][x][0];
            if(piece=="P") continue;
            var moves=move[piece];
            for(var i=0;i<moves.length;i++){
                var nx=x+moves[i][1]; var ny=y+moves[i][0];
                if(nx<0||nx>=w||ny<0||ny>=h) continue;
                if(piece=="Q"||piece=="R"||piece=="B"){
                    while(nx>=0&&nx<w&&ny>=0&&ny<h){
                        if(board[ny][nx][0]!="　") break;
                        return true;
                        nx+=moves[i][1]; ny+=moves[i][0];
                    }
                }else{
                    if(board[ny][nx][0]=="　") return true;
                }
            }
        }
    }
    return false;
}
/*
function rulebook(){
    p.innerHTML = `
    <h2>📖 ルール</h2>

    <h3>基本ルール</h3>
    <ul>
        <li>白と黒の2人で対戦します</li>
        <li>相手の駒は取れず、相手の駒があるマスは通れません</li>
        <li>駒は K,Q,R,B,N,P の6種類です</li>
    </ul>

    <h3>駒の動き</h3>
    <ul>
        <li>K：上下左右と斜めに1マス</li>
        <li>Q：全方向に何マスでも</li>
        <li>R：上下左右に何マスでも</li>
        <li>B：斜めに何マスでも</li>
        <li>N：L字移動</li>
        <li>P：石（動けない）</li>
    </ul>

    <h3>ゲーム進行</h3>
    <ul>
        <li>自分のターンに駒を1つ動かす</li>
        <li>自分の駒で相手の駒を挟むと、その駒は石になる</li>
        <li>石は倒された側の色になり、動けず、挟み判定にも参加しない</li>
    </ul>

    <h3>勝利条件</h3>
    <ul>
        <li>相手のKを石にすると勝ち</li>
        <li>駒が2個以下になると負け</li>
        <li>合法な移動先がなくなっても負け</li>
    </ul>

    <h3>配置ルール</h3>
    <ul>
        <li>公式モード：配置固定</li>
        <li>ランダムモード：Kは中央固定。Q,R,B,Nを自分の列に1個ずつ配置</li>
        <li>配置中、次のプレイヤーには前の配置を表示しない</li>
    </ul>
    `;
    p.className = "ruleBox";
    var closeButton = document.createElement("button");
    closeButton.innerText = "✕";
    closeButton.className = "closeBtn";

    p.appendChild(closeButton);
    p.style.display = "block";

    closeButton.onclick = function() {
        p.style.display = "none";
    }
}
    */
function rulebook(){
    var overlay = document.getElementById("ruleOverlay");
    var content = document.getElementById("ruleContent");

    content.innerHTML = `
    <h2>📖 ルール</h2>

    <h3>基本ルール</h3>
    <ul>
        <li>白と黒の2人で対戦します</li>
        <li>最初に白→黒の順で K,Q,R,B,N を配置します</li>
        <li>駒は K,Q,R,B,N,P の6種類です</li>
    </ul>

    <h3>駒の動き</h3>
    <ul>
        <li>K：上下左右＋斜め1マス</li>
        <li>Q：全方向に何マスでも</li>
        <li>R：上下左右に何マスでも</li>
        <li>B：斜めに何マスでも</li>
        <li>N：L字移動</li>
        <li>P：石（動けない）</li>
    </ul>

    <h3>ゲーム進行</h3>
    <ul>
        <li>自分のターンに駒を1つ動かす</li>
        <li>相手の駒は飛び越えられない</li>
        <li>自分の駒で挟むと間の相手駒は石になる</li>
    </ul>

    <h3>勝利条件</h3>
    <ul>
        <li>相手のKを石にすると勝ち</li>
        <li>駒が2個以下になると負け</li>
    </ul>

    <h3>配置ルール</h3>
    <ul>
        <li>公式モード：配置固定</li>
        <li>カスタムモード：自由に配置</li>
    </ul>
    `;

    overlay.hidden = false;
}
document.getElementById("closeRule").onclick = function(){
    document.getElementById("ruleOverlay").hidden = true;
};
var startButton = document.getElementById("start");
var _rule = document.getElementById("rule");
var gameDiv = document.getElementById("game");
var set = document.getElementById("setting");
var panel = document.getElementsByClassName("panelContent")[0];
var cansel = document.getElementById("cansel");
var mainButtons = document.getElementsByClassName("mainButtons")[0];

function setting(){
    colorMode = (colorMode + 1) % 2;
    buttonColorModeC = (buttonColorModeC + 1) % buttonColorMode.length;
    set.style.backgroundColor = buttonColorMode[buttonColorModeC];
    document.body.style.backgroundColor = (colorMode == 0) ? "#e8edf2" : "#1a1d24";
    document.body.style.color = (colorMode == 0) ? "#222" : "#eee";
    panel.style.backgroundColor = (colorMode == 1) ? "#2a2a2a" : "white";
    panel.style.color = (colorMode == 0) ? "#222" : "#eee";
    cansel.style.backgroundColor = (colorMode == 1) ? "#444" : "#ddd";
    cansel.style.color = (colorMode == 1) ? "#eee" : "#333";
    UI.style.backgroundColor = (colorMode == 1) ? "#2a2a2a" : "#f7f7f7";
    mainButtons.style.backgroundColor = (colorMode == 1) ? "#2a2a2a" : "transparent";
    resetBoard();
}
var gameHistory = [];
function boardToString(){
    return board.map(row => row.join("")).join("/");
}

function startGame(){
    modePanel.hidden = false;
    setTimeout(() => {
        modePanel.classList.add("show");
    }, 10);
}
function closePanel(){
    modePanel.classList.remove("show");
    setTimeout(() => {
        modePanel.hidden = true;
    }, 300);
}
function startWithMode(m){
    if(m==4){
        closePanel();
        setTimeout(function(){
            if(window.openOnlineSetup) window.openOnlineSetup();
            else alert("オンライン機能の読み込み中です。少し待ってからもう一度お試しください。");
        },320);
        return;
    }
    onlineMode=false;
    if(window.leaveOnlineGame) window.leaveOnlineGame();
    if(m == 0 || m == 1) rule = 0;
    else rule = 1;
    playMode = m % 2;
    closePanel();

    // Let the mode panel finish closing before revealing a freshly initialized game.
    setTimeout(function(){
        UI.hidden = true;
        container.hidden = false;
        init();
        resetBoard();
    },320);
}

startButton.style.backgroundColor = "lightgreen";
startButton.style.border = "2px solid black";
startButton.style.borderRadius = "10px";
startButton.style.cursor = "pointer";

_rule.style.backgroundColor = "lightblue";
_rule.style.border = "2px solid black";
_rule.style.borderRadius = "10px";
_rule.style.cursor = "pointer";

set.style.backgroundColor = buttonColorMode[buttonColorModeC];
set.style.border = "2px solid black";
set.style.borderRadius = "10px";
set.style.cursor = "pointer";

var UI = document.getElementById("UI");
UI.style.zIndex = "1000";
var p = document.createElement("p");
UI.appendChild(p);

window.choosePiece = choosePiece;
window.startGame = startGame;
window.rulebook = rulebook;
window.setting = setting;
window.startWithMode = startWithMode;
window.closePanel = closePanel;

function aiTurn(){

    const sboard = new Board(board);

    const move = AI.think(sboard, aiColor, 4);

    if(move == null){
        alert("AIは動けません。あなたの勝ちです！");
        StartGame=false;
        return;
    }

    applyMove(move.fx, move.fy, move.tx, move.ty);

    turn ^= 1;

    flipText();
    if(StartGame && !CanMove(turn)){
        alert((turn==0?"白":"黒")+"は動けません。AIの勝ちです！");
        StartGame=false;
        return;
    }

}
function applyMove(fx, fy, tx, ty){

    board[ty][tx] = board[fy][fx];
    board[fy][fx] = "　";

    cells[fy][fx].src = pngname["　"];
    cells[fy][fx].style.opacity = 1;

    cells[ty][tx].src = pngname[board[ty][tx]];
    cells[ty][tx].style.color =
        board[ty][tx][1] == "0" ? "red" : "blue";

    Piece_to_Stone(tx, ty);

    twoPiece();

    flipText();

}

window.setOnlineBoardOrientation = function(flipped){
    boardFlipped = Boolean(flipped);
    document.getElementById("board").classList.toggle("board-flipped", boardFlipped);
};
