class MoveGenerator{

    static generate(board, color){

        const moves = [];

        for(let y = 0; y < board.height; y++){
            for(let x = 0; x < board.width; x++){

                const piece = board.get(x, y);

                if(!board.isFriend(piece, color)) continue;

                switch(board.getType(piece)){

                    case "K":
                        this.generateKing(board, x, y, color, moves);
                        break;

                    case "Q":
                        this.generateQueen(board, x, y, color, moves);
                        break;

                    case "R":
                        this.generateRook(board, x, y, color, moves);
                        break;

                    case "B":
                        this.generateBishop(board, x, y, color, moves);
                        break;

                    case "N":
                        this.generateKnight(board, x, y, color, moves);
                        break;

                }

            }
        }

        return moves;
    }

    static generateKing(board, x, y, color, moves){

        for(let dx=-1;dx<=1;dx++){
            for(let dy=-1;dy<=1;dy++){

                if(dx===0 && dy===0) continue;

                this.addMove(board,moves,x,y,x+dx,y+dy,color);

            }
        }

    }

    static generateQueen(board, x, y, color, moves){

        const dir = [
            [ 1, 0],[-1, 0],
            [ 0, 1],[ 0,-1],
            [ 1, 1],[ 1,-1],
            [-1, 1],[-1,-1]
        ];

        for(const [dx,dy] of dir){
            this.slide(board,x,y,dx,dy,color,moves);
        }

    }

    static generateRook(board, x, y, color, moves){

        const dir = [
            [ 1, 0],[-1, 0],
            [ 0, 1],[ 0,-1]
        ];

        for(const [dx,dy] of dir){
            this.slide(board,x,y,dx,dy,color,moves);
        }

    }

    static generateBishop(board, x, y, color, moves){

        const dir = [
            [ 1, 1],[ 1,-1],
            [-1, 1],[-1,-1]
        ];

        for(const [dx,dy] of dir){
            this.slide(board,x,y,dx,dy,color,moves);
        }

    }

    static generateKnight(board, x, y, color, moves){

        const dir = [
            [ 2, 1],[ 2,-1],
            [-2, 1],[-2,-1],
            [ 1, 2],[ 1,-2],
            [-1, 2],[-1,-2]
        ];

        for(const [dx,dy] of dir){

            this.addMove(
                board,
                moves,
                x,
                y,
                x+dx,
                y+dy,
                color
            );

        }

    }

    static slide(board,x,y,dx,dy,color,moves){

        let nx = x + dx;
        let ny = y + dy;

        while(board.inside(nx,ny)){

            const piece = board.get(nx,ny);

            if(board.isEmpty(piece)){

                moves.push(new Move(x,y,nx,ny));

            }else{

                return;

            }

            nx += dx;
            ny += dy;

        }

    }

    static addMove(board,moves,fx,fy,tx,ty,color){

        if(!board.inside(tx,ty)) return;

        const piece = board.get(tx,ty);

        if(!board.isEmpty(piece)) return;

        moves.push(new Move(fx,fy,tx,ty));

    }

}
