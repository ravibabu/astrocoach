-- Add Firebase identity and reusable birth details to the user profile.
ALTER TABLE "User"
ADD COLUMN "firebaseUid" TEXT,
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "birthTime" TEXT,
ADD COLUMN "birthPlace" TEXT;

CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
