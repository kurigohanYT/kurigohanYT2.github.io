class Evaluator{

    static evaluate(board,color){

        color = String(color);
        const enemyColor = this.opponent(color);

        if(!board.isKingAlive(color)) return -1000000;
        if(!board.isKingAlive(enemyColor)) return 1000000;

        if(board.pieceCount(color)<=2) return -1000000;
        if(board.pieceCount(enemyColor)<=2) return 1000000;

        let score=0;

        score+=100*(board.pieceCount(color)-board.pieceCount(enemyColor));

        if(typeof NeuralEvaluator !== "undefined"){
            const neuralScore = NeuralEvaluator.evaluate(board,color);
            if(neuralScore !== null){
                const neuralWeight = globalThis.NeuralBlendWeight ?? 0.25;
                return score * (1 - neuralWeight) + neuralScore * neuralWeight;
            }
        }

        return score;
    }

    static opponent(color){
        return color === "0" ? "1" : "0";
    }

}
