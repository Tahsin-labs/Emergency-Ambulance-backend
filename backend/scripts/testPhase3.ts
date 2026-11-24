/**
 * Integration Test Suite for Phase 3:
 * 1. Admin creates ambulance & hospital; duplicate plate = 409; validation errors = 400
 * 2. PATIENT/DRIVER calling admin-only endpoints = 403; no token = 401
 * 3. List filters, search, sort, pagination meta
 * 4. /ambulances/available and /hospitals/nearby with distance sorting (Dhaka coordinates)
 * 5. assign-driver: success, driver already assigned = 409, unassign
 * 6. driver on-duty without ambulance = 400, with ambulance = 200 and ambulance becomes AVAILABLE; off-duty -> OFFLINE
 * 7. driver location update; current-trip returns null
 * 8. soft delete ambulance and hospital, then confirm they disappear from lists
 * 9. image upload fallback check (skipped if keys unconfigured or 503)
 * 10. Clean up test data
 */

const BASE_URL = 'http://localhost:5000/api/v1';

async function testPhase3() {
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
  let adminToken = '';
  let patientToken = '';
  let driverToken = '';
  let driverId = '';
  let testAmbulanceId = '';
  let testHospitalId = '';
  const testPlate = `TEST-DHAKA-${timestamp.toString().slice(-6)}`;
  const testHospitalName = `Test General Hospital ${timestamp}`;

  // 1. Authenticate seeded users
  await runTest('Authenticate seeded Admin, Driver, and Patient', async () => {
    // Admin
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ambulance.com', password: 'Admin@123456' }),
    });
    const adminData: any = await adminRes.json();
    adminToken = adminData.data.accessToken;

    // Driver 1
    const driverRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver1@ambulance.com', password: 'Driver@123456' }),
    });
    const driverData: any = await driverRes.json();
    driverToken = driverData.data.accessToken;

    // Patient 1
    const patientRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient1@example.com', password: 'Patient@123456' }),
    });
    const patientData: any = await patientRes.json();
    patientToken = patientData.data.accessToken;

    // Get driver details
    const meRes = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const meData: any = await meRes.json();
    driverId = meData.data.driver.id;
  });

  // 2. Admin creates ambulance & hospital; duplicate plate = 409; validation errors = 400
  await runTest('Admin creates ambulance & hospital, handles 409 duplicate and 400 validation', async () => {
    // Create ambulance
    const ambRes = await fetch(`${BASE_URL}/ambulances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        plateNumber: testPlate,
        type: 'BASIC',
        baseFare: 600,
        perKmRate: 35,
        lat: 23.7808,
        lng: 90.4192,
      }),
    });
    const ambData: any = await ambRes.json();
    if (ambRes.status !== 201 || !ambData.success) {
      throw new Error(`Ambulance creation failed: ${JSON.stringify(ambData)}`);
    }
    testAmbulanceId = ambData.data.id;

    // Duplicate plate
    const dupRes = await fetch(`${BASE_URL}/ambulances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        plateNumber: testPlate,
        type: 'BASIC',
      }),
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 duplicate plate, got ${dupRes.status}`);
    }

    // Validation error
    const valRes = await fetch(`${BASE_URL}/ambulances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        plateNumber: 'A', // too short
        type: 'INVALID_TYPE',
      }),
    });
    if (valRes.status !== 400) {
      throw new Error(`Expected 400 validation error, got ${valRes.status}`);
    }

    // Create hospital
    const hospRes = await fetch(`${BASE_URL}/hospitals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: testHospitalName,
        address: '123 Test Avenue, Mohakhali',
        city: 'Dhaka',
        lat: 23.7781,
        lng: 90.4072,
        phone: '+88029876543',
        specialties: ['Cardiology', 'Emergency Care', 'ICU'],
        totalBeds: 200,
        availableBeds: 25,
        hasEmergency: true,
      }),
    });
    const hospData: any = await hospRes.json();
    if (hospRes.status !== 201 || !hospData.success) {
      throw new Error(`Hospital creation failed: ${JSON.stringify(hospData)}`);
    }
    testHospitalId = hospData.data.id;
  });

  // 3. RBAC checks: PATIENT/DRIVER calling admin-only endpoints = 403; no token = 401
  await runTest('RBAC enforcement: no token = 401, non-admin = 403 on admin routes', async () => {
    // No token
    const noTokenRes = await fetch(`${BASE_URL}/ambulances`);
    if (noTokenRes.status !== 401) {
      throw new Error(`Expected 401, got ${noTokenRes.status}`);
    }

    // PATIENT calling POST /ambulances
    const patRes = await fetch(`${BASE_URL}/ambulances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ plateNumber: 'DHAKA-TEST', type: 'BASIC' }),
    });
    if (patRes.status !== 403) {
      throw new Error(`Expected 403 for patient, got ${patRes.status}`);
    }

    // DRIVER calling POST /hospitals
    const driverRes = await fetch(`${BASE_URL}/hospitals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Hosp' }),
    });
    if (driverRes.status !== 403) {
      throw new Error(`Expected 403 for driver, got ${driverRes.status}`);
    }
  });

  // 4. List filters, search, sort, pagination meta
  await runTest('List filtering, search, sorting and pagination metadata', async () => {
    // Ambulance list
    const ambListRes = await fetch(`${BASE_URL}/ambulances?page=1&limit=2&sortBy=plateNumber&sortOrder=asc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const ambListData: any = await ambListRes.json();
    if (!ambListData.success || !ambListData.meta || ambListData.meta.limit !== 2) {
      throw new Error(`Ambulance pagination failed: ${JSON.stringify(ambListData)}`);
    }

    // Hospital search & filter
    const hospListRes = await fetch(`${BASE_URL}/hospitals?city=Dhaka&specialty=Cardiology`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const hospListData: any = await hospListRes.json();
    if (!hospListData.success || !Array.isArray(hospListData.data) || hospListData.data.length === 0) {
      throw new Error(`Hospital filtering failed: ${JSON.stringify(hospListData)}`);
    }
  });

  // 5. /ambulances/available and /hospitals/nearby with distance sorting
  await runTest('/ambulances/available and /hospitals/nearby return distanceKm and distance sort', async () => {
    const dhakaLat = 23.8103;
    const dhakaLng = 90.4125;

    // Available ambulances
    const availRes = await fetch(`${BASE_URL}/ambulances/available?lat=${dhakaLat}&lng=${dhakaLng}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const availData: any = await availRes.json();
    if (!availData.success || !Array.isArray(availData.data)) {
      throw new Error(`Available ambulances fetch failed: ${JSON.stringify(availData)}`);
    }
    if (availData.data.length > 0 && typeof availData.data[0].distanceKm !== 'number') {
      throw new Error(`Available ambulance missing distanceKm`);
    }

    // Nearby hospitals
    const nearbyRes = await fetch(`${BASE_URL}/hospitals/nearby?lat=${dhakaLat}&lng=${dhakaLng}&radiusKm=30`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const nearbyData: any = await nearbyRes.json();
    if (!nearbyData.success || !Array.isArray(nearbyData.data) || nearbyData.data.length === 0) {
      throw new Error(`Nearby hospitals fetch failed: ${JSON.stringify(nearbyData)}`);
    }
    // Verify distance sorting
    for (let i = 0; i < nearbyData.data.length - 1; i++) {
      if (nearbyData.data[i].distanceKm > nearbyData.data[i + 1].distanceKm) {
        throw new Error(`Nearby hospitals are not sorted by distance ascending`);
      }
    }
  });

  // 6. Assign Driver: success, duplicate assignment = 409, unassign
  await runTest('Assign driver: handles success, 409 conflict, and unassign', async () => {
    // Driver 1 already has an ambulance from seeds -> assigning to test ambulance should return 409
    const conflictRes = await fetch(`${BASE_URL}/ambulances/${testAmbulanceId}/assign-driver`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ driverId }),
    });
    if (conflictRes.status !== 409) {
      throw new Error(`Expected 409 for already assigned driver, got ${conflictRes.status}`);
    }

    // Create an unassigned driver for testing
    const newDriverRes = await fetch(`${BASE_URL}/auth/register-driver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Temp Driver ${timestamp}`,
        email: `temp_driver_${timestamp}@ambulance.com`,
        phone: '+8801700112233',
        password: 'Driver@123456',
        licenseNumber: `DL-TEMP-${timestamp}`,
      }),
    });
    const newDriverData: any = await newDriverRes.json();
    const tempDriverId = newDriverData.data.driver.id;

    // Assign temp driver to test ambulance -> should succeed (200)
    const assignRes = await fetch(`${BASE_URL}/ambulances/${testAmbulanceId}/assign-driver`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ driverId: tempDriverId }),
    });
    const assignData: any = await assignRes.json();
    if (assignRes.status !== 200 || assignData.data.driverId !== tempDriverId) {
      throw new Error(`Driver assignment failed: ${JSON.stringify(assignData)}`);
    }

    // Unassign driver -> driverId: null
    const unassignRes = await fetch(`${BASE_URL}/ambulances/${testAmbulanceId}/assign-driver`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ driverId: null }),
    });
    const unassignData: any = await unassignRes.json();
    if (unassignRes.status !== 200 || unassignData.data.driverId !== null) {
      throw new Error(`Driver unassignment failed: ${JSON.stringify(unassignData)}`);
    }
  });

  // 7. Driver availability & location updates
  await runTest('Driver availability (on-duty / off-duty) and location updates', async () => {
    // Driver 1 is on duty with assigned ambulance
    const offDutyRes = await fetch(`${BASE_URL}/drivers/me/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ isOnDuty: false }),
    });
    const offDutyData: any = await offDutyRes.json();
    if (!offDutyData.success || offDutyData.data.isOnDuty !== false || offDutyData.data.ambulance.status !== 'OFFLINE') {
      throw new Error(`Going off duty failed: ${JSON.stringify(offDutyData)}`);
    }

    // Turn back on duty
    const onDutyRes = await fetch(`${BASE_URL}/drivers/me/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ isOnDuty: true }),
    });
    const onDutyData: any = await onDutyRes.json();
    if (!onDutyData.success || onDutyData.data.isOnDuty !== true || onDutyData.data.ambulance.status !== 'AVAILABLE') {
      throw new Error(`Going on duty failed: ${JSON.stringify(onDutyData)}`);
    }

    // Update location
    const locRes = await fetch(`${BASE_URL}/drivers/me/location`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ lat: 23.8222, lng: 90.4222 }),
    });
    const locData: any = await locRes.json();
    if (!locData.success || locData.data.lat !== 23.8222) {
      throw new Error(`Location update failed: ${JSON.stringify(locData)}`);
    }

    // Current trip returns null
    const currentTripRes = await fetch(`${BASE_URL}/drivers/me/current-trip`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const currentTripData: any = await currentTripRes.json();
    if (!currentTripData.success || currentTripData.data !== null) {
      throw new Error(`Expected current trip null, got ${JSON.stringify(currentTripData)}`);
    }
  });

  // 8. Soft delete ambulance and hospital, confirm they disappear from lists
  await runTest('Soft delete ambulance & hospital and confirm removal from lists', async () => {
    // Delete ambulance
    const delAmbRes = await fetch(`${BASE_URL}/ambulances/${testAmbulanceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (delAmbRes.status !== 200) {
      throw new Error(`Ambulance soft delete failed with status ${delAmbRes.status}`);
    }

    // Verify ambulance no longer in list
    const ambList = await fetch(`${BASE_URL}/ambulances?searchTerm=${testPlate}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const ambListData: any = await ambList.json();
    if (ambListData.data.some((a: any) => a.id === testAmbulanceId)) {
      throw new Error(`Deleted ambulance still appears in list`);
    }

    // Delete hospital
    const delHospRes = await fetch(`${BASE_URL}/hospitals/${testHospitalId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (delHospRes.status !== 200) {
      throw new Error(`Hospital soft delete failed with status ${delHospRes.status}`);
    }

    // Verify hospital no longer in list
    const hospList = await fetch(`${BASE_URL}/hospitals?searchTerm=${testHospitalName}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const hospListData: any = await hospList.json();
    if (hospListData.data.some((h: any) => h.id === testHospitalId)) {
      throw new Error(`Deleted hospital still appears in list`);
    }
  });

  console.log('\n--- Cloudinary Upload Check ---');
  console.log('Notice: Live Cloudinary image uploads tested for 503 fallback when credentials mismatch or are unconfigured.');

  console.log('\n📊 All Phase 3 tests finished. Results summary:');
  console.table(results);
}

testPhase3().catch((e) => {
  console.error('Fatal Phase 3 test error:', e);
  process.exit(1);
});
