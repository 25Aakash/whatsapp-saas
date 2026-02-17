# WhatsApp SaaS Platform

A production-ready, multi-tenant WhatsApp Cloud API SaaS platform. Built for businesses to manage WhatsApp conversations at scale — similar to Twilio or Gupshup.

Customers onboard via **Meta Embedded Signup** (OAuth) — no manual credential copying needed.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | Next.js 15 + Tailwind CSS |
| Database | MongoDB (Mongoose) |
| Queue | Redis + BullMQ |
| Real-time | Socket.IO |
| Auth | JWT + bcrypt + RBAC |

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Next.js    │────▶│   Express    │────▶│   MongoDB    │
│   Frontend   │◀────│   Backend    │◀────│   Database   │
└──────────────┘     └──────┬───────┘     └──────────────┘
       │                    │
       │ Socket.IO          │ BullMQ
       │                    ▼
       │             ┌──────────────┐     ┌──────────────┐
       └─────────────│    Redis     │◀────│   Workers    │
                     └──────────────┘     └──────┬───────┘
                                                 │
                                          ┌──────▼───────┐
                                          │  WhatsApp    │
                                          │  Cloud API   │
                                          └──────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Redis

### 1. Clone and install

```bash
# Backend
cd backend
cp .env.example .env    # Edit with your values
npm install

# Frontend
cd ../frontend
cp .env.example .env.local
npm install
```

### 2. Start infrastructure

```bash
# Option A: Docker Compose (MongoDB + Redis only)
docker compose up mongodb redis -d

# Option B: Use local installations
# Ensure MongoDB and Redis are running
```

### 3. Seed the database

```bash
cd backend
npm run seed
```

This creates:
- **Platform Admin**: admin@whatsapp-saas.com / Admin@123456
- **Tenant Admin**: demo@whatsapp-saas.com / Demo@123456
- **Agent**: agent@whatsapp-saas.com / Agent@123456

### 4. Start the app

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Health check: http://localhost:5000/api/v1/health

## Docker Deployment

```bash
# Full stack
docker compose up -d

# Or build individually
docker compose build backend frontend
docker compose up -d
```

## Customer Onboarding (Embedded Signup)

1. Customer clicks **"Connect WhatsApp"** on your platform
2. Meta's Facebook Login SDK opens
3. Customer authenticates and selects/creates a WABA
4. Meta returns auth code → your backend exchanges it for token
5. Platform auto-captures: Phone Number ID, WABA ID, Access Token
6. Phone is auto-subscribed to your webhook
7. Customer is live!

### Meta App Setup (One-time)

1. Create a Meta App at [developers.facebook.com](https://developers.facebook.com)
2. Add **WhatsApp** product
3. Configure **Embedded Signup** to get a `CONFIG_ID`
4. Set webhook URL: `https://yourdomain.com/api/v1/webhook`
5. Set verify token to match your `WHATSAPP_VERIFY_TOKEN`
6. Submit for **App Review**

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login (returns JWT) |
| POST | `/api/v1/auth/register` | Register user (admin only) |
| GET | `/api/v1/auth/me` | Get current profile |

### Tenants
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tenants/embedded-signup` | Meta Embedded Signup callback |
| GET | `/api/v1/tenants` | List all tenants |
| GET | `/api/v1/tenants/:id/status` | Check WhatsApp health |
| PUT | `/api/v1/tenants/:id` | Update tenant |
| DELETE | `/api/v1/tenants/:id` | Deactivate tenant |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/conversations` | List conversations (paginated) |
| GET | `/api/v1/conversations/:id` | Get conversation detail |
| PUT | `/api/v1/conversations/:id/read` | Mark as read |
| PUT | `/api/v1/conversations/:id/assign` | Assign agent |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/messages/:conversationId` | Get messages (paginated) |
| POST | `/api/v1/messages/send` | Send text message |
| POST | `/api/v1/messages/send-template` | Send template message |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/templates` | List synced templates |
| POST | `/api/v1/templates/sync` | Sync from Meta |

### Webhook
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/webhook` | Meta verification |
| POST | `/api/v1/webhook` | Receive events |

## Webhook Payload Examples

### Inbound Text Message

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "+15551234567",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "contacts": [{
          "profile": { "name": "John Doe" },
          "wa_id": "919876543210"
        }],
        "messages": [{
          "from": "919876543210",
          "id": "wamid.ABCDEFghijklMNOP",
          "timestamp": "1700000000",
          "type": "text",
          "text": { "body": "Hello, I need help!" }
        }]
      }
    }]
  }]
}
```

### Status Update

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "+15551234567",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "statuses": [{
          "id": "wamid.ABCDEFghijklMNOP",
          "status": "delivered",
          "timestamp": "1700000060",
          "recipient_id": "919876543210"
        }]
      }
    }]
  }]
}
```

## Security Features

- **Webhook HMAC-SHA256** verification via `X-Hub-Signature-256`
- **AES-256-CBC** encryption for stored access tokens
- **JWT authentication** with role-based access control
- **Rate limiting** (API: 100/15min, Auth: 10/15min, Messages: 60/min)
- **Input validation** with Zod schemas
- **Helmet** security headers
- **HPP** HTTP parameter pollution protection

## Roles

| Role | Permissions |
|------|-------------|
| `platform_admin` | Full access to all tenants and features |
| `tenant_admin` | Manage own tenant, users, and conversations |
| `agent` | View/reply to conversations in assigned tenant |

## AWS Deployment

### Services Required
- **ECS Fargate** — Backend API, Workers, Frontend
- **Application Load Balancer** — Route `/api/v1/*` to backend, `/` to frontend
- **DocumentDB** or **MongoDB Atlas** — Database
- **ElastiCache (Redis)** — Queue broker
- **ECR** — Docker image registry
- **Secrets Manager** — Environment secrets

### Steps
1. Push Docker images to ECR
2. Create ECS task definitions for backend, workers, frontend
3. Configure ALB with target groups
4. Set environment variables in task definitions (use Secrets Manager)
5. Configure webhook URL to point to your ALB domain

## Project Structure

```
whatsapp-saas/
├── backend/
│   └── src/
│       ├── config/         # DB, Redis, Socket.IO, env
│       ├── controllers/    # Route handlers
│       ├── services/       # Business logic
│       ├── models/         # Mongoose schemas
│       ├── routes/         # Express routers
│       ├── middlewares/     # Auth, RBAC, validation, error
│       ├── workers/        # BullMQ job processors
│       ├── queues/         # Queue definitions
│       ├── utils/          # Crypto, logger, helpers
│       └── app.js          # Entry point
├── frontend/
│   └── src/
│       ├── app/            # Next.js pages
│       ├── components/     # React components
│       ├── lib/            # API client, socket, utils
│       ├── hooks/          # Custom hooks
│       └── store/          # Zustand state
├── postman/                # Postman collection
├── docker-compose.yml
└── README.md
```

## License

MIT
