import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { declarationRoutes } from './denonce';

const app = new Elysia()
  .use(swagger({
    path: "/docs",
    documentation: {
      info: {
        title: "API de signalements anonymes",
        version: "1.0.0"
      }
    }
  }))
  .use(declarationRoutes)
  .listen(3000);

console.log('✅ Serveur lancé sur http://localhost:3000');
console.log('📚 Swagger dispo sur http://localhost:3000/docs');
