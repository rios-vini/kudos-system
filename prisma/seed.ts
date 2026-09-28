/**
 * Seed script: creates demo users (one admin, several employees) and a few
 * sample kudos so the dashboard feed is not empty on first run.
 *
 * Passwords are hashed with scrypt (Node built-in) to match src/lib/password.ts.
 * All seeded accounts use the password "password123".
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("Seeding database...");

  const users = [
    { email: "admin@datacom.test", displayName: "Ada Admin", role: "admin" },
    { email: "alice@datacom.test", displayName: "Alice Nguyen", role: "employee" },
    { email: "bob@datacom.test", displayName: "Bob Smith", role: "employee" },
    { email: "carol@datacom.test", displayName: "Carol Torres", role: "employee" },
    { email: "dave@datacom.test", displayName: "Dave Patel", role: "employee" },
    { email: "erin@datacom.test", displayName: "Erin Wu", role: "employee" },
  ];

  const created: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: hashPassword("password123"),
        displayName: u.displayName,
        role: u.role,
      },
    });
    created[u.email] = user.id;
    console.log(`  user: ${u.email} (${u.role})`);
  }

  const sampleKudos = [
    {
      from: "alice@datacom.test",
      to: "bob@datacom.test",
      message:
        "Bob went out of his way to help me debug the payment service outage last night. Absolute legend!",
    },
    {
      from: "carol@datacom.test",
      to: "erin@datacom.test",
      message:
        "Erin's design review comments made the onboarding flow so much clearer. Thanks for the thorough feedback!",
    },
    {
      from: "dave@datacom.test",
      to: "alice@datacom.test",
      message:
        "Alice shipped the migration with zero downtime. Calm, careful, and well-documented work.",
    },
  ];

  for (const k of sampleKudos) {
    await prisma.kudos.create({
      data: {
        senderId: created[k.from],
        recipientId: created[k.to],
        message: k.message,
      },
    });
  }
  console.log(`  ${sampleKudos.length} sample kudos created`);

  console.log("Seed complete. Sign in with any seeded email + password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
