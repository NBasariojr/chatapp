import bcrypt from 'bcryptjs';

/**
 * Test User Factory
 * 
 * Generates test users with hashed passwords dynamically.
 * This avoids storing hardcoded passwords in environment variables.
 */

export interface TestUser {
  username: string;
  email: string;
  password: string;
  hashedPassword: string;
  role?: 'user' | 'admin';
}

export class TestUserFactory {
  // Generate unique test password for each test run to avoid collisions
  private static generateTestPassword(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `Test_${timestamp}_${random}!`;
  }
  private static readonly SALT_ROUNDS = 12;

  /**
   * Creates a test user with hashed password
   */
  static async createUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const baseUser = {
      username: 'testuser',
      email: 'testuser@example.com',
      password: this.generateTestPassword(),
      role: 'user' as const,
    };

    const user = { ...baseUser, ...overrides };
    const hashedPassword = await bcrypt.hash(user.password, this.SALT_ROUNDS);

    return {
      ...user,
      hashedPassword,
    };
  }

  /**
   * Creates a test admin user
   */
  static async createAdminUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    return this.createUser({
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      ...overrides,
    });
  }

  /**
   * Creates multiple test users with unique emails
   */
  static async createUsers(count: number, baseOverrides: Partial<TestUser> = {}): Promise<TestUser[]> {
    const users: TestUser[] = [];
    
    for (let i = 1; i <= count; i++) {
      const user = await this.createUser({
        username: `testuser${i}`,
        email: `testuser${i}@example.com`,
        ...baseOverrides,
      });
      users.push(user);
    }

    return users;
  }

  /**
   * Generates a unique email for testing
   */
  static generateUniqueEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}@example.com`;
  }

  /**
   * Generates a unique username for testing
   */
  static generateUniqueUsername(prefix: string = 'testuser'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Generates invalid test data for validation testing
   */
  static generateInvalidPassword(): string {
    // Generate consistently invalid passwords for testing validation
    const invalidPasswords = ['weak', '123', 'short', ''];
    return invalidPasswords[Math.floor(Math.random() * invalidPasswords.length)];
  }

  static generateWrongPassword(): string {
    // Generate a password that's guaranteed to be wrong
    return `Wrong_${Date.now()}_${Math.random().toString(36).substring(2, 8)}!`;
  }

  static generateInvalidEmail(): string {
    // Generate consistently invalid emails for testing validation
    const invalidEmails = ['bad', 'not-an-email', 'invalid@', '@domain.com'];
    return invalidEmails[Math.floor(Math.random() * invalidEmails.length)];
  }

  static generateInvalidUsername(): string {
    // Generate consistently invalid usernames for testing validation
    const invalidUsernames = ['x', 'a', ''];
    return invalidUsernames[Math.floor(Math.random() * invalidUsernames.length)];
  }

  /**
   * Generates a realistic bcrypt hash string for test fixtures
   * This simulates a real bcrypt hash without using actual bcrypt for performance
   */
  static generateTestHash(): string {
    // Generate a consistent test hash that looks real but is deterministic
    // Format: $2a$12$[22 chars of salt][31 chars of hash]
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const salt = timestamp + random; // 22 chars total
    const hash = 'testhashforunittestingpurposesonly'; // 31 chars
    return `$2a$12$${salt}${hash}`;
  }

  /**
   * Generates a test JWT secret for authentication testing
   * This creates a unique secret for each test run to avoid hardcoded secrets
   */
  static generateTestJwtSecret(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 16);
    return `test_jwt_secret_${timestamp}_${random}`;
  }

  /**
   * Validates that required test environment variables are present
   * This ensures tests fail fast if configuration is missing
   */
  static validateTestEnvironment(): void {
    const requiredVars = [
      'JWT_SECRET',
      'MONGODB_URI',
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required test environment variables: ${missingVars.join(', ')}\n` +
        'Please ensure .env.test is properly configured or run tests with the correct environment.'
      );
    }
  }
}

// Export a singleton instance for convenience
export const testUserFactory = TestUserFactory;
