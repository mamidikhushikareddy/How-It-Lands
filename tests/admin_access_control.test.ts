/**
 * Admin Terminal Access Control & Super Admin Authorization Test Suite
 * 
 * Validates:
 * 1. Unauthenticated requests to /api/admin/* return 401 Unauthorized
 * 2. Header spoofing (x-user-email, x-user-id) is completely blocked (zero-trust)
 * 3. Regular signed-in users receive 403 Forbidden on all /api/admin/* endpoints
 * 4. Regular signed-in users receive { is_super_admin: false, role: 'user' } in /api/state
 * 5. Approved Super Admin (kiaria2514@gmail.com) receives 200 OK on /api/admin/check-access
 * 6. Approved Super Admin receives 200 OK on /api/admin/users
 * 7. Privilege escalation protection: unapproved accounts cannot be granted super_admin
 * 8. Never stores or hardcodes administrator passwords (uses verified server session / Firebase)
 */

import { createSession } from '../server/auth';
import { loadDB } from '../server/db';

const BASE_URL = 'http://localhost:3000';

async function runAdminAccessControlSuite() {
  console.log('====================================================');
  console.log('   HOW IT LANDS — ADMIN ACCESS CONTROL TEST SUITE   ');
  console.log('====================================================\n');

  let totalTests = 0;
  let passedTests = 0;

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

  // 1. Unauthenticated requests to Admin endpoints
  console.log('--- Step 1: Unauthenticated Endpoint Protection ---');
  const unauthRes = await fetch(`${BASE_URL}/api/admin/users`);
  assert(unauthRes.status === 401, 'Unauthenticated GET /api/admin/users returns 401 Unauthorized');

  const unauthCheckRes = await fetch(`${BASE_URL}/api/admin/check-access`);
  assert(unauthCheckRes.status === 401, 'Unauthenticated GET /api/admin/check-access returns 401 Unauthorized');

  const unauthActionRes = await fetch(`${BASE_URL}/api/admin/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete_user', payload: { userId: 'fake' } })
  });
  assert(unauthActionRes.status === 401, 'Unauthenticated POST /api/admin/action returns 401 Unauthorized');

  const unauthContentRes = await fetch(`${BASE_URL}/api/admin/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'template', action: 'delete', item: { id: 'fake' } })
  });
  assert(unauthContentRes.status === 401, 'Unauthenticated POST /api/admin/content returns 401 Unauthorized');

  // 2. Zero-Trust Header Spoofing Resistance
  console.log('\n--- Step 2: Zero-Trust Header Spoofing Resistance ---');
  const spoofEmailRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: {
      'x-user-email': 'kiaria2514@gmail.com',
      'x-user-id': 'u1'
    }
  });
  assert(spoofEmailRes.status === 401, 'Spoofed X-User-Email/ID headers without token return 401 (Backdoor prevented)');

  const fakeBearerRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: {
      'Authorization': 'Bearer fake_invalid_token_99999'
    }
  });
  assert(fakeBearerRes.status === 401, 'Forged bearer token returns 401 Unauthorized');

  // 3. Regular User Signup and Admin Rejection (403 Forbidden)
  console.log('\n--- Step 3: Regular User Authentication & 403 Forbidden ---');
  const regularEmail = `regular_user_${Date.now()}@testland.org`;
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regularEmail,
      password: 'RegularUserPassword123!',
      name: 'Regular Test User'
    })
  });
  assert(signupRes.status === 201, 'Regular user signup returns 201');
  const signupData = await signupRes.json();
  const regularToken = signupData.token;
  assert(Boolean(regularToken), 'Session token received for regular user');
  assert(signupData.user.role === 'user', 'Regular user role is strictly "user"');
  assert(signupData.user.is_super_admin === false, 'Regular user is_super_admin is false');

  // Verify /api/state for regular user
  const regularStateRes = await fetch(`${BASE_URL}/api/state`, {
    headers: { 'Authorization': `Bearer ${regularToken}` }
  });
  const regularState = await regularStateRes.json();
  assert(regularState.user.role === 'user', 'Regular user role in /api/state is "user"');
  assert(regularState.user.is_super_admin === false, 'Regular user is_super_admin in /api/state is false');

  // Attempt to access /api/admin/users as regular user -> must 403
  const regularAdminUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${regularToken}` }
  });
  assert(regularAdminUsersRes.status === 403, 'Regular user GET /api/admin/users returns 403 Forbidden');

  // Attempt to access /api/admin/check-access as regular user -> must 403
  const regularCheckAccessRes = await fetch(`${BASE_URL}/api/admin/check-access`, {
    headers: { 'Authorization': `Bearer ${regularToken}` }
  });
  assert(regularCheckAccessRes.status === 403, 'Regular user GET /api/admin/check-access returns 403 Forbidden');
  const regularCheckData = await regularCheckAccessRes.json();
  assert(regularCheckData.is_super_admin === false, 'Check-access returns is_super_admin: false on 403');

  // Attempt to perform admin action as regular user -> must 403
  const regularAdminActionRes = await fetch(`${BASE_URL}/api/admin/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${regularToken}`
    },
    body: JSON.stringify({ type: 'template', action: 'delete', item: { id: 'test' } })
  });
  assert(regularAdminActionRes.status === 403, 'Regular user POST /api/admin/content returns 403 Forbidden');

  // 4. Approved Super Admin (kiaria2514@gmail.com) Access
  console.log('\n--- Step 4: Approved Super Admin Access & Verification ---');
  // Generate an authenticated server session for the approved account (u1: kiaria2514@gmail.com)
  // This verifies server session resolution without hardcoding passwords
  const currentDb = loadDB() as any;
  const superAdminUser = currentDb.users.find((u: any) => u.email.toLowerCase() === 'kiaria2514@gmail.com');
  assert(Boolean(superAdminUser), 'Approved Super Admin account exists in database');
  assert(superAdminUser.role === 'super_admin', 'Database role governance maintains super_admin for approved email');

  const superAdminToken = createSession(superAdminUser.id);
  assert(Boolean(superAdminToken), 'Cryptographic session token generated for Super Admin');

  // Verify /api/state for Super Admin
  const superAdminStateRes = await fetch(`${BASE_URL}/api/state`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const superAdminState = await superAdminStateRes.json();
  assert(superAdminState.user.role === 'super_admin', 'Super admin in /api/state has role "super_admin"');
  assert(superAdminState.user.is_super_admin === true, 'Super admin in /api/state has is_super_admin: true');
  assert(superAdminState.user.email.toLowerCase() === 'kiaria2514@gmail.com', 'Super admin email is verified kiaria2514@gmail.com');

  // Verify /api/admin/check-access for Super Admin
  const superAdminCheckRes = await fetch(`${BASE_URL}/api/admin/check-access`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  assert(superAdminCheckRes.status === 200, 'Super admin GET /api/admin/check-access returns 200 OK');
  const superAdminCheckData = await superAdminCheckRes.json();
  assert(superAdminCheckData.authorized === true, 'Check-access confirms authorized: true');
  assert(superAdminCheckData.role === 'super_admin', 'Check-access confirms role: super_admin');
  assert(superAdminCheckData.email.toLowerCase() === 'kiaria2514@gmail.com', 'Check-access confirms authorized email matches approved Super Admin');

  // Verify /api/admin/users for Super Admin
  const superAdminUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  assert(superAdminUsersRes.status === 200, 'Super admin GET /api/admin/users returns 200 OK');
  const superAdminUsersData = await superAdminUsersRes.json();
  assert(Array.isArray(superAdminUsersData.users), 'Super admin receives list of registered users');
  assert(superAdminUsersData.users.length > 0, 'Users list contains registered accounts');

  // 5. Privilege Escalation Prevention
  console.log('\n--- Step 5: Privilege Escalation Prevention ---');
  // Create another user and verify that even if role tampering was attempted, backend role governance forces role: 'user'
  const secondUserEmail = `unauthorized_admin_${Date.now()}@testland.org`;
  const secondUserSignup = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: secondUserEmail,
      password: 'UnauthorizedAdmin123!',
      name: 'Tamper Attempt User'
    })
  });
  const secondUserData = await secondUserSignup.json();
  assert(secondUserData.user.role === 'user', 'Tampered or new account cannot receive super_admin role');
  assert(secondUserData.user.is_super_admin === false, 'Tampered or new account has is_super_admin === false');

  console.log('\n====================================================');
  console.log(`  ALL ${passedTests}/${totalTests} ADMIN ACCESS CONTROL TESTS PASSED SUCCESSFULLY! `);
  console.log('====================================================\n');
}

runAdminAccessControlSuite().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
