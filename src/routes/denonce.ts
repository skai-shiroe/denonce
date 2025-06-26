import { Elysia, t } from 'elysia';
import { randomUUIDv7 } from 'bun';
import { prisma } from '../lib/prisma';

export const declarationRoutes = new Elysia({ prefix: '/api/declarations' })

  // 📥 Créer une déclaration anonyme
  .post('/', async ({ body, set }) => {
    const { titre, description, categorieId, lieu, mediaUrl } = body;

    if (!titre || !description || !categorieId) {
      set.status = 400;
      return { error: "Les champs titre, description et categorieId sont requis." };
    }

    // Vérifier que la catégorie existe et est active
    const categorie = await prisma.categorie.findFirst({
      where: { id: categorieId, active: true }
    });

    if (!categorie) {
      set.status = 400;
      return { error: "Catégorie invalide ou inactive." };
    }

    // Récupérer le statut par défaut "Non traité"
    const statutDefaut = await prisma.statut.findFirst({
      where: { nom: "Non traité" }
    });

    if (!statutDefaut) {
      set.status = 500;
      return { error: "Statut par défaut introuvable. Contactez l'administrateur." };
    }

    // ✅ CORRECTION : Génération de code de suivi plus robuste
    let codeSuivi;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      // Générer un code plus unique
      codeSuivi = `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
      attempts++;
      
      // Vérifier si le code existe déjà
      const existing = await prisma.signalement.findUnique({
        where: { codeSuivi }
      });
      
      if (!existing) break; // Code unique trouvé
      
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      set.status = 500;
      return { error: "Impossible de générer un code de suivi unique. Réessayez." };
    }

    try {
      const newDeclaration = await prisma.signalement.create({
        data: {
          titre,
          description,
          categorieId,
          statutId: statutDefaut.id,
          lieu,
          mediaUrl,
          codeSuivi,
        },
        include: {
          categorie: true,
          statut: true,
        }
      });

      return newDeclaration;
    } catch (error: any) {
      console.error('Erreur création signalement:', error);
      set.status = 500;
      return { error: "Erreur lors de la création du signalement." };
    }
  }, {
    body: t.Object({
      titre: t.String(),
      description: t.String(),
      categorieId: t.String(),
      lieu: t.Optional(t.String()),
      mediaUrl: t.Optional(t.String()),
    }),
    response: {
      200: t.Object({
        id: t.String(),
        titre: t.String(),
        description: t.String(),
        categorieId: t.String(),
        statutId: t.String(),
        lieu: t.Union([t.String(), t.Null()]),
        mediaUrl: t.Union([t.String(), t.Null()]),
        votes: t.Number(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
        codeSuivi: t.String(),
        categorie: t.Object({
          id: t.String(),
          nom: t.String(),
          description: t.Union([t.String(), t.Null()]),
          couleur: t.Union([t.String(), t.Null()]),
        }),
        statut: t.Object({
          id: t.String(),
          nom: t.String(),
          description: t.Union([t.String(), t.Null()]),
          couleur: t.Union([t.String(), t.Null()]),
        }),
      }),
      400: t.Object({
        error: t.String(),
      }),
      500: t.Object({
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
      include: {
        categorie: true,
        statut: true,
        _count: {
          select: { commentaires: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }, {
    response: t.Array(t.Object({
      id: t.String(),
      titre: t.String(),
      description: t.String(),
      categorieId: t.String(),
      statutId: t.String(),
      lieu: t.Union([t.String(), t.Null()]),
      mediaUrl: t.Union([t.String(), t.Null()]),
      votes: t.Number(),
      createdAt: t.Date(),
      updatedAt: t.Date(),
      codeSuivi: t.String(),
      categorie: t.Object({
        id: t.String(),
        nom: t.String(),
        description: t.Union([t.String(), t.Null()]),
        couleur: t.Union([t.String(), t.Null()]),
      }),
      statut: t.Object({
        id: t.String(),
        nom: t.String(),
        description: t.Union([t.String(), t.Null()]),
        couleur: t.Union([t.String(), t.Null()]),
      }),
      _count: t.Object({
        commentaires: t.Number(),
      }),
    })),
    detail: {
      tags: ["Signalements"],
      summary: "Lister tous les signalements publics",
    }
  })

  // 📄 Voter pour un signalement
  .post('/:id/vote', async ({ params, set }) => {
    const { id } = params;

    const declaration = await prisma.signalement.findUnique({ where: { id } });
    if (!declaration) {
      set.status = 404;
      return { error: "Signalement introuvable" };
    }

    const updated = await prisma.signalement.update({
      where: { id },
      data: {
        votes: { increment: 1 },
      },
    });

    return { message: "Vote enregistré", votes: updated.votes };
  }, {
    response: {
      200: t.Object({
        message: t.String(),
        votes: t.Number(),
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

  // 💬 Ajouter un commentaire anonyme
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

  // 💬 Voir les commentaires d'un signalement
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

  // 🔍 Suivre une déclaration par code de suivi
  .get('/suivi/:codeSuivi', async ({ params, set }) => {
    const { codeSuivi } = params;

    const declaration = await prisma.signalement.findUnique({
      where: { codeSuivi },
      include: {
        categorie: true,
        statut: true,
        commentaires: {
          orderBy: { createdAt: 'asc' }
        },
        historiqueStatuts: {
          include: {
            ancienStatut: true,
            nouveauStatut: true,
            administrateur: {
              select: { nom: true, email: true }
            }
          },
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
        categorieId: t.String(),
        statutId: t.String(),
        lieu: t.Union([t.String(), t.Null()]),
        mediaUrl: t.Union([t.String(), t.Null()]),
        votes: t.Number(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
        codeSuivi: t.String(),
        categorie: t.Object({
          id: t.String(),
          nom: t.String(),
          description: t.Union([t.String(), t.Null()]),
          couleur: t.Union([t.String(), t.Null()]),
        }),
        statut: t.Object({
          id: t.String(),
          nom: t.String(),
          description: t.Union([t.String(), t.Null()]),
          couleur: t.Union([t.String(), t.Null()]),
        }),
        commentaires: t.Array(t.Object({
          id: t.String(),
          message: t.String(),
          signalementId: t.String(),
          createdAt: t.Date(),
        })),
        historiqueStatuts: t.Array(t.Object({
          id: t.String(),
          commentaire: t.Union([t.String(), t.Null()]),
          createdAt: t.Date(),
          ancienStatut: t.Union([t.Object({
            id: t.String(),
            nom: t.String(),
          }), t.Null()]),
          nouveauStatut: t.Object({
            id: t.String(),
            nom: t.String(),
          }),
          administrateur: t.Object({
            nom: t.String(),
            email: t.String(),
          }),
        })),
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

  // 📊 Vérifier le statut d'une déclaration
  .get('/statut/:codeSuivi', async ({ params, set }) => {
    const { codeSuivi } = params;

    const declaration = await prisma.signalement.findUnique({
      where: { codeSuivi },
      select: {
        codeSuivi: true,
        titre: true,
        votes: true,
        createdAt: true,
        updatedAt: true,
        statut: {
          select: {
            nom: true,
            description: true,
            couleur: true,
            estFinal: true,
          }
        }
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
        votes: t.Number(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
        statut: t.Object({
          nom: t.String(),
          description: t.Union([t.String(), t.Null()]),
          couleur: t.Union([t.String(), t.Null()]),
          estFinal: t.Boolean(),
        }),
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

  // 📂 Lister les catégories disponibles
  .get('/categories', async () => {
    return await prisma.categorie.findMany({
      where: { active: true },
      orderBy: { nom: 'asc' }
    });
  }, {
    response: t.Array(t.Object({
      id: t.String(),
      nom: t.String(),
      description: t.Union([t.String(), t.Null()]),
      couleur: t.Union([t.String(), t.Null()]),
    })),
    detail: {
      tags: ['Catégories'],
      summary: "Lister les catégories disponibles pour les signalements",
    }
  })
