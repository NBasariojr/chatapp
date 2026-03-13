// Typed error for Google OAuth verification failures.
export class OAuthVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthVerificationError';
    // Maintains correct prototype chain in transpiled ES5
    Object.setPrototypeOf(this, OAuthVerificationError.prototype);
  }
}