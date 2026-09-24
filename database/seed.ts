/**
 * Database seed — SHIBMATS schools & programmes (confirmed catalog).
 * Run with: npx ts-node -r tsconfig-paths/register src/database/seed.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { SchoolEntity } from './entities/school.entity';
import { ProgrammeEntity } from './entities/programme.entity';

// try repo root relative to apps/api/ (cwd) or dist
dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../../.env' }); // fallback if cwd is deeper

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [SchoolEntity, ProgrammeEntity],
  synchronize: true,
});

const SCHOOLS: {
  name: string;
  code: string;
  programmes: { name: string; code: string; degreeTypes: string[] }[];
}[] = [
  {
    name: 'School of Health Sciences',
    code: 'HSC',
    programmes: [
      { name: 'Nursing', code: 'HSC-NRS', degreeTypes: ['HND', 'BSc'] },
      { name: 'Midwifery', code: 'HSC-MID', degreeTypes: ['HND', 'BSc'] },
      { name: 'Medical Laboratory', code: 'HSC-MLT', degreeTypes: ['HND', 'BSc'] },
      { name: 'Physiotherapy', code: 'HSC-PHY', degreeTypes: ['HND', 'BSc'] },
      { name: 'Pharmaceutical Sciences', code: 'HSC-PHA', degreeTypes: ['HND', 'BSc'] },
    ],
  },
  {
    name: 'School of Engineering & Technology',
    code: 'ENG',
    programmes: [
      { name: 'Software Engineering', code: 'ENG-SWE', degreeTypes: ['HND', 'BSc', 'BTech'] },
      { name: 'Network and Security', code: 'ENG-NET', degreeTypes: ['HND', 'BSc', 'BTech'] },
      { name: 'Computer Engineering', code: 'ENG-CPE', degreeTypes: ['HND', 'BSc', 'BTech'] },
      { name: 'Database Management', code: 'ENG-DBM', degreeTypes: ['HND', 'BSc', 'BTech'] },
      { name: 'Computer Graphics & Web Design', code: 'ENG-CGW', degreeTypes: ['HND', 'BSc', 'BTech'] },
    ],
  },
  {
    name: 'School of Business & Management Sciences',
    code: 'BMS',
    programmes: [
      { name: 'Accountancy', code: 'BMS-ACC', degreeTypes: ['HND', 'BSc', 'BTech'] },
      { name: 'Project Management', code: 'BMS-PMT', degreeTypes: ['HND', 'BSc', 'BTech'] },
      { name: 'Banking and Finance', code: 'BMS-BNF', degreeTypes: ['HND', 'BSc', 'BTech'] },
      { name: 'Human Resource Management', code: 'BMS-HRM', degreeTypes: ['HND', 'BSc', 'BTech'] },
      { name: 'Logistic and Transport', code: 'BMS-LGT', degreeTypes: ['HND', 'BSc', 'BTech'] },
      { name: 'Insurance', code: 'BMS-INS', degreeTypes: ['HND', 'BSc', 'BTech'] },
    ],
  },
  {
    name: 'School of Law',
    code: 'LAW',
    programmes: [
      { name: 'Legal Assistance', code: 'LAW-LEG', degreeTypes: ['HND', 'LLB'] },
      { name: 'Custom and Transit', code: 'LAW-CTR', degreeTypes: ['HND', 'LLB'] },
      { name: 'Business Law', code: 'LAW-BLW', degreeTypes: ['HND', 'LLB'] },
    ],
  },
  {
    name: 'School of Education',
    code: 'EDU',
    programmes: [
      { name: 'Educational Management & Administration', code: 'EDU-EMA', degreeTypes: ['HND', 'BSc'] },
      { name: 'Didactics, Curriculum Development & Teaching', code: 'EDU-DCT', degreeTypes: ['HND', 'BSc'] },
      { name: 'Special Education & Inclusive Education', code: 'EDU-SIE', degreeTypes: ['HND', 'BSc'] },
    ],
  },
  {
    name: 'School of Home Economics & Hospitality Management',
    code: 'HEH',
    programmes: [
      { name: 'Social Work', code: 'HEH-SOW', degreeTypes: ['HND', 'BSc'] },
      { name: 'Tourism & Travel Agency Management', code: 'HEH-TTM', degreeTypes: ['HND', 'BSc'] },
      { name: 'Hotel Management & Catering', code: 'HEH-HMC', degreeTypes: ['HND', 'BSc'] },
      { name: 'Bakery & Food Processing', code: 'HEH-BFP', degreeTypes: ['HND', 'BSc'] },
    ],
  },
  {
    name: 'School of Agricultural Sciences',
    code: 'AGR',
    programmes: [
      // Programmes TBC — school listed in flyer, not yet detailed
    ],
  },
];

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  const schoolRepo = AppDataSource.getRepository(SchoolEntity);
  const progRepo = AppDataSource.getRepository(ProgrammeEntity);

  for (const schoolData of SCHOOLS) {
    let school = await schoolRepo.findOne({ where: { code: schoolData.code } });
    if (!school) {
      school = schoolRepo.create({ name: schoolData.name, code: schoolData.code });
      await schoolRepo.save(school);
      console.log(`Created school: ${school.name}`);
    }

    for (const { name, code, degreeTypes } of schoolData.programmes) {
      for (const degreeType of degreeTypes) {
        const progCode = `${code}-${degreeType}`;
        const existing = await progRepo.findOne({ where: { code: progCode } });
        if (!existing) {
          await progRepo.save(
            progRepo.create({ schoolId: school.id, name, code: progCode, degreeType }),
          );
          console.log(`  + ${degreeType} ${name}`);
        }
      }
    }
  }

  console.log('\nSeed complete.');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
