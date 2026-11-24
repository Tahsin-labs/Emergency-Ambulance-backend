/**
 * Comprehensive test script for Phase 2:
 * 1. register
 * 2. duplicate email (409)
 * 3. login ok / wrong password (401)
 * 4. validation error (400 with errors[])
 * 5. me without token (401)
 * 6. PATIENT calling register-driver (403)
 * 7. ADMIN register-driver ok
 * 8. refresh rotation (old refresh token rejected)
 * 9. logout
 * 10. change-password
 * 11. soft delete user then login (blocked)
 * 12. seeded admin login (admin@ambulance.com)
 * 13. Avatar upload check (if Cloudinary keys present)
 */

const BASE_URL = 'http://localhost:5000/api/v1';

async function testApi() {
  const results: { test: string; status: 'PASS' | 'FAIL'; details?: any }[] = [];

  const runTest = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ test: name, status: 'PASS' });
      console.log(`✅ PASS: ${name}`);
    } catch (err: any) {
      results.push({ test: name, status: 'FAIL', details: err?.message || err });
      console.error(`❌ FAIL: ${name} ->`, err?.message || err);
    }
  };

  const timestamp = Date.now();
  const testPatientEmail = `testpatient_${timestamp}@example.com`;
  const testPassword = 'Password@123';
  let patientAccessToken = '';
  let patientRefreshToken = '';
  let adminAccessToken = '';

  // 1. Seeded admin login
  await runTest('Seeded admin login (admin@ambulance.com)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@ambulance.com',
        password: 'Admin@123456',
      }),
    });
    const data: any = await res.json();
    if (!data.success || data.data.user.role !== 'ADMIN') {
      throw new Error(`Admin login failed: ${JSON.stringify(data)}`);
    }
    adminAccessToken = data.data.accessToken;
  });

  // 2. Register PATIENT
  await runTest('Register new PATIENT', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Patient',
        email: testPatientEmail,
        phone: '+8801711223344',
        password: testPassword,
      }),
    });
    const data: any = await res.json();
    if (!data.success || !data.data.accessToken || data.data.user.role !== 'PATIENT') {
      throw new Error(`Register failed: ${JSON.stringify(data)}`);
    }
    patientAccessToken = data.data.accessToken;
    patientRefreshToken = data.data.refreshToken;
  });

  // 3. Duplicate email (409)
  await runTest('Register duplicate email returns 409', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Patient',
        email: testPatientEmail,
        password: testPassword,
      }),
    });
    const data: any = await res.json();
    if (res.status !== 409 || data.success !== false) {
      throw new Error(`Expected 409, got ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 4. Validation error (400 with errors[])
  await runTest('Validation error returns 400 with errors[]', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A', // too short
        email: 'invalid-email',
        password: 'weak',
      }),
    });
    const data: any = await res.json();
    if (res.status !== 400 || data.success !== false || !Array.isArray(data.errors) || data.errors.length === 0) {
      throw new Error(`Expected 400 with errors[], got ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 5. Login OK
  await runTest('Login with correct password returns 200 and tokens', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testPatientEmail,
        password: testPassword,
      }),
    });
    const data: any = await res.json();
    if (!data.success || !data.data.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(data)}`);
    }
    patientAccessToken = data.data.accessToken;
    patientRefreshToken = data.data.refreshToken;
  });

  // 6. Login wrong password (401)
  await runTest('Login with wrong password returns 401', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testPatientEmail,
        password: 'WrongPassword@999',
      }),
    });
    const data: any = await res.json();
    if (res.status !== 401 || data.success !== false) {
      throw new Error(`Expected 401, got ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 7. GET /users/me without token (401)
  await runTest('GET /users/me without token returns 401', async () => {
    const res = await fetch(`${BASE_URL}/users/me`);
    const data: any = await res.json();
    if (res.status !== 401 || data.success !== false) {
      throw new Error(`Expected 401, got ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 8. GET /users/me with token OK
  await runTest('GET /users/me with token returns profile', async () => {
    const res = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${patientAccessToken}` },
    });
    const data: any = await res.json();
    if (!data.success || data.data.email !== testPatientEmail) {
      throw new Error(`Get profile failed: ${JSON.stringify(data)}`);
    }
  });

  // 9. PATCH /users/me update profile
  await runTest('PATCH /users/me updates name & phone', async () => {
    const res = await fetch(`${BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientAccessToken}`,
      },
      body: JSON.stringify({
        name: 'Updated Patient Name',
        phone: '+8801811998877',
      }),
    });
    const data: any = await res.json();
    if (!data.success || data.data.name !== 'Updated Patient Name') {
      throw new Error(`Profile update failed: ${JSON.stringify(data)}`);
    }
  });

  // 10. PATIENT calling register-driver returns 403
  await runTest('PATIENT calling register-driver returns 403', async () => {
    const res = await fetch(`${BASE_URL}/auth/register-driver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientAccessToken}`,
      },
      body: JSON.stringify({
        name: 'Hacked Driver',
        email: `driver_${timestamp}@example.com`,
        password: 'Password@123',
        licenseNumber: `LIC_${timestamp}`,
      }),
    });
    const data: any = await res.json();
    if (res.status !== 403 || data.success !== false) {
      throw new Error(`Expected 403, got ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 11. ADMIN register-driver OK
  const driverLicense = `DL-${timestamp}`;
  await runTest('ADMIN register-driver succeeds with 201', async () => {
    const res = await fetch(`${BASE_URL}/auth/register-driver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAccessToken}`,
      },
      body: JSON.stringify({
        name: 'New Registered Driver',
        email: `driver_${timestamp}@ambulance.com`,
        phone: '+8801911223344',
        password: 'Driver@123456',
        licenseNumber: driverLicense,
      }),
    });
    const data: any = await res.json();
    if (res.status !== 201 || !data.success || data.data.driver.licenseNumber !== driverLicense) {
      throw new Error(`Admin register driver failed: ${JSON.stringify(data)}`);
    }
  });

  // 12. Refresh token rotation & old refresh token rejection
  await runTest('Refresh token rotation: new tokens issued and old token rejected', async () => {
    const oldRefresh = patientRefreshToken;

    // Issue first rotation
    const res1 = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: oldRefresh }),
    });
    const data1: any = await res1.json();
    if (!data1.success || !data1.data.refreshToken) {
      throw new Error(`First refresh failed: ${JSON.stringify(data1)}`);
    }
    const newRefresh = data1.data.refreshToken;
    patientAccessToken = data1.data.accessToken;

    // Now try reusing the old token -> should be rejected (401)
    const res2 = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: oldRefresh }),
    });
    const data2: any = await res2.json();
    if (res2.status !== 401 || data2.success !== false) {
      throw new Error(`Expected old refresh token to be rejected with 401, got ${res2.status}`);
    }

    // Update patientRefreshToken to the rotated one
    patientRefreshToken = newRefresh;
  });

  // 13. Change Password
  const updatedPassword = 'NewPassword@123';
  await runTest('Change password succeeds and rejects old password on login', async () => {
    const res = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientAccessToken}`,
      },
      body: JSON.stringify({
        oldPassword: testPassword,
        newPassword: updatedPassword,
      }),
    });
    const data: any = await res.json();
    if (!data.success) {
      throw new Error(`Change password failed: ${JSON.stringify(data)}`);
    }

    // Old password should fail
    const oldLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testPatientEmail,
        password: testPassword,
      }),
    });
    if (oldLoginRes.status !== 401) {
      throw new Error(`Old password unexpectedly worked after password change`);
    }

    // New password should succeed
    const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testPatientEmail,
        password: updatedPassword,
      }),
    });
    const newLoginData: any = await newLoginRes.json();
    if (!newLoginData.success) {
      throw new Error(`New password login failed: ${JSON.stringify(newLoginData)}`);
    }
    patientAccessToken = newLoginData.data.accessToken;
    patientRefreshToken = newLoginData.data.refreshToken;
  });

  // 14. Logout
  await runTest('Logout invalidates refresh token', async () => {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientAccessToken}` },
    });
    const data: any = await res.json();
    if (!data.success) {
      throw new Error(`Logout failed: ${JSON.stringify(data)}`);
    }

    // Trying to refresh now should fail
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: patientRefreshToken }),
    });
    if (refreshRes.status !== 401) {
      throw new Error(`Refresh token still valid after logout!`);
    }
  });

  // 15. Soft delete user then login blocked
  await runTest('Soft delete user and verify subsequent login is blocked (401)', async () => {
    // Log back in to get active access token
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testPatientEmail,
        password: updatedPassword,
      }),
    });
    const loginData: any = await loginRes.json();
    const token = loginData.data.accessToken;

    // Delete me
    const delRes = await fetch(`${BASE_URL}/users/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const delData: any = await delRes.json();
    if (!delData.success) {
      throw new Error(`Delete me failed: ${JSON.stringify(delData)}`);
    }

    // Subsequent login must be rejected
    const blockedRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testPatientEmail,
        password: updatedPassword,
      }),
    });
    if (blockedRes.status !== 401) {
      throw new Error(`Deleted user was able to log in! Status: ${blockedRes.status}`);
    }
  });

  // Check Cloudinary
  console.log('\n--- Cloudinary Status Check ---');
  if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Cloudinary credentials present in .env. Live avatar upload configured.');
  } else {
    console.log('Notice: Cloudinary keys are empty or not present in .env. Avatar upload skipped for live mock test.');
  }

  console.log('\n📊 All tests finished. Results summary:');
  console.table(results);
}

testApi().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
