import { PrismaClient, Role, UserStatus, AmbulanceType, AmbulanceStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ambulance.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  // 1. Admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'System Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: 'System Admin',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Admin upserted:', admin.email);

  // 2. Demo Patients
  const patientHash = await bcrypt.hash('Patient@123456', 10);
  const patient1 = await prisma.user.upsert({
    where: { email: 'patient1@example.com' },
    update: {
      name: 'Rahim Uddin',
      phone: '+8801711000001',
      passwordHash: patientHash,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: 'Rahim Uddin',
      email: 'patient1@example.com',
      phone: '+8801711000001',
      passwordHash: patientHash,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
    },
  });

  const patient2 = await prisma.user.upsert({
    where: { email: 'patient2@example.com' },
    update: {
      name: 'Fatema Begum',
      phone: '+8801711000002',
      passwordHash: patientHash,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: 'Fatema Begum',
      email: 'patient2@example.com',
      phone: '+8801711000002',
      passwordHash: patientHash,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Demo patients upserted:', patient1.email, patient2.email);

  // 3. Drivers & Ambulances (BASIC, ADVANCED, ICU in Dhaka, status AVAILABLE)
  const driverHash = await bcrypt.hash('Driver@123456', 10);
  const driversData = [
    {
      name: 'Karim Driver',
      email: 'driver1@ambulance.com',
      phone: '+8801811000001',
      licenseNumber: 'DL-DHAKA-2024-001',
      ambulance: {
        plateNumber: 'DHAKA-METRO-CH-11-1001',
        type: AmbulanceType.BASIC,
        lat: 23.8103, // Dhaka Banani
        lng: 90.4125,
        baseFare: 500,
        perKmRate: 30,
      },
    },
    {
      name: 'Sultana Driver',
      email: 'driver2@ambulance.com',
      phone: '+8801811000002',
      licenseNumber: 'DL-DHAKA-2024-002',
      ambulance: {
        plateNumber: 'DHAKA-METRO-CH-11-1002',
        type: AmbulanceType.ADVANCED,
        lat: 23.7465, // Dhaka Dhanmondi
        lng: 90.3760,
        baseFare: 1000,
        perKmRate: 45,
      },
    },
    {
      name: 'Rafiqul Driver',
      email: 'driver3@ambulance.com',
      phone: '+8801811000003',
      licenseNumber: 'DL-DHAKA-2024-003',
      ambulance: {
        plateNumber: 'DHAKA-METRO-CH-11-1003',
        type: AmbulanceType.ICU,
        lat: 23.7925, // Dhaka Gulshan
        lng: 90.4078,
        baseFare: 2000,
        perKmRate: 60,
      },
    },
  ];

  for (const item of driversData) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        name: item.name,
        phone: item.phone,
        passwordHash: driverHash,
        role: Role.DRIVER,
        status: UserStatus.ACTIVE,
      },
      create: {
        name: item.name,
        email: item.email,
        phone: item.phone,
        passwordHash: driverHash,
        role: Role.DRIVER,
        status: UserStatus.ACTIVE,
      },
    });

    const driver = await prisma.driver.upsert({
      where: { userId: user.id },
      update: {
        licenseNumber: item.licenseNumber,
        isOnDuty: true,
      },
      create: {
        userId: user.id,
        licenseNumber: item.licenseNumber,
        isOnDuty: true,
      },
    });

    await prisma.ambulance.upsert({
      where: { plateNumber: item.ambulance.plateNumber },
      update: {
        type: item.ambulance.type,
        status: AmbulanceStatus.AVAILABLE,
        lat: item.ambulance.lat,
        lng: item.ambulance.lng,
        locationUpdatedAt: new Date(),
        driverId: driver.id,
        baseFare: item.ambulance.baseFare,
        perKmRate: item.ambulance.perKmRate,
      },
      create: {
        plateNumber: item.ambulance.plateNumber,
        type: item.ambulance.type,
        status: AmbulanceStatus.AVAILABLE,
        lat: item.ambulance.lat,
        lng: item.ambulance.lng,
        locationUpdatedAt: new Date(),
        driverId: driver.id,
        baseFare: item.ambulance.baseFare,
        perKmRate: item.ambulance.perKmRate,
      },
    });
  }
  console.log('✅ Drivers and Ambulances upserted.');

  // 4. Hospitals (5 hospitals in Dhaka & Chattogram)
  const hospitalsData = [
    {
      name: 'Dhaka Medical College Hospital',
      address: 'Secretariat Rd, Dhaka 1000',
      city: 'Dhaka',
      lat: 23.7259,
      lng: 90.3976,
      phone: '+880255165088',
      specialties: ['Emergency Trauma', 'Cardiology', 'Neurology', 'ICU'],
      totalBeds: 2600,
      availableBeds: 45,
      hasEmergency: true,
    },
    {
      name: 'Square Hospital Dhaka',
      address: '18/F Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath, Dhaka 1205',
      city: 'Dhaka',
      lat: 23.7533,
      lng: 90.3817,
      phone: '+88028144400',
      specialties: ['Cardiac Surgery', 'Neuro Surgery', 'Critical Care', 'Pediatrics'],
      totalBeds: 400,
      availableBeds: 18,
      hasEmergency: true,
    },
    {
      name: 'Evercare Hospital Dhaka',
      address: 'Plot 81, Block E, Bashundhara R/A, Dhaka 1229',
      city: 'Dhaka',
      lat: 23.8099,
      lng: 90.4312,
      phone: '+88028431661',
      specialties: ['Trauma Center', 'Interventional Cardiology', 'Neonatal ICU'],
      totalBeds: 425,
      availableBeds: 22,
      hasEmergency: true,
    },
    {
      name: 'Chattogram Medical College Hospital',
      address: '57 K.B. Fazlul Kader Rd, Chattogram 4203',
      city: 'Chattogram',
      lat: 22.3596,
      lng: 91.8284,
      phone: '+88031619400',
      specialties: ['Emergency Care', 'Orthopedics', 'Burn & Plastic', 'Cardiology'],
      totalBeds: 1313,
      availableBeds: 35,
      hasEmergency: true,
    },
    {
      name: 'Evercare Hospital Chattogram',
      address: 'Plot No H1, Ananna R/A, Oxygen-Kuaish Road, Chattogram 4337',
      city: 'Chattogram',
      lat: 22.3957,
      lng: 91.8315,
      phone: '+880312558666',
      specialties: ['Comprehensive Emergency', 'Cardiac Care', 'Critical Care Medicine'],
      totalBeds: 470,
      availableBeds: 28,
      hasEmergency: true,
    },
  ];

  for (const hosp of hospitalsData) {
    const existing = await prisma.hospital.findFirst({
      where: { name: hosp.name, city: hosp.city },
    });

    if (existing) {
      await prisma.hospital.update({
        where: { id: existing.id },
        data: hosp,
      });
    } else {
      await prisma.hospital.create({
        data: hosp,
      });
    }
  }
  console.log('✅ 5 Hospitals in Dhaka and Chattogram upserted.');
  console.log('✨ Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
