-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "securityDeposit" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "securityDeposit" INTEGER NOT NULL DEFAULT 0;

