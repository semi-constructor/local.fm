// Add global test setup here if needed
process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.BETTER_AUTH_SECRET = "test-secret";
process.env.BETTER_AUTH_URL = "http://localhost:3001";
