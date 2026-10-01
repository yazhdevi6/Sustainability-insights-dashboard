/**
 * Loads prisma/data/suppliers.json into PostgreSQL.
 * Idempotent: clears existing data (including cached insights) before inserting.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

interface SeedFile {
  periods: { period: string; periodStart: string }[];
  suppliers: {
    name: string;
    country: string;
    sector: string;
    contactEmail?: string;
    certifications: { name: string; issuer: string; issuedOn: string; expiresOn?: string }[];
    products: { name: string; category: string }[];
    metrics: {
      period: string;
      emissionsTco2e: number;
      energyMwh: number;
      waterLitres: number;
      recycledPct: number;
      wasteRecoveryPct: number;
    }[];
  }[];
}

const prisma = new PrismaClient();

async function main() {
  const data: SeedFile = JSON.parse(readFileSync(join(__dirname, "data", "suppliers.json"), "utf8"));
  const periodStarts = new Map(data.periods.map((p) => [p.period, new Date(p.periodStart)]));

  // Clear all data and reset id sequences so supplier ids are stable across re-seeds.
  await prisma.$executeRaw`TRUNCATE "Supplier", "Product", "Certification", "MetricPeriod", "Insight" RESTART IDENTITY CASCADE`;

  for (const s of data.suppliers) {
    await prisma.supplier.create({
      data: {
        name: s.name,
        country: s.country,
        sector: s.sector,
        contactEmail: s.contactEmail,
        products: { create: s.products },
        certifications: {
          create: s.certifications.map((c) => ({
            name: c.name,
            issuer: c.issuer,
            issuedOn: new Date(c.issuedOn),
            expiresOn: c.expiresOn ? new Date(c.expiresOn) : null,
          })),
        },
        metrics: {
          create: s.metrics.map((m) => {
            const periodStart = periodStarts.get(m.period);
            if (!periodStart) throw new Error(`Unknown period ${m.period} for ${s.name}`);
            return { ...m, periodStart };
          }),
        },
      },
    });
  }

  console.log(`Seeded ${data.suppliers.length} suppliers.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
