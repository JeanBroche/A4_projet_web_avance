-- Soft delete: deletedAt + partial unique indexes (active rows only)

ALTER TABLE "auth"."sites" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "auth"."users" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "auth"."roles" ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX "auth"."sites_code_key";
DROP INDEX "auth"."users_email_key";
DROP INDEX "auth"."roles_code_key";

CREATE INDEX "sites_deletedAt_idx" ON "auth"."sites"("deletedAt");
CREATE INDEX "sites_code_idx" ON "auth"."sites"("code");
CREATE UNIQUE INDEX "sites_code_active_key" ON "auth"."sites"("code") WHERE "deletedAt" IS NULL;

CREATE INDEX "users_deletedAt_idx" ON "auth"."users"("deletedAt");
CREATE INDEX "users_email_idx" ON "auth"."users"("email");
CREATE UNIQUE INDEX "users_email_active_key" ON "auth"."users"("email") WHERE "deletedAt" IS NULL;

CREATE INDEX "roles_deletedAt_idx" ON "auth"."roles"("deletedAt");
CREATE INDEX "roles_code_idx" ON "auth"."roles"("code");
CREATE UNIQUE INDEX "roles_code_active_key" ON "auth"."roles"("code") WHERE "deletedAt" IS NULL;
