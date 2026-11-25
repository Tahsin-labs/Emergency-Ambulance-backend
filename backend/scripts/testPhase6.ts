import { PrismaClient, Role, UserStatus, Priority, AmbulanceType, AmbulanceStatus, RequestStatus, TripStatus, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api/v1';
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  error?: string;
}

const results: TestResult[] = [];

const runTest = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (error: any) {
    results.push({ name, status: 'FAIL', error: error?.message || String(error) });
    console.error(`❌ FAIL: ${name} -> ${error?.message || error}`);
  }
};

const createToken = (payload: { id: string; email: string; role: Role }) => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '1h' });
};

const cleanupTestData = async () => {
  try {
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'test-p6' } },
          { email: { contains: 'test-phase6' } },
        ],
      },
      select: { id: true },
    });

    const userIds = testUsers.map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { actorId: { in: userIds } },
            { entityId: { in: userIds } },
          ],
        },
      });

      await prisma.tripStatusEvent.deleteMany({
        where: {
          trip: {
            request: { patientId: { in: userIds } },
          },
        },
      });

      await prisma.payment.deleteMany({
        where: { userId: { in: userIds } },
      });

      await prisma.trip.deleteMany({
        where: {
          request: { patientId: { in: userIds } },
        },
      });

      await prisma.emergencyRequest.deleteMany({
        where: { patientId: { in: userIds } },
      });

      await prisma.notification.deleteMany({
        where: { userId: { in: userIds } },
      });

      const drivers = await prisma.driver.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      const driverIds = drivers.map((d) => d.id);

      if (driverIds.length > 0) {
        await prisma.ambulance.deleteMany({
          where: { driverId: { in: driverIds } },
        });
        await prisma.driver.deleteMany({
          where: { id: { in: driverIds } },
        });
      }

      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    await prisma.ambulance.deleteMany({
      where: { plateNumber: { startsWith: 'TEST-P6-' } },
    });
    await prisma.hospital.deleteMany({
      where: { name: { startsWith: 'TEST-P6-' } },
    });
  } catch (err) {
    console.error('Cleanup error:', err);
  }
};

