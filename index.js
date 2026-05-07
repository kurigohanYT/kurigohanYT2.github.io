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

// 初期化
function init(){
    board = [];
    cells = [];
    turn = 0;
    StartGame = false;
    nextX = [];
    nextY = [];
    lastX = -1;
    lastY = -1;

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
    placingColor="0";
    placing=true;
    StartGame=false;

    // 盤初期化
    for(var i=0;i<h;i++){
        for(var j=0;j<w;j++){
            board[i][j]="　";
        }
    }

    // 白Kを上中央固定
    board[0][2] = "K0";
cells[0][2].src = pngname["K0"];

    remainingPieces=["Q","R","B","N"];
    selectedPiece=null;
    alert("白プレイヤー: Q,R,B,N を配置してください（駒を選択後クリック）");
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

    resetBoard();

    // 配置フェーズ
    if(rule==1 && placing){
        if(selectedPiece==null){ alert("駒を選択してください"); return; }
        if(board[y][x]!="　" || (placingColor == "0" && y != 0) || (placingColor == "1" && y != 4)){ alert("ここには置けません"); return; }

        // 駒を配置
        board[y][x]=selectedPiece+placingColor;
        cells[y][x].src = pngname[board[y][x]];
        cells[y][x].style.color=(placingColor=="0")?"red":"blue";

        remainingPieces=remainingPieces.filter(p=>p!=selectedPiece);
        selectedPiece=null;

        if(remainingPieces.length==0){
            if(placingColor=="0"){
                placingColor="1"; remainingPieces=["Q","R","B","N"]; selectedPiece=null;
                board[4][2]="K1"; cells[4][2].innerText="K"; cells[4][2].style.color="blue";
                cells[0][0].innerText=""; cells[0][1].innerText=""; cells[0][3].innerText=""; cells[0][4].innerText="";
                alert("黒プレイヤー: Q,R,B,N を配置してください");
            }else{
                placing=false; StartGame=true;
                for(var i = 0; i < h; i++){
                    for(var j = 0; j < w; j++){
                        if(board[i][j]=="　") continue;
                        if(board[i][j][1]=="0") cells[i][j].style.color="red";
                        else cells[i][j].style.color="blue";
                        cells[i][j].src = pngname[board[i][j]];
                    }
                }
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
    if(!CanMove(turn)){ alert((turn==0?"黒":"白")+"の勝ち"); StartGame=false; return; }

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
            if (board[fy][fx][0] == "K") {
                alert((color == "0" ? "白" : "黒") + "の勝ち！");
                StartGame = false;
            }
            if (board[fy][fx] != "　") {
                board[fy][fx] = "P" + (color == "0" ? "1" : "0");
                cells[fy][fx].innerText = "P";
            }
            if (!StartGame) return;
            fx += dx; fy += dy;
        }
    }
}


function CanMove(turn){
    resetBoard();
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
    rule = m;
    closePanel();
    
    container.hidden = false;
    UI.hidden = true;
    init();
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