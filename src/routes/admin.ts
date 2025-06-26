import { Elysia, t } from 'elysia';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { generateToken, authMiddleware, requireSuperAdmin } from '../middleware/auth';

export const adminRoutes = new Elysia({ prefix: '/api/admin' })

  // 🔐 Authentification admin
  .post('/login', async ({ body, set }) => {
    const { email, motDePasse } = body;

    const admin = await prisma.administrateur.findUnique({
      where: { email, actif: true }
    });

    if (!admin || !await bcrypt.compare(motDePasse, admin.motDePasse)) {
      set.status = 401;
      return { error: "Identifiants invalides" };
    }

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: admin.role
    });

    return {
      message: "Connexion réussie",
      token,
      admin: {
        id: admin.id,
        nom: admin.nom,
        email: admin.email,
        role: admin.role
      }
    };
  }, {
    body: t.Object({
      email: t.String(),
      motDePasse: t.String(),
    }),
    response: {
      200: t.Object({
        message: t.String(),
        token: t.String(),
        admin: t.Object({
          id: t.String(),
          nom: t.String(),
          email: t.String(),
          role: t.String(),
        }),
      }),
      401: t.Object({
        error: t.String(),
      }),
    },
    detail: {
      tags: ['Admin'],
      summary: "Connexion administrateur",
    }
  })

  // 🔒 Middleware pour toutes les routes protégées
  .derive(async ({ headers, set, request }) => {
    // Exclure la route de login
    if (request.url.endsWith('/login')) {
      return {};
    }

    try {
      const auth = await authMiddleware(headers.authorization);
      return { currentAdmin: auth.admin, payload: auth.payload };
    } catch (error: any) {
      set.status = 401;
      throw new Error(error.message);
    }
  })

  // 📂 Gestion des catégories - Lister toutes (PROTÉGÉ)
  .get('/categories', async ({ currentAdmin }) => {
    if (!currentAdmin) {
      throw new Error('Non autorisé');
    }

    return await prisma.categorie.findMany({
      include: {
        _count: {
          select: { signalements: true }
        }
      },
      orderBy: { nom: 'asc' }
    });
  }, {
    response: {
      200: t.Array(t.Object({
        id: t.String(),
        nom: t.String(),
        description: t.Union([t.String(), t.Null()]),
        couleur: t.Union([t.String(), t.Null()]),
        active: t.Boolean(),
        createdAt: t.Date(),
        _count: t.Object({
          signalements: t.Number(),
        }),
      })),
      401: t.Object({
        error: t.String(),
      }),
    },
    detail: {
      tags: ['Admin - Catégories'],
      summary: "Lister toutes les catégories (admin)",
      security: [{ bearerAuth: [] }]
    }
  })

  // 📂 Créer une nouvelle catégorie (PROTÉGÉ - SUPER ADMIN SEULEMENT)
  .post('/categories', async ({ body, set, currentAdmin, payload }) => {
    if (!currentAdmin || !payload) {
      set.status = 401;
      return { error: 'Non autorisé' };
    }

    try {
      requireSuperAdmin(payload.role);
    } catch (error: any) {
      set.status = 403;
      return { error: error.message };
    }

    const { nom, description, couleur } = body;

    try {
      const categorie = await prisma.categorie.create({
        data: {
          nom,
          description,
          couleur,
        },
      });

      return categorie;
    } catch (error: any) {
      if (error.code === 'P2002') {
        set.status = 400;
        return { error: "Une catégorie avec ce nom existe déjà" };
      }
      set.status = 500;
      return { error: "Erreur lors de la création de la catégorie" };
    }
  }, {
    body: t.Object({
      nom: t.String(),
      description: t.Optional(t.String()),
      couleur: t.Optional(t.String()),
    }),
    response: {
      200: t.Object({
        id: t.String(),
        nom: t.String(),
        description: t.Union([t.String(), t.Null()]),
        couleur: t.Union([t.String(), t.Null()]),
        active: t.Boolean(),
        createdAt: t.Date(),
      }),
      400: t.Object({
        error: t.String(),
      }),
      401: t.Object({
        error: t.String(),
      }),
      403: t.Object({
        error: t.String(),
      }),
      500: t.Object({
        error: t.String(),
      }),
    },
    detail: {
      tags: ['Admin - Catégories'],
      summary: "Créer une nouvelle catégorie (Super Admin)",
      security: [{ bearerAuth: [] }]
    }
  })

  // 📂 Modifier une catégorie (PROTÉGÉ - SUPER ADMIN)
  .patch('/categories/:id', async ({ params, body, set, currentAdmin, payload }) => {
    if (!currentAdmin || !payload) {
      set.status = 401;
      return { error: 'Non autorisé' };
    }

    try {
      requireSuperAdmin(payload.role);
    } catch (error: any) {
      set.status = 403;
      return { error: error.message };
    }

    const { id } = params;
    const { nom, description, couleur, active } = body;

    try {
      const categorie = await prisma.categorie.update({
        where: { id },
        data: {
          ...(nom && { nom }),
          ...(description !== undefined && { description }),
          ...(couleur !== undefined && { couleur }),
          ...(active !== undefined && { active }),
        },
      });

      return categorie;
    } catch (error: any) {
      if (error.code === 'P2025') {
        set.status = 404;
        return { error: "Catégorie introuvable" };
      }
      if (error.code === 'P2002') {
        set.status = 400;
        return { error: "Une catégorie avec ce nom existe déjà" };
      }
      set.status = 500;
      return { error: "Erreur lors de la modification" };
    }
  }, {
    body: t.Object({
      nom: t.Optional(t.String()),
      description: t.Optional(t.String()),
      couleur: t.Optional(t.String()),
      active: t.Optional(t.Boolean()),
    }),
    detail: {
      tags: ['Admin - Catégories'],
      summary: "Modifier une catégorie (Super Admin)",
      security: [{ bearerAuth: [] }]
    }
  })

  // 📊 Gestion des statuts - Lister tous (PROTÉGÉ)
  .get('/statuts', async ({ currentAdmin }) => {
    if (!currentAdmin) {
      throw new Error('Non autorisé');
    }

    return await prisma.statut.findMany({
      include: {
        _count: {
          select: { signalements: true }
        }
      },
      orderBy: { ordre: 'asc' }
    });
  }, {
    response: t.Array(t.Object({
      id: t.String(),
      nom: t.String(),
      description: t.Union([t.String(), t.Null()]),
      couleur: t.Union([t.String(), t.Null()]),
      ordre: t.Number(),
      estFinal: t.Boolean(),
      createdAt: t.Date(),
      _count: t.Object({
        signalements: t.Number(),
      }),
    })),
    detail: {
      tags: ['Admin - Statuts'],
      summary: "Lister tous les statuts",
      security: [{ bearerAuth: [] }]
    }
  })

  // 📊 Créer un nouveau statut (PROTÉGÉ - SUPER ADMIN)
  .post('/statuts', async ({ body, set, currentAdmin, payload }) => {
    if (!currentAdmin || !payload) {
      set.status = 401;
      return { error: 'Non autorisé' };
    }

    try {
      requireSuperAdmin(payload.role);
    } catch (error: any) {
      set.status = 403;
      return { error: error.message };
    }

    const { nom, description, couleur, ordre, estFinal } = body;

    try {
      const statut = await prisma.statut.create({
        data: {
          nom,
          description,
          couleur,
          ordre: ordre || 0,
          estFinal: estFinal || false,
        },
      });

      return statut;
    } catch (error: any) {
      if (error.code === 'P2002') {
        set.status = 400;
        return { error: "Un statut avec ce nom existe déjà" };
      }
      set.status = 500;
      return { error: "Erreur lors de la création du statut" };
    }
  }, {
    body: t.Object({
      nom: t.String(),
      description: t.Optional(t.String()),
      couleur: t.Optional(t.String()),
      ordre: t.Optional(t.Number()),
      estFinal: t.Optional(t.Boolean()),
    }),
    detail: {
      tags: ['Admin - Statuts'],
      summary: "Créer un nouveau statut (Super Admin)",
      security: [{ bearerAuth: [] }]
    }
  })

  // 🔄 Changer le statut d'un signalement (PROTÉGÉ)
  .patch('/signalements/:id/statut', async ({ params, body, set, currentAdmin, payload }) => {
    if (!currentAdmin || !payload) {
      set.status = 401;
      return { error: 'Non autorisé' };
    }

    const { id } = params;
    const { nouveauStatutId, commentaire } = body;

    try {
      // Vérifier que le signalement existe
      const signalement = await prisma.signalement.findUnique({
        where: { id },
        include: { statut: true }
      });

      if (!signalement) {
        set.status = 404;
        return { error: "Signalement introuvable" };
      }

      // Vérifier que le nouveau statut existe
      const nouveauStatut = await prisma.statut.findUnique({
        where: { id: nouveauStatutId }
      });

      if (!nouveauStatut) {
        set.status = 400;
        return { error: "Statut invalide" };
      }

      // Transaction pour mettre à jour le statut et créer l'historique
      const result = await prisma.$transaction(async (tx) => {
        // Créer l'historique avec l'admin connecté
        await tx.historiqueStatut.create({
          data: {
            signalementId: id,
            ancienStatutId: signalement.statutId,
            nouveauStatutId,
            adminId: currentAdmin.id,
            commentaire,
          }
        });

        // Mettre à jour le signalement
        return await tx.signalement.update({
          where: { id },
          data: { statutId: nouveauStatutId },
          include: {
            statut: true,
            categorie: true,
          }
        });
      });

      return {
        message: "Statut mis à jour avec succès",
        signalement: result,
        updatedBy: {
          nom: currentAdmin.nom,
          email: currentAdmin.email
        }
      };

    } catch (error: any) {
      console.error('Erreur changement statut:', error);
      set.status = 500;
      return { error: "Erreur lors du changement de statut" };
    }
  }, {
    body: t.Object({
      nouveauStatutId: t.String(),
      commentaire: t.Optional(t.String()),
    }),
    response: {
      200: t.Object({
        message: t.String(),
        signalement: t.Object({
          id: t.String(),
          titre: t.String(),
          statutId: t.String(),
        }),
        updatedBy: t.Object({
          nom: t.String(),
          email: t.String(),
        }),
      }),
      400: t.Object({
        error: t.String(),
      }),
      401: t.Object({
        error: t.String(),
      }),
      404: t.Object({
        error: t.String(),
      }),
      500: t.Object({
        error: t.String(),
      }),
    },
    detail: {
      tags: ['Admin - Signalements'],
      summary: "Changer le statut d'un signalement",
      security: [{ bearerAuth: [] }]
    }
  })

  // 📊 Dashboard - Statistiques (PROTÉGÉ)
  .get('/dashboard', async ({ currentAdmin }) => {
    if (!currentAdmin) {
      throw new Error('Non autorisé');
    }

    const [
      totalSignalements,
      signalementsByStatut,
      signalementsByCategorie,
      recentSignalements
    ] = await Promise.all([
      prisma.signalement.count(),
      
      prisma.signalement.groupBy({
        by: ['statutId'],
        _count: { id: true },
      }),

      prisma.signalement.groupBy({
        by: ['categorieId'],
        _count: { id: true },
      }),

      prisma.signalement.findMany({
        take: 10,
        include: {
          categorie: { select: { nom: true, couleur: true } },
          statut: { select: { nom: true, couleur: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      totalSignalements,
      signalementsByStatut,
      signalementsByCategorie,
      recentSignalements,
      adminInfo: {
        nom: currentAdmin.nom,
        role: currentAdmin.role
      }
    };
  }, {
    detail: {
      tags: ['Admin - Dashboard'],
      summary: "Statistiques du dashboard admin",
      security: [{ bearerAuth: [] }]
    }
  })

  // 📋 Lister tous les signalements (PROTÉGÉ)
  .get('/signalements', async ({ query, currentAdmin }) => {
    if (!currentAdmin) {
      throw new Error('Non autorisé');
    }

    const { page = '1', limit = '20', statut, categorie } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (statut) where.statutId = statut;
    if (categorie) where.categorieId = categorie;

    const [signalements, total] = await Promise.all([
      prisma.signalement.findMany({
        where,
        include: {
          categorie: true,
          statut: true,
          _count: {
            select: { commentaires: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.signalement.count({ where })
    ]);

    return {
      signalements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }, {
    detail: {
      tags: ['Admin - Signalements'],
      summary: "Lister tous les signalements avec pagination",
      security: [{ bearerAuth: [] }]
    }
  })

  // 📄 Détails d'un signalement (PROTÉGÉ)
  .get('/signalements/:id', async ({ params, set, currentAdmin }) => {
    if (!currentAdmin) {
      set.status = 401;
      return { error: 'Non autorisé' };
    }

    const { id } = params;

    const signalement = await prisma.signalement.findUnique({
      where: { id },
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

    if (!signalement) {
      set.status = 404;
      return { error: "Signalement introuvable" };
    }

    return signalement;
  }, {
    detail: {
      tags: ['Admin - Signalements'],
      summary: "Détails complets d'un signalement",
      security: [{ bearerAuth: [] }]
    }
  })

  // 🔓 Route de test du token
  .get('/me', async ({ currentAdmin }) => {
    if (!currentAdmin) {
      throw new Error('Non autorisé');
    }

    return {
      admin: {
        id: currentAdmin.id,
        nom: currentAdmin.nom,
        email: currentAdmin.email,
        role: currentAdmin.role,
        actif: currentAdmin.actif
      }
    };
  }, {
    detail: {
      tags: ['Admin'],
      summary: "Informations de l'admin connecté",
      security: [{ bearerAuth: [] }]
    }
  })

  // 👥 Gestion des administrateurs (PROTÉGÉ - SUPER ADMIN SEULEMENT)
  .get('/administrateurs', async ({ currentAdmin, payload, set }) => {
    if (!currentAdmin || !payload) {
      set.status = 401;
      return { error: 'Non autorisé' };
    }

    try {
      requireSuperAdmin(payload.role);
    } catch (error: any) {
      set.status = 403;
      return { error: error.message };
    }

    return await prisma.administrateur.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        role: true,
        actif: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }, {
    detail: {
      tags: ['Admin - Utilisateurs'],
      summary: "Lister tous les administrateurs (Super Admin)",
      security: [{ bearerAuth: [] }]
    }
  })

  // 👤 Créer un nouvel administrateur (PROTÉGÉ - SUPER ADMIN)
  .post('/administrateurs', async ({ body, set, currentAdmin, payload }) => {
    if (!currentAdmin || !payload) {
      set.status = 401;
      return { error: 'Non autorisé' };
    }

    try {
      requireSuperAdmin(payload.role);
    } catch (error: any) {
      set.status = 403;
      return { error: error.message };
    }

    const { email, nom, motDePasse, role } = body;

    try {
      const hashedPassword = await bcrypt.hash(motDePasse, 10);
      
      const admin = await prisma.administrateur.create({
        data: {
          email,
          nom,
          motDePasse: hashedPassword,
          role: role || 'admin',
        },
        select: {
          id: true,
          email: true,
          nom: true,
          role: true,
          actif: true,
          createdAt: true,
        }
      });

      return admin;
    } catch (error: any) {
      if (error.code === 'P2002') {
        set.status = 400;
        return { error: "Un administrateur avec cet email existe déjà" };
      }
      set.status = 500;
      return { error: "Erreur lors de la création de l'administrateur" };
    }
  }, {
    body: t.Object({
      email: t.String(),
      nom: t.String(),
      motDePasse: t.String(),
      role: t.Optional(t.String()),
    })
  });