import { prisma } from '../src/config/prisma';
import { AmbulanceStatus, Priority, RequestStatus, Role, TripStatus } from '@prisma/client';

const BASE_URL = 'http://localhost:5000/api/v1';

async function testPhase4() {
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
  let patient1Token = '';
  let patient2Token = '';
  let patient1Id = '';
  let patient2Id = '';
  const driverTokens: Record<string, string> = {};

  // Helper function to get token for a specific driver
  const getDriverTokenForTrip = async (tripId: string): Promise<string> => {
    const t = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { ambulance: { include: { driver: { include: { user: true } } } } },
    });
    const email = t?.ambulance.driver?.user?.email;
    if (email && driverTokens[email]) {
      return driverTokens[email];
    }
    const { createToken } = await import('../src/utils/jwt');
    const { env } = await import('../src/config/env');
    return createToken({ userId: t!.ambulance.driver!.userId, role: Role.DRIVER }, env.JWT_ACCESS_SECRET, '1h');
  };

  // Helper to ensure clean baseline: all drivers on duty, ambulances available
  const resetFleetState = async () => {
    await prisma.driver.updateMany({ data: { isOnDuty: true } });
    await prisma.ambulance.updateMany({ data: { status: AmbulanceStatus.AVAILABLE } });
  };

  // 1. Initial setup & user authentications
  await runTest('Authenticate test actors and ensure known baseline state', async () => {
    // Admin login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ambulance.com', password: 'Admin@123456' }),
    });
    const adminData: any = await adminRes.json();
    adminToken = adminData.data.accessToken;

    // Patient 1 login
    const p1Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient1@example.com', password: 'Patient@123456' }),
    });
    const p1Data: any = await p1Res.json();
    patient1Token = p1Data.data.accessToken;
    patient1Id = p1Data.data.user.id;

    // Patient 2 login
    const p2Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient2@example.com', password: 'Patient@123456' }),
    });
    const p2Data: any = await p2Res.json();
    patient2Token = p2Data.data.accessToken;
    patient2Id = p2Data.data.user.id;

    // Cache driver tokens for driver1, driver2, driver3
    const { createToken } = await import('../src/utils/jwt');
    const { env } = await import('../src/config/env');
    const allDrivers = await prisma.driver.findMany({ include: { user: true } });
    for (const d of allDrivers) {
      if (d.user) {
        driverTokens[d.user.email] = createToken(
          { userId: d.userId, role: Role.DRIVER },
          env.JWT_ACCESS_SECRET,
          '1h',
        );
      }
    }

    // Clean up any lingering active emergency requests or trips
    await prisma.trip.updateMany({
      where: { status: { notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED] } },
      data: { status: TripStatus.CANCELLED },
    });

    await prisma.emergencyRequest.updateMany({
      where: { status: { in: [RequestStatus.PENDING, RequestStatus.DISPATCHED, RequestStatus.IN_PROGRESS] } },
      data: { status: RequestStatus.CANCELLED },
    });

    await resetFleetState();
  });

  let activeRequestId = '';
  let activeTripId = '';

  // 2. Patient creates CRITICAL request -> auto dispatched to nearest compatible ambulance
  await runTest('Patient creates CRITICAL request -> auto-dispatched with ICU requiredType', async () => {
    const res = await fetch(`${BASE_URL}/emergency-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        emergencyType: 'CARDIAC',
        description: 'Patient having severe chest pain and collapsed',
        pickupAddress: 'Road 11, Banani, Dhaka',
        pickupLat: 23.7937,
        pickupLng: 90.4066,
      }),
    });
    const data: any = await res.json();
    if (!data.success || !data.data.trip) {
      throw new Error(`Request creation / dispatch failed: ${JSON.stringify(data)}`);
    }

    if (data.data.priority !== 'CRITICAL' || data.data.requiredType !== 'ICU') {
      throw new Error(`Priority engine error: priority=${data.data.priority}, requiredType=${data.data.requiredType}`);
    }

    activeRequestId = data.data.id;
    activeTripId = data.data.trip.id;
  });

  // 3. Duplicate active request -> 409; validation errors -> 400
  await runTest('Duplicate active request returns 409; validation error returns 400', async () => {
    // Duplicate active request
    const dupRes = await fetch(`${BASE_URL}/emergency-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        emergencyType: 'ACCIDENT',
        pickupAddress: 'Dhanmondi 27, Dhaka',
        pickupLat: 23.7465,
        pickupLng: 90.3760,
      }),
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 for duplicate active request, got ${dupRes.status}`);
    }

    // Validation error
    const valRes = await fetch(`${BASE_URL}/emergency-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient2Token}`,
      },
      body: JSON.stringify({
        emergencyType: 'INVALID_TYPE',
        pickupAddress: 'A',
      }),
    });
    if (valRes.status !== 400) {
      throw new Error(`Expected 400 for validation error, got ${valRes.status}`);
    }
  });

  // 4. RBAC: non-admin accessing admin routes & patient reading another patient's request
  await runTest('RBAC: non-admin forbidden on admin routes & patient forbidden on another request', async () => {
    // Patient accessing GET /emergency-requests (Admin only)
    const patAdminRes = await fetch(`${BASE_URL}/emergency-requests`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    if (patAdminRes.status !== 403) {
      throw new Error(`Expected 403 for patient accessing admin list, got ${patAdminRes.status}`);
    }

    // Patient 2 accessing Patient 1's request detail
    const otherReqRes = await fetch(`${BASE_URL}/emergency-requests/${activeRequestId}`, {
      headers: { Authorization: `Bearer ${patient2Token}` },
    });
    if (otherReqRes.status !== 403) {
      throw new Error(`Expected 403 for other patient accessing request, got ${otherReqRes.status}`);
    }
  });

  // 5. Trip state machine happy path & invalid transitions
  await runTest('Trip state machine happy path and validation transitions', async () => {
    const assignedToken = await getDriverTokenForTrip(activeTripId);

    // Find a driver token that is NOT the assigned driver
    const tripDetail = await prisma.trip.findUnique({
      where: { id: activeTripId },
      include: { ambulance: { include: { driver: { include: { user: true } } } } },
    });
    const assignedEmail = tripDetail?.ambulance.driver?.user?.email;
    const otherDriverEmail = Object.keys(driverTokens).find((e) => e !== assignedEmail)!;
    const wrongDriverToken = driverTokens[otherDriverEmail];

    // A) Wrong driver attempts status update -> 403
    const wrongDriverRes = await fetch(`${BASE_URL}/trips/${activeTripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wrongDriverToken}`,
      },
      body: JSON.stringify({ status: 'EN_ROUTE' }),
    });
    if (wrongDriverRes.status !== 403) {
      throw new Error(`Expected 403 for unassigned driver, got ${wrongDriverRes.status}`);
    }

    // B) Skipping a step (e.g. DISPATCHED -> ARRIVED_AT_PICKUP) -> 400
    const skipStepRes = await fetch(`${BASE_URL}/trips/${activeTripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assignedToken}`,
      },
      body: JSON.stringify({ status: 'ARRIVED_AT_PICKUP' }),
    });
    if (skipStepRes.status !== 400) {
      throw new Error(`Expected 400 for skipping step, got ${skipStepRes.status}`);
    }

    // C) Valid transition 1: DISPATCHED -> EN_ROUTE (request becomes IN_PROGRESS)
    const enRouteRes = await fetch(`${BASE_URL}/trips/${activeTripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assignedToken}`,
      },
      body: JSON.stringify({ status: 'EN_ROUTE', note: 'Ambulance is moving towards patient' }),
    });
    const enRouteData: any = await enRouteRes.json();
    if (!enRouteData.success || enRouteData.data.status !== 'EN_ROUTE') {
      throw new Error(`Failed to update to EN_ROUTE: ${JSON.stringify(enRouteData)}`);
    }

    // Verify request is IN_PROGRESS
    const reqInProgress = await prisma.emergencyRequest.findUnique({ where: { id: activeRequestId } });
    if (reqInProgress?.status !== RequestStatus.IN_PROGRESS) {
      throw new Error(`Request status not updated to IN_PROGRESS`);
    }

    // D) Valid transition 2: EN_ROUTE -> ARRIVED_AT_PICKUP
    const arrivedPickupRes = await fetch(`${BASE_URL}/trips/${activeTripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assignedToken}`,
      },
      body: JSON.stringify({ status: 'ARRIVED_AT_PICKUP' }),
    });
    if (arrivedPickupRes.status !== 200) {
      throw new Error(`Failed to update to ARRIVED_AT_PICKUP`);
    }

    // E) Valid transition 3: ARRIVED_AT_PICKUP -> PICKED_UP
    const pickedUpRes = await fetch(`${BASE_URL}/trips/${activeTripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assignedToken}`,
      },
      body: JSON.stringify({ status: 'PICKED_UP' }),
    });
    if (pickedUpRes.status !== 200) {
      throw new Error(`Failed to update to PICKED_UP`);
    }

    // F) Attempting EN_ROUTE_TO_HOSPITAL without selecting hospital -> 400
    const noHospRes = await fetch(`${BASE_URL}/trips/${activeTripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assignedToken}`,
      },
      body: JSON.stringify({ status: 'EN_ROUTE_TO_HOSPITAL' }),
    });
    if (noHospRes.status !== 400) {
      throw new Error(`Expected 400 when hospital is not assigned, got ${noHospRes.status}`);
    }

    // G) Auto-assign hospital (nearest emergency hospital with beds, matching cardiology for CARDIAC)
    const assignHospRes = await fetch(`${BASE_URL}/trips/${activeTripId}/hospital`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assignedToken}`,
      },
      body: JSON.stringify({}),
    });
    const assignHospData: any = await assignHospRes.json();
    if (!assignHospData.success || !assignHospData.data.selectedHospital) {
      throw new Error(`Auto assign hospital failed: ${JSON.stringify(assignHospData)}`);
    }
    const assignedHospitalId = assignHospData.data.selectedHospital.id;
    const initialBeds = assignHospData.data.selectedHospital.availableBeds;

    // H) Valid transition 4: PICKED_UP -> EN_ROUTE_TO_HOSPITAL
    const enRouteHospRes = await fetch(`${BASE_URL}/trips/${activeTripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assignedToken}`,
      },
      body: JSON.stringify({ status: 'EN_ROUTE_TO_HOSPITAL' }),
    });
    if (enRouteHospRes.status !== 200) {
      throw new Error(`Failed to update to EN_ROUTE_TO_HOSPITAL`);
    }

    // I) Valid transition 5: EN_ROUTE_TO_HOSPITAL -> ARRIVED_AT_HOSPITAL (decreases hospital beds)
    const arrivedHospRes = await fetch(`${BASE_URL}/trips/${activeTripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assignedToken}`,
      },
      body: JSON.stringify({ status: 'ARRIVED_AT_HOSPITAL' }),
    });
    if (arrivedHospRes.status !== 200) {
      throw new Error(`Failed to update to ARRIVED_AT_HOSPITAL`);
    }

    // Verify bed count decreased by 1
    const hospAfter = await prisma.hospital.findUnique({ where: { id: assignedHospitalId } });
    if (hospAfter?.availableBeds !== initialBeds - 1) {
      throw new Error(`Hospital bed not decremented. Before: ${initialBeds}, After: ${hospAfter?.availableBeds}`);
    }

    // J) Valid transition 6: ARRIVED_AT_HOSPITAL -> COMPLETED
    const completeRes = await fetch(`${BASE_URL}/trips/${activeTripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${assignedToken}`,
      },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const completeData: any = await completeRes.json();
    if (!completeData.success || completeData.data.status !== 'COMPLETED') {
      throw new Error(`Failed to update to COMPLETED: ${JSON.stringify(completeData)}`);
    }

    // Verify Payment row created with PENDING status and valid calculated fare
    const payment = await prisma.payment.findUnique({ where: { tripId: activeTripId } });
    if (!payment || payment.status !== 'PENDING' || Number(payment.amount) <= 0) {
      throw new Error(`Payment record missing or invalid: ${JSON.stringify(payment)}`);
    }

    // Verify request is COMPLETED and ambulance is back to AVAILABLE
    const finalReq = await prisma.emergencyRequest.findUnique({ where: { id: activeRequestId } });
    if (finalReq?.status !== RequestStatus.COMPLETED) {
      throw new Error(`Request not marked COMPLETED`);
    }

    const finalAmb = await prisma.ambulance.findUnique({ where: { id: tripDetail!.ambulanceId } });
    if (finalAmb?.status !== AmbulanceStatus.AVAILABLE) {
      throw new Error(`Ambulance not restored to AVAILABLE`);
    }
  });

  // 6. Timeline endpoint
  await runTest('GET /trips/:id/timeline returns events in chronological order', async () => {
    const res = await fetch(`${BASE_URL}/trips/${activeTripId}/timeline`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    const data: any = await res.json();
    if (!data.success || !Array.isArray(data.data) || data.data.length < 5) {
      throw new Error(`Timeline events missing or incomplete: ${JSON.stringify(data)}`);
    }
    for (let i = 0; i < data.data.length - 1; i++) {
      if (new Date(data.data[i].createdAt).getTime() > new Date(data.data[i + 1].createdAt).getTime()) {
        throw new Error(`Timeline events not sorted in ascending order`);
      }
    }
  });

  // 7. Concurrency Test
  await runTest('Concurrency test: exactly one request gets the single available ambulance', async () => {
    await resetFleetState();

    // Set exactly 1 ambulance available, all others OFFLINE
    const allAmbulances = await prisma.ambulance.findMany({
      where: { deletedAt: null, driver: { isOnDuty: true } },
    });
    const targetAmb = allAmbulances[0];
    await prisma.ambulance.updateMany({
      where: { id: { not: targetAmb.id } },
      data: { status: AmbulanceStatus.OFFLINE },
    });
    await prisma.ambulance.update({
      where: { id: targetAmb.id },
      data: { status: AmbulanceStatus.AVAILABLE },
    });

    // Create 3 simultaneous emergency requests with separate mock patients
    const cPatients: string[] = [];
    for (let i = 0; i < 3; i++) {
      const email = `concurrent_patient_${timestamp}_${i}@example.com`;
      const p = await prisma.user.create({
        data: {
          name: `Concurrent Patient ${i}`,
          email,
          phone: `+880172200000${i}`,
          role: Role.PATIENT,
        },
      });
      cPatients.push(p.id);
    }

    const tokens: string[] = [];
    const { createToken } = await import('../src/utils/jwt');
    const { env } = await import('../src/config/env');
    for (const pid of cPatients) {
      tokens.push(createToken({ userId: pid, role: Role.PATIENT }, env.JWT_ACCESS_SECRET, '1h'));
    }

    const promises = tokens.map((token, idx) =>
      fetch(`${BASE_URL}/emergency-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          emergencyType: 'FEVER',
          description: `Concurrent test ${idx}`,
          pickupAddress: 'Dhanmondi, Dhaka',
          pickupLat: 23.7465,
          pickupLng: 90.3760,
        }),
      }).then((r) => r.json()),
    );

    const responses: any[] = await Promise.all(promises);

    const dispatchedCount = responses.filter((r) => r.data?.status === 'DISPATCHED').length;
    const queuedCount = responses.filter((r) => r.data?.status === 'PENDING').length;

    if (dispatchedCount !== 1 || queuedCount !== 2) {
      throw new Error(`Concurrency violation! Dispatched: ${dispatchedCount}, Queued: ${queuedCount}`);
    }

    // Verify DB: ambulance has exactly 1 active trip
    const activeTripsOnAmb = await prisma.trip.count({
      where: {
        ambulanceId: targetAmb.id,
        status: { in: [TripStatus.DISPATCHED, TripStatus.EN_ROUTE, TripStatus.ARRIVED_AT_PICKUP] },
      },
    });
    if (activeTripsOnAmb !== 1) {
      throw new Error(`Ambulance assigned to multiple trips: ${activeTripsOnAmb}`);
    }

    // Clean up concurrent test data safely in proper foreign key order
    const cReqs = await prisma.emergencyRequest.findMany({ where: { patientId: { in: cPatients } } });
    const cReqIds = cReqs.map((r) => r.id);
    const cTrips = await prisma.trip.findMany({ where: { requestId: { in: cReqIds } } });
    const cTripIds = cTrips.map((t) => t.id);

    await prisma.notification.deleteMany({ where: { userId: { in: cPatients } } });
    await prisma.tripStatusEvent.deleteMany({ where: { tripId: { in: cTripIds } } });
    await prisma.payment.deleteMany({ where: { tripId: { in: cTripIds } } });
    await prisma.trip.deleteMany({ where: { id: { in: cTripIds } } });
    await prisma.emergencyRequest.deleteMany({ where: { id: { in: cReqIds } } });
    await prisma.user.deleteMany({ where: { id: { in: cPatients } } });

    await resetFleetState();
  });

  // 8. Priority Queue Test
  await runTest('Priority Queue: when ambulance frees up, CRITICAL request dispatched before LOW', async () => {
    // Put all ambulances OFFLINE so requests will queue
    await prisma.ambulance.updateMany({ data: { status: AmbulanceStatus.OFFLINE } });

    // Create a LOW request first
    const lowUser = await prisma.user.create({
      data: { name: 'Low Priority User', email: `low_${timestamp}@test.com`, role: Role.PATIENT },
    });
    const { createToken } = await import('../src/utils/jwt');
    const { env } = await import('../src/config/env');
    const lowToken = createToken({ userId: lowUser.id, role: Role.PATIENT }, env.JWT_ACCESS_SECRET, '1h');

    const lowRes = await fetch(`${BASE_URL}/emergency-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lowToken}` },
      body: JSON.stringify({
        emergencyType: 'OTHER',
        description: 'routine transport non-urgent',
        pickupAddress: 'Uttara, Dhaka',
        pickupLat: 23.8759,
        pickupLng: 90.3795,
      }),
    });
    const lowData: any = await lowRes.json();
    const lowReqId = lowData.data.id;

    // Create a CRITICAL request second
    const critUser = await prisma.user.create({
      data: { name: 'Critical Priority User', email: `crit_${timestamp}@test.com`, role: Role.PATIENT },
    });
    const critToken = createToken({ userId: critUser.id, role: Role.PATIENT }, env.JWT_ACCESS_SECRET, '1h');

    const critRes = await fetch(`${BASE_URL}/emergency-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${critToken}` },
      body: JSON.stringify({
        emergencyType: 'CARDIAC',
        description: 'cardiac arrest unconscious',
        pickupAddress: 'Uttara, Dhaka',
        pickupLat: 23.8759,
        pickupLng: 90.3795,
      }),
    });
    const critData: any = await critRes.json();
    const critReqId = critData.data.id;

    // Free up exactly one ambulance
    const anAmb = await prisma.ambulance.findFirst({
      where: { driver: { isOnDuty: true } },
    });
    await prisma.ambulance.update({
      where: { id: anAmb!.id },
      data: { status: AmbulanceStatus.AVAILABLE },
    });

    // Trigger dispatchNextPending
    const { DispatchService } = await import('../src/modules/dispatch/dispatch.service');
    await DispatchService.dispatchNextPending();

    // Verify: CRITICAL request was dispatched first!
    const checkCrit = await prisma.emergencyRequest.findUnique({ where: { id: critReqId } });
    const checkLow = await prisma.emergencyRequest.findUnique({ where: { id: lowReqId } });

    if (checkCrit?.status !== RequestStatus.DISPATCHED || checkLow?.status !== RequestStatus.PENDING) {
      throw new Error(
        `Priority queue dispatch failed: Critical status=${checkCrit?.status}, Low status=${checkLow?.status}`,
      );
    }

    // Clean up
    const qTrips = await prisma.trip.findMany({ where: { requestId: { in: [lowReqId, critReqId] } } });
    const qTripIds = qTrips.map((t) => t.id);
    await prisma.notification.deleteMany({ where: { userId: { in: [lowUser.id, critUser.id] } } });
    await prisma.tripStatusEvent.deleteMany({ where: { tripId: { in: qTripIds } } });
    await prisma.trip.deleteMany({ where: { id: { in: qTripIds } } });
    await prisma.emergencyRequest.deleteMany({ where: { id: { in: [lowReqId, critReqId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [lowUser.id, critUser.id] } } });
    await resetFleetState();
  });

  // 9. Cancellation tests (before pickup succeeds, after PICKED_UP returns 400)
  await runTest('Cancellation: allowed before pickup and forbidden after PICKED_UP (400)', async () => {
    await resetFleetState();

    // Create new request
    const cancelPatient = await prisma.user.create({
      data: { name: 'Cancel Test Patient', email: `cancel_${timestamp}@test.com`, role: Role.PATIENT },
    });
    const { createToken } = await import('../src/utils/jwt');
    const { env } = await import('../src/config/env');
    const cToken = createToken({ userId: cancelPatient.id, role: Role.PATIENT }, env.JWT_ACCESS_SECRET, '1h');

    const reqRes = await fetch(`${BASE_URL}/emergency-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cToken}` },
      body: JSON.stringify({
        emergencyType: 'FEVER',
        description: 'High fever',
        pickupAddress: 'Mirpur, Dhaka',
        pickupLat: 23.8041,
        pickupLng: 90.3653,
      }),
    });
    const reqData: any = await reqRes.json();
    const reqId = reqData.data.id;

    // Cancel before pickup -> succeeds (200)
    const cancelRes = await fetch(`${BASE_URL}/emergency-requests/${reqId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cToken}` },
      body: JSON.stringify({ reason: 'Feeling better, ambulance no longer required' }),
    });
    if (cancelRes.status !== 200) {
      throw new Error(`Cancellation before pickup failed: ${cancelRes.status}`);
    }

    // Now test cancellation after PICKED_UP -> returns 400
    const reqRes2 = await fetch(`${BASE_URL}/emergency-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cToken}` },
      body: JSON.stringify({
        emergencyType: 'FEVER',
        pickupAddress: 'Mirpur, Dhaka',
        pickupLat: 23.8041,
        pickupLng: 90.3653,
      }),
    });
    const reqData2: any = await reqRes2.json();
    const reqId2 = reqData2.data.id;
    const tripId2 = reqData2.data.trip.id;

    const dToken = await getDriverTokenForTrip(tripId2);

    await fetch(`${BASE_URL}/trips/${tripId2}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dToken}` },
      body: JSON.stringify({ status: 'EN_ROUTE' }),
    });
    await fetch(`${BASE_URL}/trips/${tripId2}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dToken}` },
      body: JSON.stringify({ status: 'ARRIVED_AT_PICKUP' }),
    });
    await fetch(`${BASE_URL}/trips/${tripId2}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dToken}` },
      body: JSON.stringify({ status: 'PICKED_UP' }),
    });

    // Attempt cancel after PICKED_UP -> must return 400
    const cancelBlocked = await fetch(`${BASE_URL}/emergency-requests/${reqId2}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cToken}` },
      body: JSON.stringify({ reason: 'Try to cancel now' }),
    });
    if (cancelBlocked.status !== 400) {
      throw new Error(`Expected 400 when cancelling after PICKED_UP, got ${cancelBlocked.status}`);
    }

    // Clean up
    const cTrips = await prisma.trip.findMany({ where: { requestId: { in: [reqId, reqId2] } } });
    const cTripIds = cTrips.map((t) => t.id);
    await prisma.notification.deleteMany({ where: { userId: cancelPatient.id } });
    await prisma.tripStatusEvent.deleteMany({ where: { tripId: { in: cTripIds } } });
    await prisma.trip.deleteMany({ where: { id: { in: cTripIds } } });
    await prisma.emergencyRequest.deleteMany({ where: { id: { in: [reqId, reqId2] } } });
    await prisma.user.delete({ where: { id: cancelPatient.id } });
    await resetFleetState();
  });

  // 10. Admin Priority Override & Manual Reassign
  await runTest('Admin priority override & manual reassign', async () => {
    await resetFleetState();

    const p = await prisma.user.create({
      data: { name: 'Admin Test Patient', email: `admintest_${timestamp}@test.com`, role: Role.PATIENT },
    });
    const { createToken } = await import('../src/utils/jwt');
    const { env } = await import('../src/config/env');
    const pToken = createToken({ userId: p.id, role: Role.PATIENT }, env.JWT_ACCESS_SECRET, '1h');

    const reqRes = await fetch(`${BASE_URL}/emergency-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pToken}` },
      body: JSON.stringify({
        emergencyType: 'FEVER',
        pickupAddress: 'Gulshan 2, Dhaka',
        pickupLat: 23.7925,
        pickupLng: 90.4078,
      }),
    });
    const reqData: any = await reqRes.json();
    const reqId = reqData.data.id;
    const oldTripId = reqData.data.trip.id;
    const oldAmbId = reqData.data.trip.ambulanceId;

    // Override priority to CRITICAL
    const overrideRes = await fetch(`${BASE_URL}/emergency-requests/${reqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ priority: 'CRITICAL' }),
    });
    const overrideData: any = await overrideRes.json();
    if (overrideData.data.priority !== 'CRITICAL' || overrideData.data.requiredType !== 'ICU') {
      throw new Error(`Priority override failed: ${JSON.stringify(overrideData)}`);
    }

    // Reassign to another available ambulance
    const otherAmb = await prisma.ambulance.findFirst({
      where: { id: { not: oldAmbId }, status: AmbulanceStatus.AVAILABLE, driver: { isOnDuty: true } },
    });
    if (otherAmb) {
      const reassignRes = await fetch(`${BASE_URL}/emergency-requests/${reqId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ ambulanceId: otherAmb.id }),
      });
      const reassignData: any = await reassignRes.json();
      if (!reassignData.success || reassignData.data.ambulanceId !== otherAmb.id) {
        throw new Error(`Manual reassign failed: ${JSON.stringify(reassignData)}`);
      }

      // Check old trip cancelled
      const oldTrip = await prisma.trip.findUnique({ where: { id: oldTripId } });
      if (oldTrip?.status !== TripStatus.CANCELLED) {
        throw new Error(`Old trip not cancelled after reassign`);
      }
    }

    // Clean up
    const rTrips = await prisma.trip.findMany({ where: { requestId: reqId } });
    const rTripIds = rTrips.map((t) => t.id);
    await prisma.notification.deleteMany({ where: { userId: p.id } });
    await prisma.tripStatusEvent.deleteMany({ where: { tripId: { in: rTripIds } } });
    await prisma.trip.deleteMany({ where: { id: { in: rTripIds } } });
    await prisma.emergencyRequest.delete({ where: { id: reqId } });
    await prisma.user.delete({ where: { id: p.id } });
    await resetFleetState();
  });

  console.log('\n📊 All Phase 4 tests finished. Results summary:');
  console.table(results);
}

testPhase4()
  .catch((e) => {
    console.error('Fatal Phase 4 test error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
