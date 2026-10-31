# <Project name>

Movie theater management system.

## 📁 Project Structure

- `backend/`: Node.js + Express API
- `frontend/`: HTML/CSS/JS client

## ✨ Features (Optional)
- Browse movies and showtimes
- Seat selection and booking management
- User authentication (if applicable)
- Admin dashboard for managing movies and screenings

## 🚀 Getting Started

### Prerequisites
- Node.js installed on your machine
- npm or yarn

### Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mishalshafee/movie-theatre-management-system.git
   cd movie-theatre-management-system/


## Running locally

Requires Node.js LTS and Postgres 17. The steps below run Postgres in a container
with Docker or Podman. If you already have a Postgres 17 server, skip step 1 and set
`DATABASE_URL` in `.env` to point at it.

1. Start the database: `docker compose up -d`
   (Podman users: `podman compose up -d`)
2. `cd backend && cp .env.example .env`
   (Windows PowerShell: `copy .env.example .env`)
3. `npm install`
4. `npm run migrate`
5. `npm run seed`
6. `npm run dev`

The API runs on http://localhost:4000. Check it at `/api/health`.