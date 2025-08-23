-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "auth0_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "plan_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_user_id" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
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
    "profile_pic_url" VARCHAR(512),
    "annual_income" DECIMAL,
    "risk_tolerance" VARCHAR(10),
    "ssn" VARCHAR(10),
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "plaidConnected" BOOLEAN NOT NULL DEFAULT false,
    "kycSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_profile_id" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_setting" (
    "user_id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PK_user_key" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "user_refresh_token" (
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
CREATE UNIQUE INDEX "unique id" ON "user"("auth0_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_user_id_key" ON "user_profile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_refresh_token_refresh_token_key" ON "user_refresh_token"("refresh_token");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "FK_user_profile" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_setting" ADD CONSTRAINT "FK_USER_SETTING" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_refresh_token" ADD CONSTRAINT "FK_user_refresh_token" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
