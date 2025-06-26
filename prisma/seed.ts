import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // Créer les catégories par défaut
  console.log('📂 Création des catégories...');
  const categories = await Promise.all([
    prisma.categorie.upsert({
      where: { nom: "Corruption" },
      update: {},
      create: {
        nom: "Corruption",
        description: "Signalements liés à la corruption",
        couleur: "#dc2626"
      }
    }),
    prisma.categorie.upsert({
      where: { nom: "Fraude" },
      update: {},
      create: {
        nom: "Fraude",
        description: "Signalements de fraude",
        couleur: "#ea580c"
      }
    }),
    prisma.categorie.upsert({
      where: { nom: "Abus de pouvoir" },
      update: {},
      create: {
        nom: "Abus de pouvoir",
        description: "Signalements d'abus de pouvoir",
        couleur: "#7c2d12"
      }
    }),
    prisma.categorie.upsert({
      where: { nom: "Détournement" },
      update: {},
      create: {
        nom: "Détournement",
        description: "Détournement de fonds publics",
        couleur: "#991b1b"
      }
    }),
    prisma.categorie.upsert({
      where: { nom: "Harcèlement" },
      update: {},
      create: {
        nom: "Harcèlement",
        description: "Harcèlement moral ou sexuel",
        couleur: "#7c2d12"
      }
    }),
    prisma.categorie.upsert({
      where: { nom: "Discrimination" },
      update: {},
      create: {
        nom: "Discrimination",
        description: "Actes discriminatoires",
        couleur: "#9333ea"
      }
    }),
    prisma.categorie.upsert({
      where: { nom: "Environnement" },
      update: {},
      create: {
        nom: "Environnement",
        description: "Violations environnementales",
        couleur: "#059669"
      }
    }),
    prisma.categorie.upsert({
      where: { nom: "Autre" },
      update: {},
      create: {
        nom: "Autre",
        description: "Autres types de signalements",
        couleur: "#6b7280"
      }
    })
  ]);

  // Créer les statuts par défaut
  console.log('📊 Création des statuts...');
  const statuts = await Promise.all([
    prisma.statut.upsert({
      where: { nom: "Non traité" },
      update: {},
      create: {
        nom: "Non traité",
        description: "Signalement reçu, en attente de traitement",
        couleur: "#6b7280",
        ordre: 1,
        estFinal: false
      }
    }),
    prisma.statut.upsert({
      where: { nom: "En cours d'examen" },
      update: {},
      create: {
        nom: "En cours d'examen",
        description: "Signalement en cours d'analyse",
        couleur: "#f59e0b",
        ordre: 2,
        estFinal: false
      }
    }),
    prisma.statut.upsert({
      where: { nom: "En enquête" },
      update: {},
      create: {
        nom: "En enquête",
        description: "Enquête en cours",
        couleur: "#3b82f6",
        ordre: 3,
        estFinal: false
      }
    }),
    prisma.statut.upsert({
      where: { nom: "Résolu" },
      update: {},
      create: {
        nom: "Résolu",
        description: "Signalement traité et résolu",
        couleur: "#10b981",
        ordre: 4,
        estFinal: true
      }
    }),
    prisma.statut.upsert({
      where: { nom: "Rejeté" },
      update: {},
      create: {
        nom: "Rejeté",
        description: "Signalement rejeté après examen",
        couleur: "#ef4444",
        ordre: 5,
        estFinal: true
      }
    }),
    prisma.statut.upsert({
      where: { nom: "Classé sans suite" },
      update: {},
      create: {
        nom: "Classé sans suite",
        description: "Signalement classé sans suite",
        couleur: "#6b7280",
        ordre: 6,
        estFinal: true
      }
    })
  ]);

  // Créer un super administrateur par défaut
  console.log('👤 Création des administrateurs...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.administrateur.upsert({
    where: { email: "admin@denonce.tg" },
    update: {},
    create: {
      email: "admin@denonce.tg",
      nom: "Super Administrateur",
      motDePasse: hashedPassword,
      role: "super_admin"
    }
  });

  // Créer un administrateur normal
  const hashedPasswordAdmin = await bcrypt.hash('admin456', 10);
  const admin = await prisma.administrateur.upsert({
    where: { email: "moderateur@denonce.tg" },
    update: {},
    create: {
      email: "moderateur@denonce.tg",
      nom: "Modérateur Principal",
      motDePasse: hashedPasswordAdmin,
      role: "admin"
    }
  });

  console.log('✅ Seeding terminé !');
  console.log(`📂 ${categories.length} catégories créées`);
  console.log(`📊 ${statuts.length} statuts créés`);
  console.log(`👤 Administrateurs créés:`);
  console.log(`   🔑 Super Admin: ${superAdmin.email} / admin123`);
  console.log(`   🔑 Admin: ${admin.email} / admin456`);
  console.log(`\n🚀 Vous pouvez maintenant démarrer l'API avec: bun run dev`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });