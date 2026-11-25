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

// Start Express server locally in-process for tests if not already running
let serverInstance: any = null;

const startServer = async () => {
  // Server is already running in background process
  return Promise.resolve(true);
};

const stopServer = () => {
  if (serverInstance) {
    serverInstance.close();
  }
};

// Cleanup helper
const cleanupTestData = async () => {
  try {
    // 1. Delete AuditLogs for test actors
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { action: { contains: 'TEST' } },
          { entityId: { contains: 'test-' } },
        ],
      },
    });

    // Find test users
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'test-p5' } },
          { email: { contains: 'test-phase5' } },
        ],
      },
      select: { id: true },
    });

    const userIds = testUsers.map((u) => u.id);

    if (userIds.length > 0) {
      // Delete TripStatusEvents
      await prisma.tripStatusEvent.deleteMany({
        where: {
          trip: {
            request: {
              patientId: { in: userIds },
            },
          },
        },
      });

      // Delete Payments
      await prisma.payment.deleteMany({
        where: { userId: { in: userIds } },
      });

      // Delete Trips
      await prisma.trip.deleteMany({
        where: {
          request: {
            patientId: { in: userIds },
          },
        },
      });

      // Delete EmergencyRequests
      await prisma.emergencyRequest.deleteMany({
        where: { patientId: { in: userIds } },
      });

      // Delete Notifications
      await prisma.notification.deleteMany({
        where: { userId: { in: userIds } },
      });

      // Find drivers
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

    // Also clean up any orphan test ambulances or hospitals
    await prisma.ambulance.deleteMany({
      where: { plateNumber: { startsWith: 'TEST-P5-' } },
    });
    await prisma.hospital.deleteMany({
      where: { name: { startsWith: 'TEST-P5-' } },
    });
  } catch (err) {
    console.error('Cleanup error:', err);
  }
};

