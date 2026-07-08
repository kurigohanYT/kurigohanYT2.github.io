class NeuralEvaluator{

    static evaluate(board,color){

        const model = globalThis.ValueModelData;
        if(!model) return null;

        color = String(color);
        const input = this.encodeBoard(board,color);
        const hiddenSize = model.b1.length;
        const hidden = new Array(hiddenSize);

        for(let h = 0; h < hiddenSize; h++){
            let sum = model.b1[h];

            for(let i = 0; i < input.length; i++){
                sum += input[i] * model.w1[i][h];
            }

            hidden[h] = Math.tanh(sum);
        }

        let output = model.b2;

        for(let h = 0; h < hiddenSize; h++){
            output += hidden[h] * model.w2[h];
        }

        return Math.tanh(output) * 1000;
    }

    static encodeBoard(board,color){

        const pieces = ["K","Q","R","B","N","P"];
        const pieceIndex = {K:0,Q:1,R:2,B:3,N:4,P:5};
        const input = new Array(pieces.length * 2 * board.height * board.width).fill(0);

        for(let y = 0; y < board.height; y++){
            for(let x = 0; x < board.width; x++){

                const piece = board.get(x,y);
                if(board.isEmpty(piece)) continue;

                const type = piece[0];
                if(pieceIndex[type] === undefined) continue;

                const isMine = piece[1] === color;
                const channel = (isMine ? 0 : pieces.length) + pieceIndex[type];
                const index = channel * board.height * board.width + y * board.width + x;

                input[index] = 1;

            }
        }

        return input;
    }

}
