class Search{

    static search(board,depth,alpha,beta,color){

        color = String(color);

        if(depth==0){
            return Evaluator.evaluate(board,color);
        }

        let moves=MoveGenerator.generate(board,color);

        if(moves.length==0){
            return Evaluator.evaluate(board,color);
        }

        let best=-Infinity;

        for(const move of moves){

            board.makeMove(move);

            let score=-this.search(
                board,
                depth-1,
                -beta,
                -alpha,
                this.opponent(color)
            );

            board.undoMove();

            if(score>best) best=score;
            if(score>alpha) alpha=score;

            if(alpha>=beta) break;

        }

        return best;

    }

    static opponent(color){
        return color === "0" ? "1" : "0";
    }

}
