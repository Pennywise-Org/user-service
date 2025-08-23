/*
  Warnings:

  - You are about to drop the `user_profile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_refresh_token` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_setting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_profile" DROP CONSTRAINT "FK_user_profile";

-- DropForeignKey
ALTER TABLE "user_refresh_token" DROP CONSTRAINT "FK_user_refresh_token";

-- DropForeignKey
ALTER TABLE "user_setting" DROP CONSTRAINT "FK_USER_SETTING";

-- DropTable
DROP TABLE "user_profile";

-- DropTable
DROP TABLE "user_refresh_token";

-- DropTable
DROP TABLE "user_setting";

-- CreateTable
CREATE TABLE "userProfile" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(128),
    "last_name" VARCHAR(128),
    "phone_number" VARCHAR(15),
    "date_of_birth" DATE,
    "street" VARCHAR(128),
    "city" VARCHAR(128),
    "state" VARCHAR(128),
    "country" VARCHAR(128),
    "postal_code" VARCHAR(5),
    "annual_income" DECIMAL,
    "risk_tolerance" VARCHAR(10),
    "ssn_encrypted" VARCHAR(10),
    "ssn_masked" VARCHAR(512),
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "plaid_connected" BOOLEAN NOT NULL DEFAULT false,
    "kyc_submitted" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_profile_id" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userSetting" (
    "user_id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PK_user_key" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "userRefreshToken" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token" VARCHAR(255) NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pk_refresh_token_id" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "userProfile_user_id_key" ON "userProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "userRefreshToken_refresh_token_key" ON "userRefreshToken"("refresh_token");

-- AddForeignKey
ALTER TABLE "userProfile" ADD CONSTRAINT "FK_user_profile" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userSetting" ADD CONSTRAINT "FK_USER_SETTING" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userRefreshToken" ADD CONSTRAINT "FK_user_refresh_token" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
