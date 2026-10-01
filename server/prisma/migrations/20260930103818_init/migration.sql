-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issuedOn" DATE NOT NULL,
    "expiresOn" DATE,
    "supplierId" INTEGER NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricPeriod" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "emissionsTco2e" DOUBLE PRECISION NOT NULL,
    "energyMwh" DOUBLE PRECISION NOT NULL,
    "waterLitres" DOUBLE PRECISION NOT NULL,
    "recycledPct" DOUBLE PRECISION NOT NULL,
    "wasteRecoveryPct" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MetricPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "requiresReview" BOOLEAN NOT NULL,
    "keyFindings" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "contextHash" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_sector_idx" ON "Supplier"("sector");

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");

-- CreateIndex
CREATE INDEX "Certification_supplierId_idx" ON "Certification"("supplierId");

-- CreateIndex
CREATE INDEX "MetricPeriod_supplierId_periodStart_idx" ON "MetricPeriod"("supplierId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "MetricPeriod_supplierId_period_key" ON "MetricPeriod"("supplierId", "period");

-- CreateIndex
CREATE INDEX "Insight_supplierId_createdAt_idx" ON "Insight"("supplierId", "createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricPeriod" ADD CONSTRAINT "MetricPeriod_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
