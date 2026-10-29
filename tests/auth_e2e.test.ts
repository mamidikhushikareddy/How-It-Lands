/**
 * Authentication End-to-End Regression Test Suite
 * Validates complete auth lifecycle:
 * 1. Unauthenticated state check (zero-trust baseline)
 * 2. Protected route rejection without auth (401)
 * 3. Invalid credentials rejection (401)
 * 4. User Signup (201, password hashing, session issuance, sanitized user)
 * 5. Session Restoration via /api/state (Cookie & Header)
 * 6. User Login with valid credentials (200)
 * 7. Protected route authorization with session
 * 8. User Logout (200, session revoked)
 * 9. Post-logout protected route rejection
 * 10. Existing user & database records preservation check
 */

const BASE_URL = 'http://localhost:3000';

async function runAuthRegressionSuite() {
  console.log('====================================================');
  console.log('   HOW IT LANDS — AUTHENTICATION REGRESSION SUITE   ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
      if (details) console.error(`       Details: ${details}`);
      throw new Error(`Test failed: ${testName} - ${details || ''}`);
    }
  }

  // 1. Unauthenticated State Resolution
  console.log('--- Step 1: Zero-Trust Unauthenticated State ---');
  const unauthRes = await fetch(`${BASE_URL}/api/state`);
  const unauthData = await unauthRes.json();
  assert(unauthRes.status === 200, 'GET /api/state returns 200');
  assert(unauthData.user === null, 'GET /api/state returns null user when no session token provided', JSON.stringify(unauthData.user));

  // 2. Protected Route Access Control
  console.log('\n--- Step 2: Protected Route Rejection Without Credentials ---');
  const protectedRes = await fetch(`${BASE_URL}/api/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: { preferred_tone: 'direct' } })
  });
  assert(protectedRes.status === 401, 'POST /api/profile returns 401 Unauthorized without auth');

  // 3. Invalid Credentials Login Rejection
  console.log('\n--- Step 3: Invalid Credentials Login Protection ---');
  const invalidLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent_user@howitlands.test', password: 'WrongPassword123!' })
  });
  const invalidLoginData = await invalidLoginRes.json();
  assert(invalidLoginRes.status === 401, 'POST /api/auth/login returns 401 for non-existent user');
  assert(typeof invalidLoginData.error === 'string', 'Error message returned for invalid credentials');

  // 4. User Registration (Signup)
  console.log('\n--- Step 4: User Signup ---');
  const testEmail = `tester_${Date.now()}@howitlands.test`;
  const testPassword = 'SecurePassword2026!';
  const testName = 'Alex Validator';

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword })
  });
  const signupData = await signupRes.json();
  assert(signupRes.status === 201, 'POST /api/auth/signup returns 201 Created');
  assert(signupData.success === true, 'Signup response indicates success');
  assert(Boolean(signupData.token), 'Signup response provides session token');
  assert(signupData.user && signupData.user.email === testEmail, 'Signup response returns newly created user');
  assert(signupData.user.password_hash === undefined, 'Sanitized user object does NOT leak password_hash');
  assert(signupData.user.salt === undefined && signupData.user.password_salt === undefined, 'Sanitized user does NOT leak salt');

  const sessionToken = signupData.token;
  const setCookieHeader = signupRes.headers.get('set-cookie');
  assert(Boolean(setCookieHeader), 'Signup response sets session_id cookie');

  // 5. Session Restoration via /api/state
  console.log('\n--- Step 5: Session Restoration ---');
  const restoredRes = await fetch(`${BASE_URL}/api/state`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'X-Session-ID': sessionToken
    }
  });
  const restoredData = await restoredRes.json();
  assert(restoredRes.status === 200, 'GET /api/state returns 200 with Authorization header');
  assert(restoredData.user !== null, 'Session restoration resolved user object');
  assert(restoredData.user.email === testEmail, 'Restored session email matches signed-up user');
  assert(restoredData.user.name === testName, 'Restored session name matches signed-up user');

  // 6. User Login with Valid Credentials
  console.log('\n--- Step 6: User Login with Valid Credentials ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword, rememberMe: true })
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, 'POST /api/auth/login returns 200 OK');
  assert(loginData.success === true, 'Login successful');
  assert(Boolean(loginData.token), 'Login provides session token');
  assert(loginData.user.email === testEmail, 'Logged in user matches credentials');

  const newSessionToken = loginData.token;

  // 7. Protected Route Access with Authenticated Session
  console.log('\n--- Step 7: Protected Route Access With Session ---');
  const profileRes = await fetch(`${BASE_URL}/api/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${newSessionToken}`,
      'X-Session-ID': newSessionToken
    },
    body: JSON.stringify({
      profile: {
        preferred_tone: 'clear, diplomatic and authoritative',
        notes: 'Updated during automated E2E test'
      }
    })
  });
  const profileData = await profileRes.json();
  assert(profileRes.status === 200, 'POST /api/profile succeeds with valid session (200 OK)');
  assert(profileData.success === true, 'Profile updated successfully under authenticated user');

  // 8. User Logout
  console.log('\n--- Step 8: User Logout ---');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${newSessionToken}`,
      'X-Session-ID': newSessionToken
    }
  });
  const logoutData = await logoutRes.json();
  assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');
  assert(logoutData.success === true, 'Logout confirms success');

  // 9. Post-Logout Revocation Check
  console.log('\n--- Step 9: Post-Logout Security Verification ---');
  const postLogoutStateRes = await fetch(`${BASE_URL}/api/state`, {
    headers: {
      'Authorization': `Bearer ${newSessionToken}`,
      'X-Session-ID': newSessionToken
    }
  });
  const postLogoutStateData = await postLogoutStateRes.json();
  assert(postLogoutStateData.user === null, 'Revoked session is rejected by /api/state (user is null)');

  const postLogoutProtectedRes = await fetch(`${BASE_URL}/api/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${newSessionToken}`,
      'X-Session-ID': newSessionToken
    },
    body: JSON.stringify({ profile: { preferred_tone: 'should fail' } })
  });
  assert(postLogoutProtectedRes.status === 401, 'Revoked session is rejected by protected routes (401)');

  // 10. Existing Users & Database Records Preservation Check
  console.log('\n--- Step 10: Existing Records Preservation Check ---');
  const existingUserRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: {
      'X-User-Email': 'kiaria2514@gmail.com',
      'X-User-Id': 'u1'
    }
  });
  assert(existingUserRes.status === 200, 'GET /api/admin/users accessible by admin u1');
  const usersData = await existingUserRes.json();
  const originalUser = usersData.users?.find((u: any) => u.email === 'kiaria2514@gmail.com');
  assert(Boolean(originalUser), 'Existing account kiaria2514@gmail.com preserved in database');
  assert(originalUser.id === 'u1', 'Original user ID u1 intact');
  assert(originalUser.role === 'admin' || originalUser.role === 'super_admin', 'Original admin privileges preserved');

  console.log('\n====================================================');
  console.log(`   ALL ${passedTests}/${totalTests} AUTHENTICATION REGRESSION TESTS PASSED!   `);
  console.log('====================================================\n');
}

runAuthRegressionSuite().catch(err => {
  console.error('\n[REGRESSION TEST FAILED]:', err);
  process.exit(1);
});
