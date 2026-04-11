/**
 * Seed a demo house for App Store Review.
 *
 * Usage:
 *   node scripts/seed-demo-house.mjs <path-to-service-account.json>
 *
 * The script creates (or overwrites) a house with a fixed, known code
 * so you can paste it into the App Store Connect Notes field.
 * It also adds mock members, activity logs, and one closed period in history.
 */

import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

// ─── Config ───────────────────────────────────────────────────────────────────

const DEMO_HOUSE_ID   = "demo-appstore-review-house";
const DEMO_HOUSE_CODE = "CLEANRATS"; // paste this in App Store Connect Notes

const DEMO_MEMBERS = [
  { id: "demo-member-ana",    name: "Ana" },
  { id: "demo-member-bruno",  name: "Bruno" },
  { id: "demo-member-carla",  name: "Carla" },
];

const DEMO_TASKS = [
  { id: "demo-task-1", name: "Lavar louça",      points: 10, isDefault: true },
  { id: "demo-task-2", name: "Varrer a sala",    points: 15, isDefault: true },
  { id: "demo-task-3", name: "Limpar banheiro",  points: 20, isDefault: true },
  { id: "demo-task-4", name: "Tirar o lixo",     points: 5,  isDefault: true },
  { id: "demo-task-5", name: "Passar aspirador", points: 15, isDefault: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function isoAt(date, hour = 10, minute = 0) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function currentMonthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function prevMonthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

function prevMonthEnd() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── Build house document ─────────────────────────────────────────────────────

function buildLogs() {
  const logs = [];
  for (let day = 0; day <= 6; day++) {
    const date = daysAgo(day);
    for (const member of DEMO_MEMBERS) {
      const count = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        const task = DEMO_TASKS[Math.floor(Math.random() * DEMO_TASKS.length)];
        logs.push({
          id: randomUUID(),
          taskId: task.id,
          memberId: member.id,
          completedAt: isoAt(date, 8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60)),
        });
      }
    }
  }
  return logs;
}

function buildHistory() {
  // One closed period (last month) with realistic scores
  return [
    {
      periodStart: prevMonthStart(),
      periodEnd: prevMonthEnd(),
      prize: "Pizza pra quem ganhar! 🍕",
      scores: [
        { memberId: "demo-member-ana",   memberName: "Ana",   points: 145, completedTasks: 12 },
        { memberId: "demo-member-bruno", memberName: "Bruno", points: 110, completedTasks: 9  },
        { memberId: "demo-member-carla", memberName: "Carla", points: 75,  completedTasks: 6  },
      ],
    },
  ];
}

function buildHouse() {
  return {
    id:          DEMO_HOUSE_ID,
    name:        "Casa Demo 🐀",
    code:        DEMO_HOUSE_CODE,
    period:      "monthly",
    prize:       "Pizza pra quem ganhar! 🍕",
    memberIds:   DEMO_MEMBERS.map((m) => m.id),
    members:     DEMO_MEMBERS,
    tasks:       DEMO_TASKS,
    logs:        buildLogs(),
    createdAt:   daysAgo(60).toISOString(),
    periodStart: currentMonthStart(),
    history:     buildHistory(),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error("Usage: node scripts/seed-demo-house.mjs <path-to-service-account.json>");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const house = buildHouse();
await db.collection("houses").doc(DEMO_HOUSE_ID).set(house);

console.log("✅ Demo house seeded successfully!");
console.log(`   House ID   : ${DEMO_HOUSE_ID}`);
console.log(`   House code : ${DEMO_HOUSE_CODE}`);
console.log(`   Members    : ${DEMO_MEMBERS.map((m) => m.name).join(", ")}`);
console.log(`   Tasks      : ${DEMO_TASKS.length}`);
console.log(`   Logs       : ${house.logs.length}`);
console.log(`   History    : ${house.history.length} closed period(s)`);
console.log("");
console.log("Paste this in App Store Connect → App Review Information → Notes:");
console.log(`  Use Sign in with Apple to log in, then tap "Entrar com código" and enter: ${DEMO_HOUSE_CODE}`);
