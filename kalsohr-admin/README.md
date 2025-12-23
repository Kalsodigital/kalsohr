# KalsoHR Admin Frontend

Multi-tenant HR Management System - Admin Panel built with Next.js 15, shadcn/ui, and TypeScript.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **State Management:** Zustand (with persistence)
- **Forms:** React Hook Form + Zod validation
- **HTTP Client:** Axios
- **Notifications:** Sonner

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- API server running on port 3000

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=KalsoHR
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Development

```bash
npm run dev
```

The app will be available at [http://localhost:3001](http://localhost:3001)

## Demo Accounts

### Super Admin
- **Email:** superadmin@kalsohr.com
- **Password:** Admin@123

### Organization Admin
- **Email:** admin@democompany.com
- **Password:** Admin@123
