import { defineConfig } from '@prisma/internals';

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL ?? "file:./uncover.db",
});
