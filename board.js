class Board{
    constructor(board){
        this.board = board.map(row => row.slice());

        this.height = this.board.length;
        this.width = this.board[0].length;

        this.history = [];
    }

    clone(){
        return new Board(this.board);
    }

    // =====================
    // 基本操作
    // =====================

    inside(x,y){
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    get(x,y){
        return this.board[y][x];
    }

    set(x,y,piece){
        this.board[y][x] = piece;
    }

    // =====================
    // 駒判定
    // =====================

    isEmpty(piece){
        return piece === "　";
    }

    isStone(piece){
        return piece[0] === "P";
    }

    getType(piece){
        return this.isEmpty(piece) ? null : piece[0];
    }

    getColor(piece){
        return this.isEmpty(piece) ? null : piece[1];
    }

    isFriend(piece,color){
        return !this.isEmpty(piece)
            && !this.isStone(piece)
            && this.getColor(piece) === color;
    }

    isEnemy(piece,color){
        return !this.isEmpty(piece)
            && !this.isStone(piece)
            && this.getColor(piece) !== color;
    }

    // =====================
    // 手を進める
    // =====================

    makeMove(move){

        const movedPiece = this.get(move.fx, move.fy);
        const capturedPiece = this.get(move.tx, move.ty);

        const record = {
            move,
            movedPiece,
            capturedPiece,
            stoneChanges:[]
        };

        this.set(move.tx, move.ty, movedPiece);
        this.set(move.fx, move.fy, "　");

        this.applyStoneEffect(record);

        this.history.push(record);
    }

    undoMove(){

        if(this.history.length === 0) return;

        const record = this.history.pop();
        const move = record.move;

        this.set(move.fx, move.fy, record.movedPiece);
        this.set(move.tx, move.ty, record.capturedPiece);

        for(let i = record.stoneChanges.length - 1; i >= 0; i--){

            const s = record.stoneChanges[i];

            this.set(s.x, s.y, s.before);

        }

    }

    // =====================
    // 石化処理
    // =====================

    applyStoneEffect(record){

        const move = record.move;

        const dir = [
            [ 1, 0],[-1, 0],
            [ 0, 1],[ 0,-1],
            [ 1, 1],[ 1,-1],
            [-1, 1],[-1,-1]
        ];

        for(const [dx,dy] of dir){
            this.checkStone(record, move.tx, move.ty, dx, dy);
        }

    }

    checkStone(record,x,y,dx,dy){

        const me = this.get(x,y);
        const color = this.getColor(me);

        let nx = x + dx;
        let ny = y + dy;

        const flip = [];

        while(this.inside(nx,ny)){

            const piece = this.get(nx,ny);

            if(this.isEmpty(piece) || this.isStone(piece)){
                return;
            }

            if(this.isEnemy(piece,color)){
                flip.push({x:nx,y:ny});
                nx += dx;
                ny += dy;
                continue;
            }

            if(this.isFriend(piece,color)){

                if(flip.length === 0) return;

                for(const p of flip){
                    this.stone(record,p.x,p.y);
                }

                return;
            }

        }

    }

    stone(record,x,y){

        const before = this.get(x,y);

        record.stoneChanges.push({
            x,
            y,
            before
        });

        this.set(x,y,"P"+before[1]);

    }

    // =====================
    // 局面情報
    // =====================

    pieceCount(color){

        let cnt = 0;

        for(let y = 0; y < this.height; y++){
            for(let x = 0; x < this.width; x++){

                const piece = this.get(x,y);

                if(this.isFriend(piece,color)){
                    cnt++;
                }

            }
        }

        return cnt;

    }

    findKing(color){

        for(let y = 0; y < this.height; y++){
            for(let x = 0; x < this.width; x++){

                if(this.get(x,y) === "K"+color){
                    return {x,y};
                }

            }
        }

        return null;

    }

    isKingAlive(color){
        return this.findKing(color) !== null;
    }

}