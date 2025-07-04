import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { declarationRoutes } from './routes/denonce';
import { adminRoutes } from './routes/admin';

const app = new Elysia()
  .use(cors())
  .use(staticPlugin({
    assets: "src/assets",
    prefix: "/assets",
  }))
  .use(swagger({
    documentation: {
      info: {
        title: 'API Dénonciation Anonyme',
        version: '1.0.0',
        description: 'API pour la plateforme de dénonciation anonyme'
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      tags: [
        { name: 'Signalements', description: 'Gestion des signalements publics' },
        { name: 'Commentaires', description: 'Gestion des commentaires' },
        { name: 'Catégories', description: 'Gestion des catégories' },
        { name: 'Admin', description: 'Routes d\'administration' },
        { name: 'Admin - Catégories', description: 'Gestion admin des catégories' },
        { name: 'Admin - Statuts', description: 'Gestion admin des statuts' },
        { name: 'Admin - Signalements', description: 'Gestion admin des signalements' },
        { name: 'Admin - Dashboard', description: 'Dashboard administrateur' }
      ]
    }
  }))
  .get('/', () => ({ 
    message: 'API Dénonciation Anonyme',
    version: '1.0.0',
    endpoints: {
      public: '/api/declarations',
      admin: '/api/admin',
      docs: '/swagger'
    }
  }))
  .use(declarationRoutes)
  .use(adminRoutes);

// Démarrer le serveur
app.listen(3001);

console.log(`🦊 Elysia is running at http://localhost:3001`);
console.log(`📚 Documentation disponible sur: http://localhost:3001/swagger`);
console.log(`🔐 Pour tester l'admin: POST /api/admin/login avec email: admin@denonce.tg, motDePasse: admin123`);
