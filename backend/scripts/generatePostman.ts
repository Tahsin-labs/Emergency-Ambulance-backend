import fs from 'fs';
import path from 'path';

// Generator for Emergency Ambulance Dispatch Postman Collection v2.1
const collection = {
  info: {
    _postman_id: "a7681234-9214-41d3-9bc5-e9fa498a98b1",
    name: "Emergency Ambulance Dispatch System API",
    description: `# Emergency Ambulance Dispatch System — API Documentation & Postman Collection

Welcome to the **Emergency Ambulance Dispatch System REST API**. This system provides mission-critical emergency ambulance management, priority triage, automated fleet dispatching using PostgreSQL \`FOR UPDATE SKIP LOCKED\`, trip state machine tracking, driver duty/GPS updates, notification management, admin oversight, and sandbox SSLCommerz payments.

---

## 👥 Authentication & Roles
- **PATIENT**: Registers self, creates emergency requests, cancels pending/dispatched requests, views own request history, manages own profile/avatar, initiates and settles fares via SSLCommerz.
- **DRIVER**: Goes on-duty/off-duty, updates real-time GPS coordinates, receives auto-dispatched trips, steps trips through state transitions (\`EN_ROUTE\` -> \`ARRIVED_AT_PICKUP\` -> \`PICKED_UP\` -> \`EN_ROUTE_TO_HOSPITAL\` -> \`ARRIVED_AT_HOSPITAL\` -> \`COMPLETED\`), views assigned trips.
- **ADMIN**: Fleet manager & incident dispatcher. Manages ambulances, drivers, hospitals, bed capacities, manual dispatches, priority overrides, user roles and suspensions, system audit logs, and analytical dashboards.

Authentication is handled via **JWT Bearer Tokens** passed in the \`Authorization\` header:
\`Authorization: Bearer {{token}}\`

---

## 🚀 Environments & Setup
1. Import \`docs/postman/Emergency-Ambulance-Dispatch.postman_collection.json\`.
2. Import either:
   - **Local Environment**: \`docs/postman/Local.postman_environment.json\` (Base URL: \`http://localhost:5000\`)
   - **Production Environment**: \`docs/postman/Production.postman_environment.json\` (Base URL: \`https://emergency-ambulance-backend-sovv.onrender.com\`)
3. Select your desired environment in the Postman environment dropdown.

---

## 🔄 Recommended Demo Flow
Run folder **\`11 FULL DEMO FLOW\`** from top to bottom:
1. Warmup & Health check
2. Authenticate Admin, Driver, and Patient
3. Driver goes on-duty and reports location
4. Patient submits an emergency request (triggers automated dispatch & nearest hospital linking)
5. Driver drives through the entire lifecycle (\`EN_ROUTE\` -> \`ARRIVED_AT_PICKUP\` -> \`PICKED_UP\` -> \`EN_ROUTE_TO_HOSPITAL\` -> \`ARRIVED_AT_HOSPITAL\` -> \`COMPLETED\`)
6. Fare is computed automatically and payment record is initialized
7. Patient initiates payment (receives real SSLCommerz \`paymentUrl\`)
8. Admin inspects dashboard analytics and updated revenue stats

---

## 💳 Payment Gateway (SSLCommerz)
- When initiating payment, the system communicates with SSLCommerz sandbox API and returns a \`paymentUrl\` (\`GatewayPageURL\`).
- For manual browser testing, open the URL in a browser and test with sandbox card \`4111111111111111\` or bKash test wallet.
- The API also exposes \`POST /api/v1/payments/success\`, \`fail\`, \`cancel\`, and \`ipn\` callbacks for webhook settlement.

---

## 📦 Modules Included
- \`00 Health & Root\`
- \`01 Auth\`
- \`02 Users\`
- \`03 Ambulances\`
- \`04 Drivers\`
- \`05 Hospitals\`
- \`06 Emergency Requests\`
- \`07 Trips\`
- \`08 Payments\`
- \`09 Notifications\`
- \`10 Admin\`
- \`11 FULL DEMO FLOW\`
- \`12 Error Cases\`
`,
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [] as any[]
};

// Helper to create basic test script
const createTestScript = (statusCode: number, extractVars?: Record<string, string>, isError = false) => {
  const lines: string[] = [
    `pm.test("Status code is ${statusCode}", function () {`,
    `    pm.response.to.have.status(${statusCode});`,
    `});`,
    ``,
    `pm.test("Response has valid structure", function () {`,
    `    var jsonData = pm.response.json();`,
    `    pm.expect(jsonData).to.be.an("object");`,
    `    pm.expect(jsonData).to.have.property("success");`,
    isError
      ? `    pm.expect(jsonData.success).to.eql(false);\n    pm.expect(jsonData).to.have.property("errors");`
      : `    pm.expect(jsonData.success).to.eql(true);\n    pm.expect(jsonData).to.have.property("message");`,
    `});`
  ];

  if (extractVars) {
    lines.push(``, `// Extract environment variables`);
    lines.push(`try {`);
    lines.push(`    var res = pm.response.json();`);
    for (const [varName, jsonPath] of Object.entries(extractVars)) {
      lines.push(`    if (${jsonPath} !== undefined) {`);
      lines.push(`        pm.environment.set("${varName}", ${jsonPath});`);
      lines.push(`    }`);
    }
    lines.push(`} catch(e) { console.log("Failed to extract vars: " + e); }`);
  }

  return {
    listen: "test",
    script: {
      exec: lines,
      type: "text/javascript"
    }
  };
};

// Request creator helper
const createReq = (opts: {
  name: string;
  method: string;
  urlPath: string;
  authRole?: 'ADMIN' | 'PATIENT' | 'DRIVER' | 'NONE';
  description?: string;
  body?: any;
  queryParams?: Array<{ key: string; value: string; description?: string; disabled?: boolean }>;
  formData?: Array<{ key: string; value?: string; type: string; src?: string; description?: string }>;
  expectedStatus?: number;
  extractVars?: Record<string, string>;
  isError?: boolean;
}) => {
  const urlParts = opts.urlPath.split('/').filter(Boolean);
  const reqObj: any = {
    name: opts.name,
    request: {
      method: opts.method,
      header: [
        { key: "Content-Type", value: "application/json", type: "text" }
      ],
      url: {
        raw: `{{baseUrl}}/${opts.urlPath}${opts.queryParams && opts.queryParams.length ? '?' + opts.queryParams.map(q => `${q.key}=${q.value}`).join('&') : ''}`,
        host: ["{{baseUrl}}"],
        path: urlParts,
        query: (opts.queryParams || []).map(q => ({
          key: q.key,
          value: q.value,
          description: q.description || '',
          disabled: !!q.disabled
        }))
      },
      description: opts.description || opts.name
    },
    response: []
  };

  // Auth setup
  if (opts.authRole && opts.authRole !== 'NONE') {
    const tokenVar = opts.authRole === 'ADMIN' ? '{{adminToken}}' : opts.authRole === 'DRIVER' ? '{{driverToken}}' : '{{patientToken}}';
    reqObj.request.auth = {
      type: "bearer",
      bearer: [{ key: "token", value: tokenVar, type: "string" }]
    };
  }

  // Body setup
  if (opts.formData) {
    delete reqObj.request.header;
    reqObj.request.body = {
      mode: "formdata",
      formdata: opts.formData
    };
  } else if (opts.body) {
    reqObj.request.body = {
      mode: "raw",
      raw: JSON.stringify(opts.body, null, 2),
      options: { raw: { language: "json" } }
    };
  }

  // Tests
  reqObj.event = [createTestScript(opts.expectedStatus || 200, opts.extractVars, opts.isError)];

  // Example mock response
  reqObj.response.push({
    name: "Successful Response Example",
    originalRequest: reqObj.request,
    status: opts.expectedStatus === 201 ? "Created" : "OK",
    code: opts.expectedStatus || 200,
    _postman_previewlanguage: "json",
    header: [{ key: "Content-Type", value: "application/json" }],
    body: JSON.stringify({
      success: !opts.isError,
      message: `${opts.name} completed successfully`,
      data: opts.body || {}
    }, null, 2)
  });

  return reqObj;
};

// 00. Health & Root
const folderHealth = {
  name: "00 Health & Root",
  description: "Root endpoint and server health diagnostics",
  item: [
    createReq({
      name: "Root API Greeting",
      method: "GET",
      urlPath: "",
      expectedStatus: 200,
      description: "Root greeting containing API version and documentation information."
    }),
    createReq({
      name: "System Health & Neon DB Check",
      method: "GET",
      urlPath: "api/v1/health",
      expectedStatus: 200,
      description: "Verifies database connectivity, process uptime, and environment."
    })
  ]
};

// 01. Auth
const folderAuth = {
  name: "01 Auth",
  description: "User authentication, token issuance, password management, and driver registration",
  item: [
    createReq({
      name: "Register Patient",
      method: "POST",
      urlPath: "api/v1/auth/register",
      expectedStatus: 201,
      body: {
        name: "Test Patient User",
        email: "test-patient-reg@example.com",
        phone: "+8801711223344",
        password: "Patient@123456"
      },
      extractVars: {
        patientToken: "res.data.accessToken",
        patientRefreshToken: "res.data.refreshToken"
      },
      description: "Public registration for PATIENT role."
    }),
    createReq({
      name: "Login Admin",
      method: "POST",
      urlPath: "api/v1/auth/login",
      expectedStatus: 200,
      body: {
        email: "{{adminEmail}}",
        password: "{{adminPassword}}"
      },
      extractVars: {
        adminToken: "res.data.accessToken",
        adminRefreshToken: "res.data.refreshToken"
      },
      description: "Authenticates Admin and populates adminToken."
    }),
    createReq({
      name: "Login Patient",
      method: "POST",
      urlPath: "api/v1/auth/login",
      expectedStatus: 200,
      body: {
        email: "{{patientEmail}}",
        password: "{{patientPassword}}"
      },
      extractVars: {
        patientToken: "res.data.accessToken",
        patientRefreshToken: "res.data.refreshToken"
      },
      description: "Authenticates demo Patient and populates patientToken."
    }),
    createReq({
      name: "Login Driver",
      method: "POST",
      urlPath: "api/v1/auth/login",
      expectedStatus: 200,
      body: {
        email: "{{driverEmail}}",
        password: "{{driverPassword}}"
      },
      extractVars: {
        driverToken: "res.data.accessToken",
        driverRefreshToken: "res.data.refreshToken"
      },
      description: "Authenticates demo Driver and populates driverToken."
    }),
    createReq({
      name: "Google OAuth Login",
      method: "POST",
      urlPath: "api/v1/auth/google",
      expectedStatus: 200,
      body: {
        idToken: "VALID_GOOGLE_OAUTH_ID_TOKEN"
      },
      description: "Authenticates via Google OAuth ID token (requires valid Google client configuration)."
    }),
    createReq({
      name: "Refresh Access Token",
      method: "POST",
      urlPath: "api/v1/auth/refresh-token",
      expectedStatus: 200,
      body: {
        refreshToken: "{{patientRefreshToken}}"
      },
      extractVars: {
        patientToken: "res.data.accessToken",
        patientRefreshToken: "res.data.refreshToken"
      },
      description: "Rotates refresh token and issues new access token."
    }),
    createReq({
      name: "Change Password",
      method: "POST",
      urlPath: "api/v1/auth/change-password",
      authRole: "PATIENT",
      expectedStatus: 200,
      body: {
        oldPassword: "Patient@123456",
        newPassword: "Patient@654321"
      },
      description: "Changes current user password and invalidates active refresh tokens."
    }),
    createReq({
      name: "Register Driver (Admin Only)",
      method: "POST",
      urlPath: "api/v1/auth/register-driver",
      authRole: "ADMIN",
      expectedStatus: 201,
      formData: [
        { key: "name", value: "New Fleet Driver", type: "text" },
        { key: "email", value: "driver-reg-test@ambulance.com", type: "text" },
        { key: "phone", value: "+8801811998877", type: "text" },
        { key: "password", value: "Driver@123456", type: "text" },
        { key: "licenseNumber", value: "DL-DHAKA-2026-999", type: "text" }
      ],
      extractVars: {
        driverId: "res.data.driver.id",
        driverUserId: "res.data.user.id"
      },
      description: "Admin registers a DRIVER user and creates linked Driver profile."
    }),
    createReq({
      name: "Logout",
      method: "POST",
      urlPath: "api/v1/auth/logout",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Clears user refresh token hash and invalidates session cookie."
    })
  ]
};

// 02. Users
const folderUsers = {
  name: "02 Users",
  description: "User profile management and avatar upload",
  item: [
    createReq({
      name: "Get My Profile",
      method: "GET",
      urlPath: "api/v1/users/me",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Retrieves authenticated user profile details."
    }),
    createReq({
      name: "Update My Profile",
      method: "PATCH",
      urlPath: "api/v1/users/me",
      authRole: "PATIENT",
      expectedStatus: 200,
      body: {
        name: "Rahim Uddin Updated",
        phone: "+8801711000001"
      },
      description: "Updates user name or phone number."
    }),
    createReq({
      name: "Upload Avatar",
      method: "POST",
      urlPath: "api/v1/users/me/avatar",
      authRole: "PATIENT",
      expectedStatus: 200,
      formData: [
        { key: "avatar", type: "file", description: "Avatar image (JPEG/PNG/WEBP, max 2MB)" }
      ],
      description: "Streams avatar image to Cloudinary and updates user profile."
    }),
    createReq({
      name: "Delete My Account (Soft Delete)",
      method: "DELETE",
      urlPath: "api/v1/users/me",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Soft deletes the user account."
    })
  ]
};

// 03. Ambulances
const folderAmbulances = {
  name: "03 Ambulances",
  description: "Fleet management, vehicle registration, driver assignment and geo-search",
  item: [
    createReq({
      name: "Create Ambulance (Admin)",
      method: "POST",
      urlPath: "api/v1/ambulances",
      authRole: "ADMIN",
      expectedStatus: 201,
      formData: [
        { key: "plateNumber", value: "DHAKA-METRO-KA-99-9001", type: "text" },
        { key: "type", value: "ICU", type: "text" },
        { key: "baseFare", value: "2000", type: "text" },
        { key: "perKmRate", value: "50", type: "text" }
      ],
      extractVars: { ambulanceId: "res.data.id" },
      description: "Admin creates a new ambulance with type (BASIC, ADVANCED, ICU, NEONATAL)."
    }),
    createReq({
      name: "List Ambulances (Admin)",
      method: "GET",
      urlPath: "api/v1/ambulances",
      authRole: "ADMIN",
      queryParams: [
        { key: "page", value: "1", description: "Page number" },
        { key: "limit", value: "10", description: "Items per page" },
        { key: "status", value: "AVAILABLE", description: "Filter status", disabled: true },
        { key: "type", value: "ICU", description: "Filter ambulance type", disabled: true },
        { key: "hasDriver", value: "true", description: "Filter assigned driver", disabled: true },
        { key: "searchTerm", value: "DHAKA", description: "Search plate number", disabled: true }
      ],
      expectedStatus: 200,
      description: "Admin lists all ambulances with pagination, sorting, and filters."
    }),
    createReq({
      name: "Get Available Ambulances Nearby",
      method: "GET",
      urlPath: "api/v1/ambulances/available",
      authRole: "PATIENT",
      queryParams: [
        { key: "lat", value: "23.8103", description: "Patient pickup latitude" },
        { key: "lng", value: "90.4125", description: "Patient pickup longitude" },
        { key: "type", value: "BASIC", description: "Desired ambulance type", disabled: true }
      ],
      expectedStatus: 200,
      description: "Returns AVAILABLE ambulances with on-duty drivers sorted by proximity."
    }),
    createReq({
      name: "Get Ambulance by ID",
      method: "GET",
      urlPath: "api/v1/ambulances/{{ambulanceId}}",
      authRole: "ADMIN",
      expectedStatus: 200,
      description: "Retrieves details of an ambulance by ID."
    }),
    createReq({
      name: "Update Ambulance Details",
      method: "PATCH",
      urlPath: "api/v1/ambulances/{{ambulanceId}}",
      authRole: "ADMIN",
      expectedStatus: 200,
      body: {
        type: "ICU",
        baseFare: 2200,
        perKmRate: 55,
        status: "AVAILABLE"
      },
      description: "Admin updates ambulance type, fares, or status."
    }),
    createReq({
      name: "Assign Driver to Ambulance",
      method: "PATCH",
      urlPath: "api/v1/ambulances/{{ambulanceId}}/assign-driver",
      authRole: "ADMIN",
      expectedStatus: 200,
      body: {
        driverId: "{{driverId}}"
      },
      description: "Assigns a driver to an ambulance (enforces 1-to-1 driver to ambulance relationship)."
    }),
    createReq({
      name: "Unassign Driver from Ambulance",
      method: "PATCH",
      urlPath: "api/v1/ambulances/{{ambulanceId}}/assign-driver",
      authRole: "ADMIN",
      expectedStatus: 200,
      body: {
        driverId: null
      },
      description: "Unassigns the current driver from the ambulance."
    }),
    createReq({
      name: "Delete Ambulance",
      method: "DELETE",
      urlPath: "api/v1/ambulances/{{ambulanceId}}",
      authRole: "ADMIN",
      expectedStatus: 200,
      description: "Soft deletes an ambulance (blocked if vehicle is currently ON_TRIP)."
    })
  ]
};

// 04. Drivers
const folderDrivers = {
  name: "04 Drivers",
  description: "Driver duty toggles, GPS location updates, and driver trip logs",
  item: [
    createReq({
      name: "List Drivers (Admin)",
      method: "GET",
      urlPath: "api/v1/drivers",
      authRole: "ADMIN",
      queryParams: [
        { key: "page", value: "1", description: "Page number" },
        { key: "limit", value: "10", description: "Items per page" },
        { key: "isOnDuty", value: "true", description: "Filter on-duty drivers", disabled: true }
      ],
      expectedStatus: 200,
      description: "Admin lists all drivers with assigned ambulance details."
    }),
    createReq({
      name: "Toggle Duty Availability",
      method: "PATCH",
      urlPath: "api/v1/drivers/me/availability",
      authRole: "DRIVER",
      expectedStatus: 200,
      body: {
        isOnDuty: true
      },
      description: "Driver toggles duty status. Going ON-duty triggers automated dispatch for pending queue."
    }),
    createReq({
      name: "Update Driver Location",
      method: "PATCH",
      urlPath: "api/v1/drivers/me/location",
      authRole: "DRIVER",
      expectedStatus: 200,
      body: {
        lat: 23.8103,
        lng: 90.4125
      },
      description: "Updates driver ambulance real-time GPS coordinates."
    }),
    createReq({
      name: "Get My Current Trip",
      method: "GET",
      urlPath: "api/v1/drivers/me/current-trip",
      authRole: "DRIVER",
      expectedStatus: 200,
      description: "Driver views current active assigned trip."
    }),
    createReq({
      name: "Get My Trip History",
      method: "GET",
      urlPath: "api/v1/drivers/me/trips",
      authRole: "DRIVER",
      queryParams: [
        { key: "page", value: "1", description: "Page number" },
        { key: "limit", value: "10", description: "Items per page" }
      ],
      expectedStatus: 200,
      description: "Driver views past trips."
    }),
    createReq({
      name: "Get Driver by ID (Admin)",
      method: "GET",
      urlPath: "api/v1/drivers/{{driverId}}",
      authRole: "ADMIN",
      expectedStatus: 200,
      description: "Admin inspects a specific driver profile."
    }),
    createReq({
      name: "Update Driver (Admin)",
      method: "PATCH",
      urlPath: "api/v1/drivers/{{driverId}}",
      authRole: "ADMIN",
      expectedStatus: 200,
      body: {
        licenseNumber: "DL-DHAKA-UPDATED-001"
      },
      description: "Admin updates driver license number or profile."
    })
  ]
};

// 05. Hospitals
const folderHospitals = {
  name: "05 Hospitals",
  description: "Hospital registry, bed availability, emergency capability and nearby search",
  item: [
    createReq({
      name: "Create Hospital (Admin)",
      method: "POST",
      urlPath: "api/v1/hospitals",
      authRole: "ADMIN",
      expectedStatus: 201,
      body: {
        name: "Dhaka Central Hospital",
        address: "Green Road, Dhanmondi, Dhaka",
        city: "Dhaka",
        lat: 23.7465,
        lng: 90.386,
        phone: "+88029660015",
        specialties: ["Emergency", "ICU", "Cardiology"],
        totalBeds: 250,
        availableBeds: 35,
        hasEmergency: true
      },
      extractVars: { hospitalId: "res.data.id" },
      description: "Admin creates a hospital entry with coordinates and emergency beds."
    }),
    createReq({
      name: "List Hospitals",
      method: "GET",
      urlPath: "api/v1/hospitals",
      authRole: "PATIENT",
      queryParams: [
        { key: "city", value: "Dhaka", description: "Filter by city", disabled: true },
        { key: "hasEmergency", value: "true", description: "Emergency capability", disabled: true },
        { key: "searchTerm", value: "Hospital", description: "Search hospital name", disabled: true }
      ],
      expectedStatus: 200,
      description: "Lists hospitals with filtering and pagination."
    }),
    createReq({
      name: "Get Nearby Hospitals",
      method: "GET",
      urlPath: "api/v1/hospitals/nearby",
      authRole: "PATIENT",
      queryParams: [
        { key: "lat", value: "23.8103", description: "Pickup latitude" },
        { key: "lng", value: "90.4125", description: "Pickup longitude" },
        { key: "radiusKm", value: "15", description: "Search radius in km", disabled: true },
        { key: "specialty", value: "Cardiology", description: "Medical specialty", disabled: true }
      ],
      expectedStatus: 200,
      description: "Returns emergency hospitals ranked by distance from given coordinates."
    }),
    createReq({
      name: "Get Hospital by ID",
      method: "GET",
      urlPath: "api/v1/hospitals/{{hospitalId}}",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Retrieves details of a single hospital."
    }),
    createReq({
      name: "Update Hospital Details",
      method: "PATCH",
      urlPath: "api/v1/hospitals/{{hospitalId}}",
      authRole: "ADMIN",
      expectedStatus: 200,
      body: {
        hasEmergency: true,
        specialties: ["Emergency", "Trauma", "Cardiology", "Burn Unit"]
      },
      description: "Admin updates hospital specialties and details."
    }),
    createReq({
      name: "Update Hospital Bed Capacity",
      method: "PATCH",
      urlPath: "api/v1/hospitals/{{hospitalId}}/beds",
      authRole: "ADMIN",
      expectedStatus: 200,
      body: {
        totalBeds: 300,
        availableBeds: 45
      },
      description: "Updates live available and total bed counts."
    }),
    createReq({
      name: "Delete Hospital",
      method: "DELETE",
      urlPath: "api/v1/hospitals/{{hospitalId}}",
      authRole: "ADMIN",
      expectedStatus: 200,
      description: "Soft deletes a hospital record."
    })
  ]
};

// 06. Emergency Requests
const folderRequests = {
  name: "06 Emergency Requests",
  description: "Patient emergency request submission, triage, priority overrides and manual dispatching",
  item: [
    createReq({
      name: "Create Emergency Request (Patient)",
      method: "POST",
      urlPath: "api/v1/emergency-requests",
      authRole: "PATIENT",
      expectedStatus: 201,
      formData: [
        { key: "emergencyType", value: "CARDIAC", type: "text" },
        { key: "description", value: "Severe chest pain and shortness of breath", type: "text" },
        { key: "pickupAddress", value: "Road 11, Banani, Dhaka", type: "text" },
        { key: "pickupLat", value: "23.7937", type: "text" },
        { key: "pickupLng", value: "90.4066", type: "text" },
        { key: "patientName", value: "Rahim Uddin", type: "text" },
        { key: "patientPhone", value: "+8801711000001", type: "text" }
      ],
      extractVars: {
        requestId: "res.data.id",
        tripId: "res.data.trip ? res.data.trip.id : pm.environment.get('tripId')"
      },
      description: "Patient creates an emergency request. Triages priority (CRITICAL -> ICU) and auto-dispatches an available unit."
    }),
    createReq({
      name: "List All Requests (Admin)",
      method: "GET",
      urlPath: "api/v1/emergency-requests",
      authRole: "ADMIN",
      queryParams: [
        { key: "page", value: "1", description: "Page number" },
        { key: "limit", value: "10", description: "Items per page" },
        { key: "status", value: "PENDING", description: "Filter status", disabled: true },
        { key: "priority", value: "CRITICAL", description: "Filter priority", disabled: true }
      ],
      expectedStatus: 200,
      description: "Admin lists all emergency requests."
    }),
    createReq({
      name: "List My Requests (Patient)",
      method: "GET",
      urlPath: "api/v1/emergency-requests/my",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Patient views their own emergency request history."
    }),
    createReq({
      name: "Get Request by ID",
      method: "GET",
      urlPath: "api/v1/emergency-requests/{{requestId}}",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Retrieves details of an emergency request."
    }),
    createReq({
      name: "Admin Override Priority",
      method: "PATCH",
      urlPath: "api/v1/emergency-requests/{{requestId}}",
      authRole: "ADMIN",
      expectedStatus: 200,
      body: {
        priority: "CRITICAL"
      },
      description: "Admin manually overrides priority level (re-evaluates requiredType)."
    }),
    createReq({
      name: "Manual Dispatch / Reassign (Admin)",
      method: "POST",
      urlPath: "api/v1/emergency-requests/{{requestId}}/dispatch",
      authRole: "ADMIN",
      expectedStatus: 200,
      body: {
        ambulanceId: "{{ambulanceId}}"
      },
      extractVars: { tripId: "res.data.trip.id" },
      description: "Admin manually dispatches a specific ambulance to a pending request."
    }),
    createReq({
      name: "Cancel Emergency Request",
      method: "POST",
      urlPath: "api/v1/emergency-requests/{{requestId}}/cancel",
      authRole: "PATIENT",
      expectedStatus: 200,
      body: {
        reason: "Patient condition stabilized, alternative arrangement made."
      },
      description: "Cancels request (allowed only before ambulance marks patient as PICKED_UP)."
    })
  ]
};

// 07. Trips
const folderTrips = {
  name: "07 Trips",
  description: "Trip lifecycle state machine, status transitions, timeline and hospital routing",
  item: [
    createReq({
      name: "List Trips (Admin)",
      method: "GET",
      urlPath: "api/v1/trips",
      authRole: "ADMIN",
      queryParams: [
        { key: "page", value: "1", description: "Page number" },
        { key: "limit", value: "10", description: "Items per page" },
        { key: "status", value: "DISPATCHED", description: "Filter by status", disabled: true }
      ],
      expectedStatus: 200,
      description: "Admin lists all trips with patient and vehicle details."
    }),
    createReq({
      name: "Get Trip by ID",
      method: "GET",
      urlPath: "api/v1/trips/{{tripId}}",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Retrieves full trip information including assigned vehicle, driver, and destination hospital."
    }),
    createReq({
      name: "Get Trip Timeline Events",
      method: "GET",
      urlPath: "api/v1/trips/{{tripId}}/timeline",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Returns chronological audit trail of all trip status changes."
    }),
    createReq({
      name: "Transition Status: EN_ROUTE",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      expectedStatus: 200,
      body: {
        status: "EN_ROUTE",
        note: "Ambulance dispatched and moving towards pickup location"
      },
      description: "Driver updates trip to EN_ROUTE."
    }),
    createReq({
      name: "Transition Status: ARRIVED_AT_PICKUP",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      expectedStatus: 200,
      body: {
        status: "ARRIVED_AT_PICKUP",
        note: "Arrived at pickup location"
      },
      description: "Driver announces arrival at pickup address."
    }),
    createReq({
      name: "Transition Status: PICKED_UP",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      expectedStatus: 200,
      body: {
        status: "PICKED_UP",
        note: "Patient secured on stretcher inside vehicle"
      },
      description: "Driver marks patient picked up. (Cancellation is strictly locked after this point)."
    }),
    createReq({
      name: "Select Destination Hospital",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/hospital",
      authRole: "DRIVER",
      expectedStatus: 200,
      body: {
        hospitalId: "{{hospitalId}}"
      },
      description: "Updates receiving hospital if routed to an alternate emergency center."
    }),
    createReq({
      name: "Transition Status: EN_ROUTE_TO_HOSPITAL",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      expectedStatus: 200,
      body: {
        status: "EN_ROUTE_TO_HOSPITAL",
        note: "Heading to receiving hospital with emergency lights active"
      },
      description: "Driver marks transit to receiving hospital."
    }),
    createReq({
      name: "Transition Status: ARRIVED_AT_HOSPITAL",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      expectedStatus: 200,
      body: {
        status: "ARRIVED_AT_HOSPITAL",
        note: "Arrived at hospital emergency entrance"
      },
      description: "Driver arrives at destination hospital."
    }),
    createReq({
      name: "Transition Status: COMPLETED",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      expectedStatus: 200,
      body: {
        status: "COMPLETED",
        note: "Patient admitted to ER, trip complete"
      },
      extractVars: {
        paymentId: "res.data.payment ? res.data.payment.id : pm.environment.get('paymentId')",
        tranId: "res.data.payment ? res.data.payment.tranId : pm.environment.get('tranId')"
      },
      description: "Completes trip, releases ambulance to AVAILABLE, calculates total fare, and initializes Payment record."
    })
  ]
};

// 08. Payments
const folderPayments = {
  name: "08 Payments",
  description: "SSLCommerz sandbox integration, initiation, success/fail/cancel/ipn callbacks, and payment tracking",
  item: [
    createReq({
      name: "Initiate Payment (Patient)",
      method: "POST",
      urlPath: "api/v1/payments/initiate",
      authRole: "PATIENT",
      expectedStatus: 200,
      body: {
        tripId: "{{tripId}}"
      },
      extractVars: {
        paymentId: "res.data.paymentId",
        tranId: "res.data.tranId",
        paymentUrl: "res.data.paymentUrl"
      },
      description: "Patient initiates payment for completed trip. Returns SSLCommerz GatewayPageURL."
    }),
    createReq({
      name: "Gateway Callback: Success",
      method: "POST",
      urlPath: "api/v1/payments/success",
      body: {
        tran_id: "{{tranId}}",
        val_id: "VALIDATION_TRANSACTION_ID"
      },
      description: "Called by SSLCommerz upon successful transaction. Validates credentials and marks payment PAID."
    }),
    createReq({
      name: "Gateway Callback: Fail",
      method: "POST",
      urlPath: "api/v1/payments/fail",
      body: {
        tran_id: "{{tranId}}"
      },
      description: "Called when payment fails at the gateway."
    }),
    createReq({
      name: "Gateway Callback: Cancel",
      method: "POST",
      urlPath: "api/v1/payments/cancel",
      body: {
        tran_id: "{{tranId}}"
      },
      description: "Called when user cancels transaction."
    }),
    createReq({
      name: "Gateway Callback: IPN Webhook",
      method: "POST",
      urlPath: "api/v1/payments/ipn",
      body: {
        tran_id: "{{tranId}}",
        val_id: "IPN_VAL_ID"
      },
      description: "Server-to-server instant payment notification webhook."
    }),
    createReq({
      name: "Get My Payments (Patient)",
      method: "GET",
      urlPath: "api/v1/payments/my",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Patient lists their payment history with trip summaries."
    }),
    createReq({
      name: "List All Payments (Admin)",
      method: "GET",
      urlPath: "api/v1/payments",
      authRole: "ADMIN",
      queryParams: [
        { key: "page", value: "1", description: "Page number" },
        { key: "limit", value: "10", description: "Items per page" },
        { key: "status", value: "PAID", description: "Payment status filter", disabled: true }
      ],
      expectedStatus: 200,
      description: "Admin lists all payments across the system."
    }),
    createReq({
      name: "Get Payment by ID",
      method: "GET",
      urlPath: "api/v1/payments/{{paymentId}}",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Retrieves single payment details (allowed for owner patient or admin)."
    })
  ]
};

// 09. Notifications
const folderNotifications = {
  name: "09 Notifications",
  description: "User notification feed, unread count tracking, and read state management",
  item: [
    createReq({
      name: "Get Notifications Feed",
      method: "GET",
      urlPath: "api/v1/notifications",
      authRole: "PATIENT",
      queryParams: [
        { key: "page", value: "1", description: "Page number" },
        { key: "limit", value: "10", description: "Items per page" },
        { key: "isRead", value: "false", description: "Filter unread", disabled: true }
      ],
      expectedStatus: 200,
      extractVars: {
        notificationId: "res.data[0] ? res.data[0].id : pm.environment.get('notificationId')"
      },
      description: "Retrieves user notifications with metadata including unreadCount."
    }),
    createReq({
      name: "Mark All Notifications as Read",
      method: "PATCH",
      urlPath: "api/v1/notifications/read-all",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Marks all notifications for authenticated user as read."
    }),
    createReq({
      name: "Mark Single Notification as Read",
      method: "PATCH",
      urlPath: "api/v1/notifications/{{notificationId}}/read",
      authRole: "PATIENT",
      expectedStatus: 200,
      description: "Marks one specific notification as read."
    })
  ]
};

// 10. Admin
const folderAdmin = {
  name: "10 Admin",
  description: "System administration, user role/status management, dashboard analytics, and audit trail",
  item: [
    createReq({
      name: "List Users (Admin)",
      method: "GET",
      urlPath: "api/v1/admin/users",
      authRole: "ADMIN",
      queryParams: [
        { key: "page", value: "1", description: "Page number" },
        { key: "limit", value: "10", description: "Items per page" },
        { key: "role", value: "PATIENT", description: "Filter role", disabled: true },
        { key: "status", value: "ACTIVE", description: "Filter status", disabled: true },
        { key: "searchTerm", value: "Uddin", description: "Search by name/email/phone", disabled: true }
      ],
      expectedStatus: 200,
      description: "Admin lists users with filtering, omitting sensitive hash credentials."
    }),
    createReq({
      name: "Update User Role",
      method: "PATCH",
      urlPath: "api/v1/admin/users/{{driverUserId}}/role",
      authRole: "ADMIN",
      expectedStatus: 200,
      body: {
        role: "PATIENT"
      },
      description: "Admin updates user role (enforces self-demotion and last-admin rules)."
    }),
    createReq({
      name: "Update User Status (Suspend/Activate)",
      method: "PATCH",
      urlPath: "api/v1/admin/users/{{driverUserId}}/status",
      authRole: "ADMIN",
      expectedStatus: 200,
      body: {
        status: "ACTIVE"
      },
      description: "Admin suspends or activates user. Suspending drivers on active trips is forbidden."
    }),
    createReq({
      name: "Get Dashboard Statistics",
      method: "GET",
      urlPath: "api/v1/admin/dashboard-stats",
      authRole: "ADMIN",
      expectedStatus: 200,
      description: "Parallel aggregation of users, fleet status, hospitals, bed capacity, pending queues, and revenue."
    }),
    createReq({
      name: "Get Incident Reports (Group By Day)",
      method: "GET",
      urlPath: "api/v1/admin/reports/incidents",
      authRole: "ADMIN",
      queryParams: [
        { key: "groupBy", value: "day", description: "Aggregation grouping" }
      ],
      expectedStatus: 200,
      description: "Incident analytics grouped by day."
    }),
    createReq({
      name: "Get Incident Reports (Group By Priority)",
      method: "GET",
      urlPath: "api/v1/admin/reports/incidents",
      authRole: "ADMIN",
      queryParams: [
        { key: "groupBy", value: "priority", description: "Aggregation grouping" }
      ],
      expectedStatus: 200,
      description: "Incident analytics grouped by priority."
    }),
    createReq({
      name: "Get Incident Reports (Group By Emergency Type)",
      method: "GET",
      urlPath: "api/v1/admin/reports/incidents",
      authRole: "ADMIN",
      queryParams: [
        { key: "groupBy", value: "emergencyType", description: "Aggregation grouping" }
      ],
      expectedStatus: 200,
      description: "Incident analytics grouped by emergency type."
    }),
    createReq({
      name: "Get Incident Reports (Group By Hospital)",
      method: "GET",
      urlPath: "api/v1/admin/reports/incidents",
      authRole: "ADMIN",
      queryParams: [
        { key: "groupBy", value: "hospital", description: "Aggregation grouping" }
      ],
      expectedStatus: 200,
      description: "Incident analytics grouped by destination hospital."
    }),
    createReq({
      name: "Get System Audit Logs",
      method: "GET",
      urlPath: "api/v1/admin/audit-logs",
      authRole: "ADMIN",
      queryParams: [
        { key: "page", value: "1", description: "Page number" },
        { key: "limit", value: "20", description: "Items per page" },
        { key: "action", value: "PAYMENT_INITIATED", description: "Filter action", disabled: true }
      ],
      expectedStatus: 200,
      description: "Admin reviews regulatory audit logs with joined actor metadata."
    })
  ]
};

// 11. FULL DEMO FLOW
const folderDemoFlow = {
  name: "11 FULL DEMO FLOW",
  description: "End-to-end mission-critical lifecycle simulation: Auth -> On Duty -> Emergency Request -> Dispatch -> In-Transit Lifecycle -> ER Admission -> Payment -> Dashboard Analytics. Note: Payment checkout at the end requires opening the returned paymentUrl in a browser.",
  item: [
    createReq({
      name: "01 Warmup & Health Check",
      method: "GET",
      urlPath: "api/v1/health",
      expectedStatus: 200,
      description: "Warms up Render free instance and validates DB health."
    }),
    createReq({
      name: "02 Admin Login",
      method: "POST",
      urlPath: "api/v1/auth/login",
      body: {
        email: "{{adminEmail}}",
        password: "{{adminPassword}}"
      },
      extractVars: { adminToken: "res.data.accessToken" },
      description: "Authenticates Admin user."
    }),
    createReq({
      name: "03 Driver Login",
      method: "POST",
      urlPath: "api/v1/auth/login",
      body: {
        email: "{{driverEmail}}",
        password: "{{driverPassword}}"
      },
      extractVars: { driverToken: "res.data.accessToken" },
      description: "Authenticates fleet Driver."
    }),
    createReq({
      name: "04 Patient Login",
      method: "POST",
      urlPath: "api/v1/auth/login",
      body: {
        email: "{{patientEmail}}",
        password: "{{patientPassword}}"
      },
      extractVars: { patientToken: "res.data.accessToken" },
      description: "Authenticates Patient."
    }),
    createReq({
      name: "05 Driver Goes On-Duty",
      method: "PATCH",
      urlPath: "api/v1/drivers/me/availability",
      authRole: "DRIVER",
      body: { isOnDuty: true },
      expectedStatus: 200,
      description: "Driver sets status on-duty."
    }),
    createReq({
      name: "06 Driver Updates Live GPS Location",
      method: "PATCH",
      urlPath: "api/v1/drivers/me/location",
      authRole: "DRIVER",
      body: {
        lat: 23.8103,
        lng: 90.4125
      },
      expectedStatus: 200,
      description: "Driver reports coordinates in Dhaka (Banani)."
    }),
    createReq({
      name: "07 Patient Submits Emergency Request",
      method: "POST",
      urlPath: "api/v1/emergency-requests",
      authRole: "PATIENT",
      formData: [
        { key: "emergencyType", value: "CARDIAC", type: "text" },
        { key: "description", value: "Patient suffering acute chest pain and cardiac arrest", type: "text" },
        { key: "pickupAddress", value: "House 45, Road 11, Banani, Dhaka", type: "text" },
        { key: "pickupLat", value: "23.7937", type: "text" },
        { key: "pickupLng", value: "90.4066", type: "text" },
        { key: "patientName", value: "Demo Emergency Patient", type: "text" },
        { key: "patientPhone", value: "+8801711000001", type: "text" }
      ],
      extractVars: {
        requestId: "res.data.id",
        tripId: "res.data.trip ? res.data.trip.id : pm.environment.get('tripId')"
      },
      expectedStatus: 201,
      description: "Priority engine classifies as CRITICAL, auto-dispatches ICU ambulance, and links hospital."
    }),
    createReq({
      name: "08 Driver Accepts & En Route",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      body: {
        status: "EN_ROUTE",
        note: "Responding to cardiac emergency at Banani"
      },
      expectedStatus: 200,
      description: "Driver navigates towards patient."
    }),
    createReq({
      name: "09 Driver Arrives at Pickup Location",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      body: {
        status: "ARRIVED_AT_PICKUP",
        note: "Arrived at pickup location"
      },
      expectedStatus: 200,
      description: "Driver arrives at patient house."
    }),
    createReq({
      name: "10 Patient Secured (PICKED_UP)",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      body: {
        status: "PICKED_UP",
        note: "Patient secured in ICU ambulance, vitals monitored"
      },
      expectedStatus: 200,
      description: "Patient loaded. Request cancellation is permanently locked."
    }),
    createReq({
      name: "10b Select Receiving Hospital",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/hospital",
      authRole: "DRIVER",
      body: {
        hospitalId: "{{hospitalId}}"
      },
      expectedStatus: 200,
      description: "Sets destination hospital for the trip before routing."
    }),
    createReq({
      name: "11 Driver Navigates to Hospital",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      body: {
        status: "EN_ROUTE_TO_HOSPITAL",
        note: "Heading to Evercare Hospital emergency trauma wing"
      },
      expectedStatus: 200,
      description: "Ambulance in transit to hospital."
    }),
    createReq({
      name: "12 Arrives at Hospital ER",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      body: {
        status: "ARRIVED_AT_HOSPITAL",
        note: "Arrived at hospital emergency entrance"
      },
      expectedStatus: 200,
      description: "Arrived at receiving hospital."
    }),
    createReq({
      name: "13 Complete Trip & Generate Fare",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      body: {
        status: "COMPLETED",
        note: "Patient admitted to ER, vitals transferred to doctor"
      },
      extractVars: {
        paymentId: "res.data.payment ? res.data.payment.id : pm.environment.get('paymentId')",
        tranId: "res.data.payment ? res.data.payment.tranId : pm.environment.get('tranId')"
      },
      expectedStatus: 200,
      description: "Completes trip, releases ambulance, and creates payment row."
    }),
    createReq({
      name: "14 Patient Initiates SSLCommerz Payment",
      method: "POST",
      urlPath: "api/v1/payments/initiate",
      authRole: "PATIENT",
      body: {
        tripId: "{{tripId}}"
      },
      extractVars: {
        paymentUrl: "res.data.paymentUrl",
        tranId: "res.data.tranId"
      },
      expectedStatus: 200,
      description: "Returns real SSLCommerz GatewayPageURL. (Copy paymentUrl into browser for manual test card payment)."
    }),
    createReq({
      name: "15 Admin Inspects Live Dashboard Metrics",
      method: "GET",
      urlPath: "api/v1/admin/dashboard-stats",
      authRole: "ADMIN",
      expectedStatus: 200,
      description: "Verifies trip completion and updated analytics across the platform."
    })
  ]
};

// 12. Error Cases
const folderErrors = {
  name: "12 Error Cases",
  description: "Negative validation scenarios, unauthorized access, invalid transitions, and duplicate prevention",
  item: [
    createReq({
      name: "400 Bad Request - Validation Failure",
      method: "POST",
      urlPath: "api/v1/auth/register",
      body: {
        email: "not-an-email",
        password: "short"
      },
      expectedStatus: 400,
      isError: true,
      description: "Demonstrates Zod validation error format."
    }),
    createReq({
      name: "401 Unauthorized - Missing Token",
      method: "GET",
      urlPath: "api/v1/admin/dashboard-stats",
      expectedStatus: 401,
      isError: true,
      description: "Accessing protected route without Bearer token."
    }),
    createReq({
      name: "403 Forbidden - Role Guard",
      method: "GET",
      urlPath: "api/v1/admin/dashboard-stats",
      authRole: "PATIENT",
      expectedStatus: 403,
      isError: true,
      description: "Patient attempting to access admin route."
    }),
    createReq({
      name: "404 Not Found - Unknown Resource",
      method: "GET",
      urlPath: "api/v1/trips/00000000-0000-0000-0000-000000000000",
      authRole: "ADMIN",
      expectedStatus: 404,
      isError: true,
      description: "Querying a non-existent UUID."
    }),
    createReq({
      name: "409 Conflict - Duplicate Active Request",
      method: "POST",
      urlPath: "api/v1/emergency-requests",
      authRole: "PATIENT",
      formData: [
        { key: "emergencyType", value: "CARDIAC", type: "text" },
        { key: "pickupAddress", value: "Banani, Dhaka", type: "text" },
        { key: "pickupLat", value: "23.7937", type: "text" },
        { key: "pickupLng", value: "90.4066", type: "text" }
      ],
      expectedStatus: 409,
      isError: true,
      description: "Patient cannot create another request while one is already active."
    }),
    createReq({
      name: "400 Bad Request - Invalid Trip State Transition",
      method: "PATCH",
      urlPath: "api/v1/trips/{{tripId}}/status",
      authRole: "DRIVER",
      body: {
        status: "COMPLETED" // Cannot jump straight from DISPATCHED to COMPLETED
      },
      expectedStatus: 400,
      isError: true,
      description: "State machine rejects illegal jumps across intermediate steps."
    })
  ]
};

collection.item = [
  folderHealth,
  folderAuth,
  folderUsers,
  folderAmbulances,
  folderDrivers,
  folderHospitals,
  folderRequests,
  folderTrips,
  folderPayments,
  folderNotifications,
  folderAdmin,
  folderDemoFlow,
  folderErrors
];

const outPath = path.join(__dirname, '../../docs/postman/Emergency-Ambulance-Dispatch.postman_collection.json');
fs.writeFileSync(outPath, JSON.stringify(collection, null, 2));
console.log(`Generated Postman Collection with ${collection.item.length} folders at: ${outPath}`);
