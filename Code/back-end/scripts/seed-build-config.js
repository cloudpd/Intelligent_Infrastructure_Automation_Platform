/**
 * MOCK SEED SCRIPT — for testing CI language detection without Dockerize module.
 *
 * This inserts a fake BuildConfig row for a given service_id so that
 * getLanguageFromBuildConfig() returns a real value during CI preview/push tests.
 *
 * Usage:
 *   node scripts/seed-build-config.js <serviceId> <language>
 *
 * Examples:
 *   node scripts/seed-build-config.js cc2ee905-92cc-4999-9e00-2f3aa29367ee node
 *   node scripts/seed-build-config.js cc2ee905-92cc-4999-9e00-2f3aa29367ee python
 */

require('dotenv').config();
const { BuildConfig } = require('../src/modules/dockerize/dockerize.model');

const [serviceId, language] = process.argv.slice(2);

if (!serviceId || !['node', 'python'].includes(language)) {
  console.error('Usage: node scripts/seed-build-config.js <serviceId> <node|python>');
  process.exit(1);
}

async function seed() {
  const [record, created] = await BuildConfig.findOrCreate({
    where: { service_id: serviceId },
    defaults: {
      service_id: serviceId,
      has_existing_dockerfile: false,
      dockerfile_path: 'Dockerfile',
      language,
      status: 'completed',
    },
  });

  if (!created) {
    // Update the language if the row already exists
    await record.update({ language });
    console.log(`✅ Updated BuildConfig for service ${serviceId} → language: "${language}"`);
  } else {
    console.log(`✅ Created BuildConfig for service ${serviceId} → language: "${language}"`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
