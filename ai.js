class AI{

    static think(board,color,depth=4){

        color = String(color);

        const moves=MoveGenerator.generate(board,color);

        let bestMove=null;
        let bestScore=-Infinity;

        for(const move of moves){

            board.makeMove(move);

            let score=-Search.search(
                board,
                depth-1,
                -Infinity,
                Infinity,
                AI.opponent(color)
            );

            board.undoMove();

            if(score>bestScore){

                bestScore=score;
                bestMove=move;

            }

        }

        return bestMove;

    }

    static opponent(color){
        return color === "0" ? "1" : "0";
    }

}
