export class AppError extends Error {
    constructor(
        public readonly message: string,
        public readonly statusCode: number,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}