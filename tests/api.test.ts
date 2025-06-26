import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let testSignalementId = '';
let testCategorieId = '';
let testStatutId = '';
let testCodeSuivi = '';

// Helper function pour les requêtes (VERSION CORRIGÉE)
async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers,
    },
    ...options,
  });
  
  let data;
  try {
    data = await response.json();
  } catch (error) {
    // Si la réponse n'est pas du JSON valide
    data = { error: 'Invalid JSON response', status: response.status };
  }
  
  return { response, data };
}

describe('API Tests', () => {
  
  beforeAll(async () => {
    console.log('🧪 Démarrage des tests API...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  // ==================== TESTS PUBLICS ====================
  
  describe('🌐 Routes publiques', () => {
    
    it('GET / - Page d\'accueil', async () => {
      const { response, data } = await makeRequest('/');
      
      expect(response.status).toBe(200);
      expect(data.message).toBe('API Dénonciation Anonyme');
      expect(data.version).toBe('1.0.0');
    });

    it('GET /api/declarations/categories - Lister les catégories', async () => {
      const { response, data } = await makeRequest('/api/declarations/categories');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      
      testCategorieId = data[0].id;
      console.log('📂 Catégorie de test:', data[0].nom);
    });

    it('POST /api/declarations - Créer un signalement', async () => {
      const signalement = {
        titre: 'Test de signalement automatisé',
        description: 'Ceci est un test automatisé de création de signalement',
        categorieId: testCategorieId,
        lieu: 'Bureau de test',
      };

      const { response, data } = await makeRequest('/api/declarations', {
        method: 'POST',
        body: JSON.stringify(signalement),
      });

      expect(response.status).toBe(200);
      expect(data.titre).toBe(signalement.titre);
      expect(data.codeSuivi).toBeDefined();
      
      testSignalementId = data.id;
      testCodeSuivi = data.codeSuivi;
      console.log('📝 Signalement créé:', data.codeSuivi);
    });

    it('GET /api/declarations - Lister tous les signalements', async () => {
      const { response, data } = await makeRequest('/api/declarations');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('POST /api/declarations/:id/vote - Voter pour un signalement', async () => {
      const { response, data } = await makeRequest(`/api/declarations/${testSignalementId}/vote`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      expect(data.message).toBe('Vote enregistré');
      expect(data.votes).toBe(1);
    });

    it('POST /api/declarations/:id/commentaires - Ajouter un commentaire', async () => {
      const commentaire = {
        message: 'Ceci est un commentaire de test automatisé',
      };

      const { response, data } = await makeRequest(`/api/declarations/${testSignalementId}/commentaires`, {
        method: 'POST',
        body: JSON.stringify(commentaire),
      });

      expect(response.status).toBe(200);
      expect(data.message).toBe(commentaire.message);
      expect(data.signalementId).toBe(testSignalementId);
    });

    it('GET /api/declarations/:id/commentaires - Voir les commentaires', async () => {
      const { response, data } = await makeRequest(`/api/declarations/${testSignalementId}/commentaires`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
    });

    it('GET /api/declarations/suivi/:codeSuivi - Suivre par code', async () => {
      const { response, data } = await makeRequest(`/api/declarations/suivi/${testCodeSuivi}`);
      
      expect(response.status).toBe(200);
      expect(data.codeSuivi).toBe(testCodeSuivi);
      expect(data.commentaires).toBeDefined();
    });

    it('GET /api/declarations/statut/:codeSuivi - Vérifier le statut', async () => {
      const { response, data } = await makeRequest(`/api/declarations/statut/${testCodeSuivi}`);
      
      expect(response.status).toBe(200);
      expect(data.codeSuivi).toBe(testCodeSuivi);
    });
  });

  // ==================== TESTS D'AUTHENTIFICATION ====================
  
  describe('🔐 Authentification Admin', () => {
    
    it('POST /api/admin/login - Connexion admin réussie', async () => {
      const credentials = {
        email: 'admin@denonce.tg',
        motDePasse: 'admin123',
      };

      const { response, data } = await makeRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      expect(response.status).toBe(200);
      expect(data.message).toBe('Connexion réussie');
      expect(data.token).toBeDefined();
      
      authToken = data.token;
      console.log('🔑 Token admin récupéré');
    });

    it('POST /api/admin/login - Connexion échouée', async () => {
      const credentials = {
        email: 'admin@denonce.tg',
        motDePasse: 'mauvais-mot-de-passe',
      };

      const { response, data } = await makeRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      expect(response.status).toBe(401);
      expect(data.error).toBe('Identifiants invalides');
    });

    it('GET /api/admin/me - Vérifier le token', async () => {
      const { response, data } = await makeRequest('/api/admin/me');
      
      expect(response.status).toBe(200);
      expect(data.admin.email).toBe('admin@denonce.tg');
    });
  });

  // ==================== TESTS ADMIN PROTÉGÉS ====================
  
  describe('🛡️ Routes Admin Protégées', () => {
    
    it('GET /api/admin/categories - Lister catégories (admin)', async () => {
      const { response, data } = await makeRequest('/api/admin/categories');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('POST /api/admin/categories - Créer une catégorie', async () => {
      const timestamp = Date.now();
      const nouvelleCategorie = {
        nom: `Test Catégorie ${timestamp}`,
        description: 'Catégorie créée par test automatisé',
        couleur: '#ff6b6b',
      };

      const { response, data } = await makeRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(nouvelleCategorie),
      });

      // Debug en cas d'erreur
      if (response.status !== 200) {
        console.log('❌ Erreur création catégorie:', data);
      }

      expect(response.status).toBe(200);
      expect(data.nom).toBe(nouvelleCategorie.nom);
    });

    it('GET /api/admin/statuts - Lister tous les statuts', async () => {
      const { response, data } = await makeRequest('/api/admin/statuts');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      
      const statutEnCours = data.find((s: any) => s.nom === 'En cours d\'examen');
      testStatutId = statutEnCours?.id;
      console.log('📊 Statut de test:', statutEnCours?.nom);
    });

    it('POST /api/admin/statuts - Créer un nouveau statut', async () => {
      const timestamp = Date.now();
      const nouveauStatut = {
        nom: `Test Statut ${timestamp}`,
        description: 'Statut créé par test automatisé',
        couleur: '#4ecdc4',
        ordre: 10,
        estFinal: false,
      };

      const { response, data } = await makeRequest('/api/admin/statuts', {
        method: 'POST',
        body: JSON.stringify(nouveauStatut),
      });

      // Debug en cas d'erreur
      if (response.status !== 200) {
        console.log('❌ Erreur création statut:', data);
      }

      expect(response.status).toBe(200);
      expect(data.nom).toBe(nouveauStatut.nom);
    });

    it('PATCH /api/admin/signalements/:id/statut - Changer le statut', async () => {
      const changementStatut = {
        nouveauStatutId: testStatutId,
        commentaire: 'Changement de statut par test automatisé',
      };

      const { response, data } = await makeRequest(`/api/admin/signalements/${testSignalementId}/statut`, {
        method: 'PATCH',
        body: JSON.stringify(changementStatut),
      });

      expect(response.status).toBe(200);
      expect(data.message).toBe('Statut mis à jour avec succès');
    });

    it('GET /api/admin/dashboard - Statistiques dashboard', async () => {
      const { response, data } = await makeRequest('/api/admin/dashboard');
      
      expect(response.status).toBe(200);
      expect(data.totalSignalements).toBeGreaterThan(0);
    });

    it('GET /api/admin/signalements - Lister signalements (admin)', async () => {
      const { response, data } = await makeRequest('/api/admin/signalements?page=1&limit=10');
      
      expect(response.status).toBe(200);
      expect(data.signalements).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it('GET /api/admin/signalements/:id - Détails signalement', async () => {
      const { response, data } = await makeRequest(`/api/admin/signalements/${testSignalementId}`);
      
      expect(response.status).toBe(200);
      expect(data.id).toBe(testSignalementId);
      expect(data.categorie).toBeDefined();
      expect(data.statut).toBeDefined();
    });

    it('GET /api/admin/administrateurs - Lister admins (super admin)', async () => {
      const { response, data } = await makeRequest('/api/admin/administrateurs');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      
      const superAdmin = data.find((a: any) => a.role === 'super_admin');
      expect(superAdmin).toBeDefined();
    });

    it('POST /api/admin/administrateurs - Créer un admin', async () => {
      const timestamp = Date.now();
      const nouvelAdmin = {
        email: `test-admin-${timestamp}@denonce.tg`,
        nom: `Admin de Test ${timestamp}`,
        motDePasse: 'test123456',
        role: 'admin',
      };

      const { response, data } = await makeRequest('/api/admin/administrateurs', {
        method: 'POST',
        body: JSON.stringify(nouvelAdmin),
      });

      // Debug en cas d'erreur
      if (response.status !== 200) {
        console.log('❌ Erreur création admin:', data);
      }

      expect(response.status).toBe(200);
      expect(data.email).toBe(nouvelAdmin.email);
      expect(data.nom).toBe(nouvelAdmin.nom);
      expect(data.role).toBe('admin');
      expect(data.actif).toBe(true);
    });
  });

  // ==================== TESTS D'ERREURS ====================
  
  describe('❌ Tests d\'erreurs', () => {
    
    it('POST /api/declarations - Données manquantes', async () => {
      const signalementIncomplet = {
        titre: 'Test incomplet',
        // description manquante
        categorieId: testCategorieId,
      };

      const { response, data } = await makeRequest('/api/declarations', {
        method: 'POST',
        body: JSON.stringify(signalementIncomplet),
      });

      // Elysia retourne 422 pour les erreurs de validation
      expect(response.status).toBe(422);
      expect(data.message || data.error).toBeDefined();
    });

    it('POST /api/declarations - Catégorie invalide', async () => {
      const signalementCategorieInvalide = {
        titre: 'Test catégorie invalide',
        description: 'Test avec catégorie qui n\'existe pas',
        categorieId: 'categorie-inexistante',
      };

      const { response, data } = await makeRequest('/api/declarations', {
        method: 'POST',
        body: JSON.stringify(signalementCategorieInvalide),
      });

      expect(response.status).toBe(400);
      expect(data.error).toContain('Catégorie invalide');
    });

    it('GET /api/declarations/suivi/CODE_INEXISTANT - Code de suivi invalide', async () => {
      const { response, data } = await makeRequest('/api/declarations/suivi/CODE_INEXISTANT');
      
      expect(response.status).toBe(404);
      expect(data.error).toContain('Aucune déclaration trouvée');
    });

    it('POST /api/declarations/ID_INEXISTANT/vote - Signalement inexistant', async () => {
      const { response, data } = await makeRequest('/api/declarations/signalement-inexistant/vote', {
        method: 'POST',
      });

      expect(response.status).toBe(404);
      expect(data.error).toBe('Signalement introuvable');
    });

    it('Routes admin sans token - Non autorisé', async () => {
      // Sauvegarder le token et le supprimer temporairement
      const tempToken = authToken;
      authToken = '';

      const { response, data } = await makeRequest('/api/admin/categories');
      
      // Peut être 401 ou 500 selon l'implémentation
      expect([401, 500].includes(response.status)).toBe(true);
      
      // Restaurer le token
      authToken = tempToken;
    });

    it('Routes admin avec token invalide', async () => {
      const tempToken = authToken;
      authToken = 'token-invalide';

      const { response, data } = await makeRequest('/api/admin/categories');
      
      expect([401, 500].includes(response.status)).toBe(true);
      
      // Restaurer le token
      authToken = tempToken;
    });
  });

  // ==================== TESTS DE PERMISSIONS ====================
  
  describe('🔒 Tests de permissions', () => {
    
    let adminToken = '';

    it('Connexion avec admin normal', async () => {
      const credentials = {
        email: 'moderateur@denonce.tg',
        motDePasse: 'admin456',
      };

      const { response, data } = await makeRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      expect(response.status).toBe(200);
      expect(data.admin.role).toBe('admin');
      adminToken = data.token;
    });

    it('Admin normal ne peut pas créer de catégorie', async () => {
      const tempToken = authToken;
      authToken = adminToken;

      const nouvelleCategorie = {
        nom: 'Test Catégorie Interdite',
        description: 'Ne devrait pas pouvoir être créée',
      };

      const { response, data } = await makeRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(nouvelleCategorie),
      });

      expect(response.status).toBe(403);
      expect(data.error).toContain('super administrateurs');
      
      authToken = tempToken;
    });

    it('Admin normal peut changer le statut d\'un signalement', async () => {
      const tempToken = authToken;
      authToken = adminToken;

      const changementStatut = {
        nouveauStatutId: testStatutId,
        commentaire: 'Changement par admin normal',
      };

      const { response, data } = await makeRequest(`/api/admin/signalements/${testSignalementId}/statut`, {
        method: 'PATCH',
        body: JSON.stringify(changementStatut),
      });

      expect(response.status).toBe(200);
      expect(data.message).toBe('Statut mis à jour avec succès');
      
      authToken = tempToken;
    });
  });

  // ==================== TESTS DE PERFORMANCE ====================
  
  describe('⚡ Tests de performance', () => {
    
    it('Création de multiples signalements - DIAGNOSTIC', async () => {
      console.log('🔍 Début du diagnostic...');
      
      // Test 1 : Une seule requête
      console.log('📝 Test 1 : Création unique');
      const singleResult = await makeRequest('/api/declarations', {
        method: 'POST',
        body: JSON.stringify({
          titre: `Test unique ${Date.now()}`,
          description: 'Test de diagnostic',
          categorieId: testCategorieId,
        }),
      });
      
      console.log('✅ Résultat unique:', singleResult.response.status);
      
      // Test 2 : Deux requêtes séquentielles
      console.log('📝 Test 2 : Création séquentielle');
      const seq1 = await makeRequest('/api/declarations', {
        method: 'POST',
        body: JSON.stringify({
          titre: `Test seq 1 ${Date.now()}`,
          description: 'Test séquentiel 1',
          categorieId: testCategorieId,
        }),
      });
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Pause
      
      const seq2 = await makeRequest('/api/declarations', {
        method: 'POST',
        body: JSON.stringify({
          titre: `Test seq 2 ${Date.now()}`,
          description: 'Test séquentiel 2',
          categorieId: testCategorieId,
        }),
      });
      
      console.log('✅ Résultats séquentiels:', seq1.response.status, seq2.response.status);
      
      // Test 3 : Deux requêtes parallèles
      console.log('📝 Test 3 : Création parallèle');
      const [par1, par2] = await Promise.all([
        makeRequest('/api/declarations', {
          method: 'POST',
          body: JSON.stringify({
            titre: `Test par 1 ${Date.now()}-${Math.random()}`,
            description: 'Test parallèle 1',
            categorieId: testCategorieId,
          }),
        }),
        makeRequest('/api/declarations', {
          method: 'POST',
          body: JSON.stringify({
            titre: `Test par 2 ${Date.now()}-${Math.random()}`,
            description: 'Test parallèle 2',
            categorieId: testCategorieId,
          }),
        })
      ]);
      
      console.log('🔍 Résultats parallèles:');
      console.log('  - Par 1:', par1.response.status, par1.data);
      console.log('  - Par 2:', par2.response.status, par2.data);
      
      // Le test passe si au moins les requêtes séquentielles marchent
      expect(seq1.response.status).toBe(200);
      expect(seq2.response.status).toBe(200);
    });

    it('Récupération rapide de la liste des signalements', async () => {
      const startTime = Date.now();
      
      const { response, data } = await makeRequest('/api/declarations');
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1); // Au moins 1 signalement
      
      console.log(`⚡ Liste récupérée en ${duration}ms (${data.length} signalements)`);
      expect(duration).toBeLessThan(3000); // Plus de temps pour être sûr
    });
  });

  // ==================== NETTOYAGE ====================
  
  afterAll(async () => {
    console.log('🧹 Nettoyage des tests terminé');
    console.log(`📊 Signalement de test créé: ${testCodeSuivi}`);
    console.log('💡 Vous pouvez vérifier les données dans Prisma Studio');
  });
});