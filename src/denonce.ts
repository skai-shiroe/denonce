import { Elysia, t } from 'elysia';
import { randomUUIDv7 } from 'bun';
import { prisma } from './lib/prisma';

export const declarationRoutes = new Elysia({ prefix: '/api/declarations' })

  // 📥 Créer une déclaration anonyme
.post('/', async ({ body, set }) => {
  const { titre, description, categorie, lieu, mediaUrl } = body;

  if (!titre || !description || !categorie) {
    set.status = 400;
    return { error: "Les champs titre, description et catégorie sont requis." };
  }

  // Génération d'un code de suivi aléatoire court
  const codeSuivi = randomUUIDv7().split('-')[0];

  const newDeclaration = await prisma.signalement.create({
    data: {
      titre,
      description,
      categorie,
      lieu,
      mediaUrl,
      codeSuivi,
    },
  });

  return newDeclaration;
}, {
  body: t.Object({
    titre: t.String(),
    description: t.String(),
    categorie: t.String(),
    lieu: t.Optional(t.String()),
    mediaUrl: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      id: t.String(),
      titre: t.String(),
      description: t.String(),
      categorie: t.String(),
      lieu: t.Union([t.String(), t.Null()]),
      mediaUrl: t.Union([t.String(), t.Null()]),
      statut: t.String(),
      votes: t.Number(),
      createdAt: t.Date(),
      codeSuivi: t.String(),
    }),
    400: t.Object({
      error: t.String(),
    }),
  },
  detail: {
    tags: ["Signalements"],
    summary: "Créer un nouveau signalement anonyme",
  }
})

  // 📄 Lister toutes les déclarations
  .get('/', async () => {
    return await prisma.signalement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }, {
    response: t.Array(t.Object({
      id: t.String(),
      titre: t.String(),
      description: t.String(),
      categorie: t.String(),
      lieu: t.Union([t.String(), t.Null()]),
      mediaUrl: t.Union([t.String(), t.Null()]),
      statut: t.String(),
      votes: t.Number(),
      createdAt: t.Date(),
      codeSuivi: t.String(),
    })),
    detail: {
      tags: ["Signalements"],
      summary: "Lister tous les signalements publics",
    }
  })

    // 📄 Obtenir une vote 

  .post('/:id/vote', async ({ params, set }) => {
  const { id } = params;

  const declaration = await prisma.signalement.findUnique({ where: { id } });
  if (!declaration) {
    set.status = 404;
    return { error: "Signalement introuvable" };
  }

  await prisma.signalement.update({
    where: { id },
    data: {
      votes: { increment: 1 },
    },
  });

  return { message: "Vote enregistré" };
}, {
  response: {
    200: t.Object({
      message: t.String(),
    }),
    404: t.Object({
      error: t.String(),
    }),
  },
  detail: {
    tags: ['Signalements'],
    summary: "Voter anonymement pour un signalement",
  }
})

// ajouter un commentaire anonyme
.post('/:id/commentaires', async ({ params, body, set }) => {
  const { message } = body;
  const { id } = params;

  if (!message) {
    set.status = 400;
    return { error: "Message requis" };
  }

  const signalement = await prisma.signalement.findUnique({ where: { id } });
  if (!signalement) {
    set.status = 404;
    return { error: "Signalement introuvable" };
  }

  const commentaire = await prisma.commentaire.create({
    data: {
      message,
      signalementId: id,
    },
  });

  return commentaire;
}, {
  body: t.Object({
    message: t.String(),
  }),
  response: {
    200: t.Object({
      id: t.String(),
      message: t.String(),
      signalementId: t.String(),
      createdAt: t.Date(),
    }),
    400: t.Object({
      error: t.String(),
    }),
    404: t.Object({
      error: t.String(),
    }),
  },
  detail: {
    tags: ['Commentaires'],
    summary: "Ajouter un commentaire anonyme à un signalement",
  }
})

//voir les commentaires d'un signalement
.get('/:id/commentaires', async ({ params, set }) => {
  const { id } = params;

  const commentaires = await prisma.commentaire.findMany({
    where: { signalementId: id },
    orderBy: { createdAt: 'asc' }
  });

  return commentaires;
}, {
  response: t.Array(t.Object({
    id: t.String(),
    message: t.String(),
    signalementId: t.String(),
    createdAt: t.Date(),
  })),
  detail: {
    tags: ['Commentaires'],
    summary: "Voir les commentaires associés à un signalement"
  }
})

// Ajoutez cette route pour permettre le suivi par code
.get('/suivi/:codeSuivi', async ({ params, set }) => {
  const { codeSuivi } = params;

  const declaration = await prisma.signalement.findUnique({
    where: { codeSuivi },
    include: {
      commentaires: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!declaration) {
    set.status = 404;
    return { error: "Aucune déclaration trouvée avec ce code de suivi" };
  }

  return declaration;
}, {
  response: {
    200: t.Object({
      id: t.String(),
      titre: t.String(),
      description: t.String(),
      categorie: t.String(),
      lieu: t.Union([t.String(), t.Null()]),
      mediaUrl: t.Union([t.String(), t.Null()]),
      statut: t.String(),
      votes: t.Number(),
      createdAt: t.Date(),
      codeSuivi: t.String(),
      commentaires: t.Array(t.Object({
        id: t.String(),
        message: t.String(),
        signalementId: t.String(),
        createdAt: t.Date(),
      }))
    }),
    404: t.Object({
      error: t.String(),
    }),
  },
  detail: {
    tags: ['Signalements'],
    summary: "Suivre une déclaration avec son code de suivi",
  }
})

// Optionnel : Route pour vérifier juste le statut
.get('/statut/:codeSuivi', async ({ params, set }) => {
  const { codeSuivi } = params;

  const declaration = await prisma.signalement.findUnique({
    where: { codeSuivi },
    select: {
      codeSuivi: true,
      titre: true,
      statut: true,
      votes: true,
      createdAt: true,
    }
  });

  if (!declaration) {
    set.status = 404;
    return { error: "Code de suivi invalide" };
  }

  return declaration;
}, {
  response: {
    200: t.Object({
      codeSuivi: t.String(),
      titre: t.String(),
      statut: t.String(),
      votes: t.Number(),
      createdAt: t.Date(),
    }),
    404: t.Object({
      error: t.String(),
    }),
  },
  detail: {
    tags: ['Signalements'],
    summary: "Vérifier le statut d'une déclaration",
  }
})
