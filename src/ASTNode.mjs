export default class ASTNode {
	constructor(type) {
		this.type = type;
	}

	toGraph() {
		throw new Error(`Unable to convert ${this} to graph (unimplemented)`);
	}
}
