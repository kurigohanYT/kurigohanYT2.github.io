class Move{
    constructor(fx, fy, tx, ty){
        this.fx = fx;
        this.fy = fy;
        this.tx = tx;
        this.ty = ty;
    }

    equals(other){
        return other &&
               this.fx === other.fx &&
               this.fy === other.fy &&
               this.tx === other.tx &&
               this.ty === other.ty;
    }

    toString(){
        return `(${this.fx},${this.fy}) -> (${this.tx},${this.ty})`;
    }
}