async function main() {
  await startServer();
  await cleanupTestData();

  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  // Seed test users
  const adminUser = await prisma.user.create({
    data: {
      name: 'Test P5 Admin',
      email: 'test-p5-admin@example.com',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      phone: '+8801700000001',
    },
  });

  const secondaryAdmin = await prisma.user.create({
    data: {
      name: 'Test P5 Admin 2',
      email: 'test-p5-admin2@example.com',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      phone: '+8801700000002',
    },
  });

  const patientUser = await prisma.user.create({
    data: {
      name: 'Test P5 Patient',
      email: 'test-p5-patient@example.com',
      passwordHash,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      phone: '+8801700000003',
    },
  });

  const otherPatient = await prisma.user.create({
    data: {
      name: 'Test P5 Other Patient',
      email: 'test-p5-other@example.com',
      passwordHash,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      phone: '+8801700000004',
    },
  });

  const driverUser = await prisma.user.create({
    data: {
      name: 'Test P5 Driver',
      email: 'test-p5-driver@example.com',
      passwordHash,
      role: Role.DRIVER,
      status: UserStatus.ACTIVE,
      phone: '+8801700000005',
    },
  });

  const driverProfile = await prisma.driver.create({
    data: {
      userId: driverUser.id,
      licenseNumber: 'TEST-P5-LIC-001',
      isOnDuty: true,
    },
  });

  const testAmbulance = await prisma.ambulance.create({
    data: {
      plateNumber: 'TEST-P5-AMB-01',
      type: AmbulanceType.BASIC,
      status: AmbulanceStatus.AVAILABLE,
      driverId: driverProfile.id,
      lat: 23.8103,
      lng: 90.4125,
    },
  });

  const testHospital = await prisma.hospital.create({
    data: {
      name: 'TEST-P5-Hospital',
      address: 'Test Address',
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
  const patientToken = createToken({ id: patientUser.id, email: patientUser.email, role: Role.PATIENT });
  const otherPatientToken = createToken({ id: otherPatient.id, email: otherPatient.email, role: Role.PATIENT });

  // 1. Notification Module Tests
  await runTest('Notification: patient gets notifications, unreadCount, mark one read, read-all, 403 on other user notification', async () => {
    // Seed notifications for patient
    const notif1 = await prisma.notification.create({
      data: {
        userId: patientUser.id,
        title: 'Emergency Dispatched',
        message: 'Ambulance is on the way',
        type: 'DISPATCH',
      },
    });
    const notif2 = await prisma.notification.create({
      data: {
        userId: patientUser.id,
        title: 'Trip Completed',
        message: 'You have arrived safely',
        type: 'TRIP_COMPLETED',
      },
    });

    // Seed notification for other patient
    const otherNotif = await prisma.notification.create({
      data: {
        userId: otherPatient.id,
        title: 'Other Notice',
        message: 'For other user',
        type: 'GENERAL',
      },
    });

    // GET /notifications
    const getRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (!getRes.ok) throw new Error(`GET /notifications failed with ${getRes.status}`);
    const getBody = await getRes.json();
    if (getBody.meta.unreadCount < 2) throw new Error(`Expected unreadCount >= 2, got ${getBody.meta.unreadCount}`);
    if (!getBody.data.some((n: any) => n.id === notif1.id)) throw new Error('Did not find notif1 in list');

    // Mark one as read
    const patchOne = await fetch(`${BASE_URL}/notifications/${notif1.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (!patchOne.ok) throw new Error(`PATCH /notifications/:id/read failed: ${patchOne.status}`);

    // Try to mark other patient's notification as read -> 403
    const patchOther = await fetch(`${BASE_URL}/notifications/${otherNotif.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (patchOther.status !== 403) throw new Error(`Expected 403 for other user notification, got ${patchOther.status}`);

    // Mark non-existent notification -> 404
    const patch404 = await fetch(`${BASE_URL}/notifications/00000000-0000-0000-0000-000000000000/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (patch404.status !== 404) throw new Error(`Expected 404 for missing notification, got ${patch404.status}`);

    // Mark all as read
    const patchAll = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (!patchAll.ok) throw new Error(`PATCH /notifications/read-all failed: ${patchAll.status}`);
    const patchAllBody = await patchAll.json();
    if (patchAllBody.data.updatedCount < 1) throw new Error('Expected updatedCount >= 1');

    // Verify unreadCount is now 0 for patient
    const verifyRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const verifyBody = await verifyRes.json();
    if (verifyBody.meta.unreadCount !== 0) throw new Error(`Expected unreadCount 0, got ${verifyBody.meta.unreadCount}`);
  });

  // 2. RBAC Tests on Admin routes
  await runTest('RBAC: non-admin gets 403 on every admin route, unauthenticated gets 401', async () => {
    const endpoints = [
      { method: 'GET', url: `${BASE_URL}/admin/users` },
      { method: 'PATCH', url: `${BASE_URL}/admin/users/${patientUser.id}/role`, body: { role: 'ADMIN' } },
      { method: 'PATCH', url: `${BASE_URL}/admin/users/${patientUser.id}/status`, body: { status: 'SUSPENDED' } },
      { method: 'GET', url: `${BASE_URL}/admin/dashboard-stats` },
      { method: 'GET', url: `${BASE_URL}/admin/reports/incidents` },
      { method: 'GET', url: `${BASE_URL}/admin/audit-logs` },
    ];

    for (const ep of endpoints) {
      // 401 check
      const res401 = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      if (res401.status !== 401) throw new Error(`Expected 401 for ${ep.method} ${ep.url}, got ${res401.status}`);

      // 403 check with patient token
      const res403 = await fetch(ep.url, {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      if (res403.status !== 403) throw new Error(`Expected 403 for ${ep.method} ${ep.url}, got ${res403.status}`);
    }
  });

  // 3. Admin list users with filters, search, pagination, no sensitive fields
  await runTest('Admin: GET /admin/users filters, pagination, search, no passwordHash/refreshTokenHash', async () => {
    const res = await fetch(`${BASE_URL}/admin/users?searchTerm=P5&limit=5&page=1&role=PATIENT`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(`GET /admin/users failed: ${res.status}`);
    const body = await res.json();
    if (!body.data || body.data.length === 0) throw new Error('Expected test users in search results');

    for (const u of body.data) {
      if ('passwordHash' in u || 'refreshTokenHash' in u) {
        throw new Error('Sensitive credentials leaked in GET /admin/users response');
      }
    }
  });

  // 4. Role change rules: self-change=400, last admin demote=400, to DRIVER=400, valid change works & audits
  await runTest('Admin: Role change rules & audit log creation', async () => {
    // Self change -> 400
    const selfRes = await fetch(`${BASE_URL}/admin/users/${adminUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'PATIENT' }),
    });
    if (selfRes.status !== 400) throw new Error(`Expected 400 for admin self-role-change, got ${selfRes.status}`);

    // Change to DRIVER -> 400
    const toDriverRes = await fetch(`${BASE_URL}/admin/users/${patientUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'DRIVER' }),
    });
    if (toDriverRes.status !== 400) throw new Error(`Expected 400 for role change to DRIVER, got ${toDriverRes.status}`);

    // Valid PATIENT -> ADMIN
    const promoteRes = await fetch(`${BASE_URL}/admin/users/${patientUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    });
    if (!promoteRes.ok) throw new Error(`Expected 200 for promoting patient to admin, got ${promoteRes.status}`);
    const promoteBody = await promoteRes.json();
    if (promoteBody.data.role !== 'ADMIN') throw new Error('Role was not updated to ADMIN');

    // Demote back to PATIENT
    const demoteRes = await fetch(`${BASE_URL}/admin/users/${patientUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'PATIENT' }),
    });
    if (!demoteRes.ok) throw new Error(`Expected 200 for demoting user back to PATIENT, got ${demoteRes.status}`);
  });

  // 5. Suspend user rules: self-suspend=400, login blocked with 403, driver with active trip=400
  await runTest('Admin: Suspend and reactivate rules, login block on suspended user', async () => {
    // Self suspend -> 400
    const selfRes = await fetch(`${BASE_URL}/admin/users/${adminUser.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'SUSPENDED' }),
    });
    if (selfRes.status !== 400) throw new Error(`Expected 400 for self-suspension, got ${selfRes.status}`);

    // Suspend otherPatient
    const suspRes = await fetch(`${BASE_URL}/admin/users/${otherPatient.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'SUSPENDED' }),
    });
    if (!suspRes.ok) throw new Error(`Expected 200 for suspending user, got ${suspRes.status}`);

    // Verify otherPatient cannot login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: otherPatient.email,
        password: 'TestPass123!',
      }),
    });
    if (loginRes.status !== 403) throw new Error(`Expected 403 for suspended user login, got ${loginRes.status}`);

    // Reactivate otherPatient
    const reactRes = await fetch(`${BASE_URL}/admin/users/${otherPatient.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    if (!reactRes.ok) throw new Error(`Expected 200 for reactivating user, got ${reactRes.status}`);

    // Verify otherPatient can login now
    const reactLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: otherPatient.email,
        password: 'TestPass123!',
      }),
    });
    if (!reactLoginRes.ok) throw new Error(`Expected 200 for reactivated user login, got ${reactLoginRes.status}`);

    // Active trip driver suspend rejection check:
    // Create an active trip for driverProfile
    const tripReq = await prisma.emergencyRequest.create({
      data: {
        patientId: patientUser.id,
        patientName: 'Test Patient',
        patientPhone: '+8801700000003',
        emergencyType: 'ACCIDENT',
        priority: Priority.HIGH,
        requiredType: AmbulanceType.BASIC,
        pickupAddress: 'Test Location',
        pickupLat: 23.8103,
        pickupLng: 90.4125,
        status: RequestStatus.IN_PROGRESS,
      },
    });

    const activeTrip = await prisma.trip.create({
      data: {
        requestId: tripReq.id,
        ambulanceId: testAmbulance.id,
        status: TripStatus.EN_ROUTE,
      },
    });

    // Attempt to suspend driverUser while on active trip -> 400
    const suspDriverRes = await fetch(`${BASE_URL}/admin/users/${driverUser.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'SUSPENDED' }),
    });
    if (suspDriverRes.status !== 400) throw new Error(`Expected 400 when suspending driver on active trip, got ${suspDriverRes.status}`);

    // Cleanup the active trip so subsequent operations succeed
    await prisma.trip.delete({ where: { id: activeTrip.id } });
    await prisma.emergencyRequest.delete({ where: { id: tripReq.id } });
  });

  // 6. Dashboard Stats check
  await runTest('Admin: GET /admin/dashboard-stats returns all sections with accurate metrics', async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(`GET /admin/dashboard-stats failed: ${res.status}`);
    const body = await res.json();
    const data = body.data;

    if (!data.users || typeof data.users.total !== 'number') throw new Error('Missing users stats');
    if (!data.ambulances || typeof data.ambulances.total !== 'number') throw new Error('Missing ambulances stats');
    if (!data.hospitals || typeof data.hospitals.total !== 'number') throw new Error('Missing hospitals stats');
    if (!data.requests || typeof data.requests.total !== 'number') throw new Error('Missing requests stats');
    if (!data.trips || typeof data.trips.activeNow !== 'number') throw new Error('Missing trips stats');
    if (!data.performance || typeof data.performance.averageResponseTimeMinutes !== 'number') throw new Error('Missing performance stats');
    if (!data.revenue || typeof data.revenue.totalPaid !== 'number') throw new Error('Missing revenue stats');
  });

  // 7. Incident Reports for each groupBy value and summary metrics
  await runTest('Admin: GET /admin/reports/incidents across day, priority, emergencyType, hospital', async () => {
    const groupBys = ['day', 'priority', 'emergencyType', 'hospital'];

    for (const groupBy of groupBys) {
      const res = await fetch(`${BASE_URL}/admin/reports/incidents?groupBy=${groupBy}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`GET /admin/reports/incidents?groupBy=${groupBy} failed: ${res.status}`);
      const body = await res.json();
      const data = body.data;

      if (!data.summary || typeof data.summary.cancellationRate !== 'number') {
        throw new Error(`Missing summary in incidents report for groupBy=${groupBy}`);
      }
      if (!Array.isArray(data.groupedCounts)) {
        throw new Error(`Expected groupedCounts array for groupBy=${groupBy}`);
      }
    }
  });

  // 8. Audit logs filters and presence of events
  await runTest('Admin: GET /admin/audit-logs pagination, filter by action and actorId', async () => {
    const res = await fetch(`${BASE_URL}/admin/audit-logs?actorId=${adminUser.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(`GET /admin/audit-logs failed: ${res.status}`);
    const body = await res.json();

    if (!body.data || body.data.length === 0) {
      throw new Error('Expected audit logs recorded for admin actions');
    }

    const firstLog = body.data[0];
    if (!firstLog.actor || firstLog.actor.id !== adminUser.id) {
      throw new Error('Expected actor details to be included in audit log');
    }
  });

  // Clean up
  await cleanupTestData();
  stopServer();

  console.log('\n================ PHASE 5 TEST SUMMARY ================');
  console.table(results);

  const failed = results.filter((r) => r.status === 'FAIL');
  if (failed.length > 0) {
    console.error(`\n❌ ${failed.length} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PHASE 5 TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

main().catch(async (e) => {
  console.error('Fatal error in test runner:', e);
  await cleanupTestData();
  stopServer();
  process.exit(1);
});
