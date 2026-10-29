/**
 * Onboarding End-to-End & Integration Test Suite
 * Validates:
 * 1. Fresh user creation with initial uncompleted onboarding state
 * 2. Uncompleted onboarding detection via /api/state
 * 3. 5-step preferences submission via /api/onboarding/complete
 * 4. User profile updates & onboarding_completed flag transition to true
 * 5. State synchronization across subsequent calls
 */

const BASE_URL = 'http://localhost:3000';

async function runOnboardingTestSuite() {
  console.log('====================================================');
  console.log('   HOW IT LANDS — ONBOARDING WORKFLOW TEST SUITE    ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${name}`);
      if (detail) console.error(`       Detail: ${detail}`);
      throw new Error(`Onboarding test failed: ${name}`);
    }
  }

  // 1. Create a new user who has not completed onboarding
  const testEmail = `onboarding_test_${Date.now()}@howitlands.test`;
  const testPassword = 'Password2026!';
  const testName = 'Jordan Rivers';

  console.log('--- Step 1: Sign up new user with uncompleted onboarding ---');
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword })
  });
  const signupData = await signupRes.json();
  assert(signupRes.status === 201, 'Signup succeeds with 201 Created');
  assert(signupData.user && signupData.user.email === testEmail, 'User created');
  assert(signupData.user.onboarding_completed === false, 'Fresh user starts with onboarding_completed: false');

  const sessionToken = signupData.token;

  // 2. Verify state reflects onboarding_completed === false
  console.log('\n--- Step 2: Verify user state before onboarding ---');
  const stateRes = await fetch(`${BASE_URL}/api/state`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'X-Session-ID': sessionToken
    }
  });
  const stateData = await stateRes.json();
  assert(stateRes.status === 200, 'GET /api/state returns 200');
  assert(stateData.user !== null, 'Authenticated user resolved in /api/state');
  assert(stateData.user.onboarding_completed === false, 'State confirms onboarding is pending');

  // 3. Complete onboarding with 5-step data
  console.log('\n--- Step 3: Submit 5-step onboarding preferences ---');
  const profilePayload = {
    communication_style: 'cold',
    overdo_patterns: ['overexplain', 'sound too cold'],
    preferred_tone: 'concise and confident',
    default_scenario: 'client-money',
    notes: 'User mostly wants help in: work context. Main interest: client-money.'
  };

  const completeRes = await fetch(`${BASE_URL}/api/onboarding/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
      'X-Session-ID': sessionToken
    },
    body: JSON.stringify({ profileData: profilePayload })
  });
  const completeData = await completeRes.json();
  assert(completeRes.status === 200, 'POST /api/onboarding/complete succeeds (200 OK)');
  assert(completeData.success === true, 'Response confirms success: true');
  assert(completeData.user.onboarding_completed === true, 'User record updated: onboarding_completed is true');
  assert(completeData.profile.communication_style === 'cold', 'Profile communication_style updated to cold');
  assert(completeData.profile.preferred_tone === 'concise and confident', 'Profile preferred_tone updated to concise and confident');
  assert(completeData.profile.default_scenario === 'client-money', 'Profile default_scenario updated to client-money');
  assert(Array.isArray(completeData.profile.overdo_patterns) && completeData.profile.overdo_patterns.includes('overexplain'), 'Profile overdo_patterns includes overexplain');

  // 4. Verify state after onboarding completion
  console.log('\n--- Step 4: Verify user state after onboarding completion ---');
  const postStateRes = await fetch(`${BASE_URL}/api/state`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'X-Session-ID': sessionToken
    }
  });
  const postStateData = await postStateRes.json();
  assert(postStateRes.status === 200, 'GET /api/state returns 200 post-onboarding');
  assert(postStateData.user.onboarding_completed === true, 'State verifies onboarding_completed is permanently true');
  assert(postStateData.profile.preferred_tone === 'concise and confident', 'State verifies profile preferences persisted');

  console.log('\n====================================================');
  console.log(`   ALL ${passed}/${total} ONBOARDING INTEGRATION TESTS PASSED!   `);
  console.log('====================================================\n');
}

runOnboardingTestSuite().catch(err => {
  console.error('\n[ONBOARDING TEST FAILED]:', err);
  process.exit(1);
});
