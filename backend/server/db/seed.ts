import bcrypt from 'bcryptjs';
import { count, eq } from 'drizzle-orm';
import { db, pool } from './index';
import { events, registrations, users } from './schema';

// Seeds EventHub with a CPC student council admin, sample students, and a set
// of Cordova Public College events so the platform is not empty on first run.
// Run with: npm run db:seed

function daysFromNow(days: number, hour = 9): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user ?? null;
}

type SeedStudent = {
  fullName: string;
  email: string;
  studentId: string;
  course: string;
  yearLevel: number;
  role: 'admin' | 'user';
  password: string;
};

const seedStudents: SeedStudent[] = [
  {
    fullName: 'Ana Marie Villamor',
    email: 'admin@cpc.edu.ph',
    studentId: 'CPC-2022-0001',
    course: 'BS Information Technology',
    yearLevel: 4,
    role: 'admin',
    password: 'Admin123!',
  },
  {
    fullName: 'Juan Dela Cruz',
    email: 'student@cpc.edu.ph',
    studentId: 'CPC-2024-0142',
    course: 'BS Information Technology',
    yearLevel: 2,
    role: 'user',
    password: 'Student123!',
  },
  {
    fullName: 'Maria Santos',
    email: 'maria.santos@cpc.edu.ph',
    studentId: 'CPC-2023-0291',
    course: 'BS Education',
    yearLevel: 3,
    role: 'user',
    password: 'Student123!',
  },
  {
    fullName: 'Kevin Reyes',
    email: 'kevin.reyes@cpc.edu.ph',
    studentId: 'CPC-2025-0388',
    course: 'BS Criminology',
    yearLevel: 1,
    role: 'user',
    password: 'Student123!',
  },
];

type SeedEvent = {
  title: string;
  description: string;
  category: string;
  organization: string;
  venue: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  registrationDeadline: Date;
  status: 'draft' | 'published' | 'cancelled';
  createdBy: number;
};