async function main() {
  await cleanupTestData();

  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  // 1. Create test actors
  const adminUser = await prisma.user.create({
    data: {
      name: 'Test P6 Admin',
      email: 'test-p6-admin@example.com',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      phone: '+8801700000010',
    },
  });

  const patient1 = await prisma.user.create({
    data: {
      name: 'Test P6 Patient 1',
      email: 'test-p6-patient1@example.com',
      passwordHash,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      phone: '+8801700000011',
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      name: 'Test P6 Patient 2',
      email: 'test-p6-patient2@example.com',
      passwordHash,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      phone: '+8801700000012',
    },
  });

  const driverUser = await prisma.user.create({
    data: {
      name: 'Test P6 Driver',
      email: 'test-p6-driver@example.com',
      passwordHash,
      role: Role.DRIVER,
      status: UserStatus.ACTIVE,
      phone: '+8801700000013',
    },
  });

  const driverProfile = await prisma.driver.create({
    data: {
      userId: driverUser.id,
      licenseNumber: 'TEST-P6-LIC-001',
      isOnDuty: true,
    },
  });

  const ambulance = await prisma.ambulance.create({
    data: {
      plateNumber: 'TEST-P6-AMB-01',
      type: AmbulanceType.BASIC,
      status: AmbulanceStatus.AVAILABLE,
      driverId: driverProfile.id,
      baseFare: 600,
      perKmRate: 40,
    },
  });

  const hospital = await prisma.hospital.create({
    data: {
      name: 'TEST-P6-Hospital',
      address: 'Dhaka City',
      city: 'Dhaka',
      lat: 23.815,
      lng: 90.42,
      phone: '01700000000',
      specialties: ['GENERAL', 'CARDIAC'],
      totalBeds: 50,
      availableBeds: 20,
      hasEmergency: true,
    },
  });

  const adminToken = createToken({ id: adminUser.id, email: adminUser.email, role: Role.ADMIN });
  const patient1Token = createToken({ id: patient1.id, email: patient1.email, role: Role.PATIENT });
  const patient2Token = createToken({ id: patient2.id, email: patient2.email, role: Role.PATIENT });
  const driverToken = createToken({ id: driverUser.id, email: driverUser.email, role: Role.DRIVER });

  // Create an incomplete trip for patient 1
  const incompleteReq = await prisma.emergencyRequest.create({
    data: {
      patientId: patient1.id,
      patientName: patient1.name,
      patientPhone: patient1.phone!,
      emergencyType: 'ACCIDENT',
      priority: Priority.HIGH,
      requiredType: AmbulanceType.BASIC,
      pickupAddress: 'Dhanmondi, Dhaka',
      pickupLat: 23.7465,
      pickupLng: 90.376,
      status: RequestStatus.IN_PROGRESS,
    },
  });

  const incompleteTrip = await prisma.trip.create({
    data: {
      requestId: incompleteReq.id,
      ambulanceId: ambulance.id,
      hospitalId: hospital.id,
      status: TripStatus.EN_ROUTE_TO_HOSPITAL,
    },
  });

  // Create a completed trip for patient 1
  const completedReq = await prisma.emergencyRequest.create({
    data: {
      patientId: patient1.id,
      patientName: patient1.name,
      patientPhone: patient1.phone!,
      emergencyType: 'CARDIAC',
      priority: Priority.CRITICAL,
      requiredType: AmbulanceType.BASIC,
      pickupAddress: 'Gulshan 2, Dhaka',
      pickupLat: 23.7925,
      pickupLng: 90.4078,
      status: RequestStatus.COMPLETED,
    },
  });

  const completedTrip = await prisma.trip.create({
    data: {
      requestId: completedReq.id,
      ambulanceId: ambulance.id,
      hospitalId: hospital.id,
      status: TripStatus.COMPLETED,
      distanceKm: 5.5,
      fare: 820.0,
      dispatchedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(),
    },
  });

  let activeTranId = '';
  let activePaymentId = '';

  // Test 1: Validation and authorization on initiate
  await runTest('Initiate payment validation: incomplete trip (400), unauth (401), foreign patient (403), driver (403), unknown trip (404)', async () => {
    // 401 unauth
    const res401 = await fetch(`${BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: completedTrip.id }),
    });
    if (res401.status !== 401) throw new Error(`Expected 401 for unauth, got ${res401.status}`);

    // 403 foreign patient
    const res403Foreign = await fetch(`${BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient2Token}`,
      },
      body: JSON.stringify({ tripId: completedTrip.id }),
    });
    if (res403Foreign.status !== 403) throw new Error(`Expected 403 for other patient, got ${res403Foreign.status}`);

    // 403 driver
    const res403Driver = await fetch(`${BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ tripId: completedTrip.id }),
    });
    if (res403Driver.status !== 403) throw new Error(`Expected 403 for driver role, got ${res403Driver.status}`);

    // 400 incomplete trip
    const res400Incomplete = await fetch(`${BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({ tripId: incompleteTrip.id }),
    });
    if (res400Incomplete.status !== 400) throw new Error(`Expected 400 for incomplete trip, got ${res400Incomplete.status}`);

    // 404 unknown trip
    const res404 = await fetch(`${BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({ tripId: '00000000-0000-0000-0000-000000000000' }),
    });
    if (res404.status !== 404) throw new Error(`Expected 404 for non-existent trip, got ${res404.status}`);
  });

  // Test 2: Successful initiate with real SSLCommerz sandbox GatewayPageURL
  await runTest('Initiate payment on completed trip returns real SSLCommerz GatewayPageURL and ignores client-sent amount', async () => {
    const res = await fetch(`${BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        tripId: completedTrip.id,
        amount: 10, // malicious client attempt to alter amount
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Payment initiate failed (${res.status}): ${errText}`);
    }

    const body = await res.json();
    if (!body.data.paymentUrl || !body.data.paymentUrl.includes('sslcommerz')) {
      throw new Error(`Expected GatewayPageURL from SSLCommerz, got ${body.data.paymentUrl}`);
    }

    if (body.data.amount !== 820) {
      throw new Error(`Expected amount to remain exactly trip fare (820), got ${body.data.amount}`);
    }

    activeTranId = body.data.tranId;
    activePaymentId = body.data.paymentId;
    console.log(`\n  👉 SSLCommerz Sandbox Payment Gateway URL:\n     ${body.data.paymentUrl}\n`);
  });

  // Test 3: POST /fail and /cancel update status, retry initiate generates NEW tranId
  await runTest('POST /cancel and retry initiate generates a new tranId', async () => {
    // Call cancel endpoint
    const cancelRes = await fetch(`${BASE_URL}/payments/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ tran_id: activeTranId }).toString(),
    });
    if (!cancelRes.ok) throw new Error(`POST /payments/cancel failed: ${cancelRes.status}`);

    const pAfterCancel = await prisma.payment.findUnique({ where: { tranId: activeTranId } });
    if (pAfterCancel?.status !== PaymentStatus.CANCELLED) {
      throw new Error(`Expected CANCELLED status, got ${pAfterCancel?.status}`);
    }

    // Re-initiate payment on the same trip
    const retryRes = await fetch(`${BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({ tripId: completedTrip.id }),
    });
    if (!retryRes.ok) throw new Error(`Retry initiate failed: ${retryRes.status}`);

    const retryBody = await retryRes.json();
    if (retryBody.data.tranId === activeTranId) {
      throw new Error('Expected new unique tranId on retry initiate');
    }

    activeTranId = retryBody.data.tranId;
    activePaymentId = retryBody.data.paymentId;
  });

  // Test 4: Fake val_id validation fails and payment is NOT marked PAID
  await runTest('POST /success with fake val_id fails validation and marks payment FAILED', async () => {
    const successRes = await fetch(`${BASE_URL}/payments/success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        tran_id: activeTranId,
        val_id: 'FAKE_VALIDATION_ID_12345',
      }).toString(),
    });

    const p = await prisma.payment.findUnique({ where: { tranId: activeTranId } });
    if (p?.status === PaymentStatus.PAID) {
      throw new Error('Payment should NEVER be marked PAID with a fake val_id');
    }
    if (p?.status !== PaymentStatus.FAILED) {
      throw new Error(`Expected FAILED status after fake validation, got ${p?.status}`);
    }
  });

  // Test 5: Idempotent success / ipn for already PAID payment
  await runTest('Idempotent handling of already PAID payment', async () => {
    // Manually mark payment as PAID
    await prisma.payment.update({
      where: { id: activePaymentId },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        valId: 'MOCK_REAL_VAL_ID',
      },
    });

    // Call /success again
    const res = await fetch(`${BASE_URL}/payments/success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        tran_id: activeTranId,
        val_id: 'MOCK_REAL_VAL_ID',
      }).toString(),
    });
    if (res.status !== 200) throw new Error(`Expected 200 for idempotent success, got ${res.status}`);

    // Call /fail on already PAID payment -> MUST NOT downgrade
    await fetch(`${BASE_URL}/payments/fail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ tran_id: activeTranId }).toString(),
    });

    const verifyPaid = await prisma.payment.findUnique({ where: { id: activePaymentId } });
    if (verifyPaid?.status !== PaymentStatus.PAID) {
      throw new Error('PAID payment must NEVER be downgraded by subsequent fail/cancel');
    }

    // Call /ipn -> answers 200 { received: true }
    const ipnRes = await fetch(`${BASE_URL}/payments/ipn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ tran_id: activeTranId, val_id: 'MOCK_REAL_VAL_ID' }).toString(),
    });
    if (!ipnRes.ok) throw new Error(`IPN endpoint failed: ${ipnRes.status}`);
    const ipnBody = await ipnRes.json();
    if (!ipnBody.received) throw new Error('Expected { received: true } from IPN');
  });

  // Test 6: Payment queries: GET /my, GET / (admin), GET /:id (access control)
  await runTest('Payment queries: GET /my, GET / (admin filters), GET /:id (owner vs other patient)', async () => {
    // Patient 1 GET /my
    const myRes = await fetch(`${BASE_URL}/payments/my`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    if (!myRes.ok) throw new Error(`GET /payments/my failed: ${myRes.status}`);
    const myBody = await myRes.json();
    if (!myBody.data || myBody.data.length === 0) throw new Error('Expected payment in GET /my');

    // Admin GET /
    const adminRes = await fetch(`${BASE_URL}/payments?status=PAID&searchTerm=${activeTranId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!adminRes.ok) throw new Error(`GET /payments failed: ${adminRes.status}`);
    const adminBody = await adminRes.json();
    if (adminBody.data.length !== 1) throw new Error('Expected exactly 1 payment found by tranId search');

    // GET /:id by owner
    const ownerRes = await fetch(`${BASE_URL}/payments/${activePaymentId}`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    if (!ownerRes.ok) throw new Error(`GET /payments/:id by owner failed: ${ownerRes.status}`);

    // GET /:id by foreign patient -> 403
    const foreignRes = await fetch(`${BASE_URL}/payments/${activePaymentId}`, {
      headers: { Authorization: `Bearer ${patient2Token}` },
    });
    if (foreignRes.status !== 403) throw new Error(`Expected 403 for other patient, got ${foreignRes.status}`);
  });

  // Test 7: Dashboard stats revenue reflects real PAID amount
  await runTest('Admin dashboard-stats revenue updates with real PAID payment', async () => {
    const statsRes = await fetch(`${BASE_URL}/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!statsRes.ok) throw new Error(`GET /admin/dashboard-stats failed: ${statsRes.status}`);
    const statsBody = await statsRes.json();

    if (typeof statsBody.data.revenue.totalPaid !== 'number' || statsBody.data.revenue.totalPaid <= 0) {
      throw new Error(`Expected totalPaid > 0, got ${statsBody.data.revenue.totalPaid}`);
    }
  });

  // Clean up
  await cleanupTestData();

  console.log('\n================ PHASE 6 TEST SUMMARY ================');
  console.table(results);

  const failed = results.filter((r) => r.status === 'FAIL');
  if (failed.length > 0) {
    console.error(`\n❌ ${failed.length} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PHASE 6 TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

main().catch(async (e) => {
  console.error('Fatal error in test runner:', e);
  await cleanupTestData();
  process.exit(1);
});
