/**
 * Demo seed. Run: `npm run seed`.
 *
 * Creates the single shared demo account `demo@sutra.app / demo1234` with:
 *   - complete birth data + computed natal chart
 *   - 28 consecutive days of check-ins with a deliberate mood pattern that
 *     produces a real correlation (28 days = one full lunar cycle; less than
 *     that and the honesty gate correctly refuses to show a pattern — see
 *     seedHelpers.ts and the Phase 5 discussion)
 *   - 3 past consultations with 4 predictions (2 fulfilled, 1 open, 1 missed)
 *   - streak: 28 (last check-in yesterday; today is still open)
 *
 * Idempotent: rerunning updates the demo account in-place, does not duplicate.
 */
import { connectMongo } from './db.js';
import { User } from './models/User.js';
import { hashPassword } from './auth.js';
import { computeNatalChart } from './astro/natal.js';
import type { BirthData, NatalChart } from '@sutra/shared';
import { seedDemoPast, seedDemoCheckIns, ensureAstrologers } from './seedHelpers.js';

const DEMO_EMAIL = 'demo@sutra.app';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME = 'Aria Menon';

// Pune, an evocative Vedic-astrology city (Rajneesh, Osho, Iyengar Yoga).
// Mid-afternoon birth → Scorpio ascendant with a mood pattern that maps cleanly
// onto the 4/5/8/10/11/12 house pairs the seed targets.
const DEMO_BIRTH: BirthData = {
  date: '1995-08-20',
  time: '14:30',
  lat: 18.5204,
  lng: 73.8567,
  tzOffset: 330,
  placeName: 'Pune, Maharashtra',
};

async function main() {
  const ok = await connectMongo();
  if (!ok) {
    console.error('[seed] mongo not reachable — is MONGO_URI set?');
    process.exit(1);
  }

  console.log(`[seed] ensuring astrologers…`);
  await ensureAstrologers();

  console.log(`[seed] ensuring user ${DEMO_EMAIL}…`);
  const natalChart: NatalChart = computeNatalChart(DEMO_BIRTH);
  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      name: DEMO_NAME,
      birthData: DEMO_BIRTH,
      natalChart,
    });
    console.log(`[seed]   created (id: ${user.id})`);
  } else {
    // Refresh password + birth data + chart in case anything changed.
    user.set({
      passwordHash: await hashPassword(DEMO_PASSWORD),
      name: DEMO_NAME,
      birthData: DEMO_BIRTH,
      natalChart,
    });
    await user.save();
    console.log(`[seed]   updated (id: ${user.id})`);
  }

  console.log(`[seed] seeding past consultations + predictions…`);
  const past = await seedDemoPast(user._id);
  console.log(`[seed]   consultations: ${past.consultations}  predictions: ${past.predictions}`);

  console.log(`[seed] seeding check-ins + streak…`);
  const cin = await seedDemoCheckIns(user._id, natalChart);
  console.log(`[seed]   check-ins created: ${cin.created}`);

  const final = await User.findById(user._id);
  console.log('\n=== DEMO ACCOUNT READY ===');
  console.log(`  email    : ${DEMO_EMAIL}`);
  console.log(`  password : ${DEMO_PASSWORD}`);
  console.log(`  chart    : ${natalChart.ascendant} ascendant`);
  console.log(`  streak   : current ${final?.streak?.current}, longest ${final?.streak?.longest}`);
  console.log('==========================\n');

  process.exit(0);
}

main().catch((e) => {
  console.error('[seed] fatal:', e);
  process.exit(1);
});