async function seed(): Promise<void> {
  // ---- Accounts ----
  let admin = await findUserByEmail('admin@cpc.edu.ph');

  for (const student of seedStudents) {
    const existing = await findUserByEmail(student.email);
    if (existing) {
      console.log(`Account already exists: ${student.email}`);
      if (student.email === 'admin@cpc.edu.ph') admin = existing;
      continue;
    }

    const passwordHash = await bcrypt.hash(student.password, 12);
    await db.insert(users).values({
      fullName: student.fullName,
      email: student.email,
      studentId: student.studentId,
      course: student.course,
      yearLevel: student.yearLevel,
      passwordHash,
      role: student.role,
    });
    console.log(`Created account: ${student.email}`);

    if (student.email === 'admin@cpc.edu.ph') {
      admin = await findUserByEmail(student.email);
    }
  }

  const adminId = admin!.id;

  // ---- Events (only when the table is empty) ----
  const [eventCount] = await db.select({ total: count() }).from(events);
  if (Number(eventCount.total) > 0) {
    console.log('Events already exist. Skipping sample events.');
  } else {
    const seedEvents: SeedEvent[] = [
      {
        title: 'CPC Foundation Day 2026',
        description:
          'The biggest day on the CPC calendar. Join the whole Cordova Public College community for a thanksgiving mass, a campus-wide parade, booths from every college, and the annual recognition of outstanding students and organizations.',
        category: 'Foundation Day',
        organization: 'CPC Student Council',
        venue: 'CPC Quadrangle',
        eventDate: daysFromNow(18, 8),
        startTime: '08:00',
        endTime: '17:00',
        capacity: 1200,
        registrationDeadline: daysFromNow(15, 23),
        status: 'published',
        createdBy: adminId,
      },
      {
        title: 'CPC Intramurals 2026: Opening & Parade',
        description:
          'Cheer for your college as CPC kicks off the annual intramurals. The morning features the team parade, torch lighting, the athlete oath, and the first basketball and volleyball matches of the season.',
        category: 'Sports',
        organization: 'CPC Sports and Wellness Office',
        venue: 'CPC Gymnasium',
        eventDate: daysFromNow(25, 7),
        startTime: '07:00',
        endTime: '12:00',
        capacity: 800,
        registrationDeadline: daysFromNow(22, 23),
        status: 'published',
        createdBy: adminId,
      },
      {
        title: 'CodeFest 2026: CPC Campus Hackathon',
        description:
          'A one-day hackathon for CPC students who love building things. Form a team, pick a campus problem, and ship a working prototype in eight hours. Mentors from the College of Computer Studies will guide teams throughout the day.',
        category: 'Academic',
        organization: 'College of Computer Studies',
        venue: 'CCS Computer Laboratory 2',
        eventDate: daysFromNow(12, 8),
        startTime: '08:00',
        endTime: '18:00',
        capacity: 120,
        registrationDeadline: daysFromNow(9, 23),
        status: 'published',
        createdBy: adminId,
      },
      {
        title: 'CPC Acquaintance Party: Neon Nights',
        description:
          'Meet fellow CPC students and welcome the newest batch with a night of music, games, and performances. Wear your brightest neon outfit and get ready for the glow-in-the-dark dance floor.',
        category: 'Cultural',
        organization: 'CPC Student Council',
        venue: 'CPC Open Grounds',
        eventDate: daysFromNow(8, 17),
        startTime: '17:00',
        endTime: '22:00',
        capacity: 600,
        registrationDeadline: daysFromNow(6, 23),
        status: 'published',
        createdBy: adminId,
      },
      {
        title: 'CPC Research Colloquium 2026',
        description:
          'Undergraduate researchers from every college present their studies before a panel of CPC faculty and invited guests. Come support your classmates and discover the research coming out of Cordova Public College.',
        category: 'Academic',
        organization: 'CPC Research Office',
        venue: 'CPC Auditorium',
        eventDate: daysFromNow(20, 13),
        startTime: '13:00',
        endTime: '17:00',
        capacity: 250,
        registrationDeadline: daysFromNow(17, 23),
        status: 'published',
        createdBy: adminId,
      },
      {
        title: 'Coastal Clean-Up: Cordova Shoreline',
        description:
          'Give back to the Cordova community. CPC volunteers will spend the morning cleaning the shoreline together with local barangay partners. Gloves, sacks, and refreshments will be provided by the Community Extension Office.',
        category: 'Community Outreach',
        organization: 'CPC Community Extension Office',
        venue: 'Cordova Coastal Area',
        eventDate: daysFromNow(30, 6),
        startTime: '06:00',
        endTime: '10:00',
        capacity: 150,
        registrationDeadline: daysFromNow(27, 23),
        status: 'published',
        createdBy: adminId,
      },
      {
        title: 'Faculty-Student Sports Clinic',
        description:
          'A draft event for a joint faculty and student sports clinic. Schedule and venue are still being finalized by the Sports and Wellness Office.',
        category: 'Sports',
        organization: 'CPC Sports and Wellness Office',
        venue: 'CPC Gymnasium',
        eventDate: daysFromNow(45, 8),
        startTime: '08:00',
        endTime: '12:00',
        capacity: 60,
        registrationDeadline: daysFromNow(42, 23),
        status: 'draft',
        createdBy: adminId,
      },
    ];

    await db.insert(events).values(seedEvents);
    console.log(`Inserted ${seedEvents.length} CPC events.`);
  }

  // ---- Registrations (only when empty) ----
  const [registrationCount] = await db
    .select({ total: count() })
    .from(registrations);
  if (Number(registrationCount.total) > 0) {
    console.log('Registrations already exist. Skipping sample registrations.');
  } else {
    const allEvents = await db.select().from(events);
    const byTitle = (title: string) =>
      allEvents.find((event) => event.title === title)?.id;

    const juan = await findUserByEmail('student@cpc.edu.ph');
    const maria = await findUserByEmail('maria.santos@cpc.edu.ph');
    const kevin = await findUserByEmail('kevin.reyes@cpc.edu.ph');

    const rows: { userId: number; eventId: number }[] = [];
    const add = (userId: number | undefined, title: string) => {
      const eventId = byTitle(title);
      if (userId && eventId) rows.push({ userId, eventId });
    };

    add(juan?.id, 'CPC Foundation Day 2026');
    add(juan?.id, 'CodeFest 2026: CPC Campus Hackathon');
    add(maria?.id, 'CPC Acquaintance Party: Neon Nights');
    add(maria?.id, 'CPC Research Colloquium 2026');
    add(kevin?.id, 'CPC Foundation Day 2026');
    add(kevin?.id, 'CPC Intramurals 2026: Opening & Parade');

    if (rows.length > 0) {
      await db.insert(registrations).values(rows);
      console.log(`Inserted ${rows.length} sample registrations.`);
    }
  }

  console.log('\n--- EventHub login credentials ---');
  console.log('Admin (Student Council): admin@cpc.edu.ph / Admin123!');
  console.log('Student:                 student@cpc.edu.ph / Student123!');
  console.log('Student:                 maria.santos@cpc.edu.ph / Student123!');
  console.log('Student:                 kevin.reyes@cpc.edu.ph / Student123!');
  console.log('\nAny valid email address can be used to sign in.');

  await pool.end();
}

seed().catch(async (error) => {
  console.error('Seeding failed:', error);
  await pool.end();
  process.exit(1);
});
