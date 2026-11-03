# Volunteer Nepal

Volunteer Nepal is my Bachelor Final Year Project. It is a web platform that helps volunteers find suitable community work and helps organisations manage volunteer opportunities across Nepal.

The project uses the MERN stack and is written in JavaScript. React is used for the frontend, Express and Node.js are used for the backend, and MongoDB stores the application data.

## Why I made this project

Many people want to volunteer but may not know where to find work that matches their skills, interests, location, and free time. Organisations also need an easy way to publish opportunities and manage applications.

This platform brings volunteers and organisations together. It also provides smart recommendations and an AI Volunteer Guide to help users understand the platform.

## Who can use the platform?

There are three user roles:

- **Volunteer:** Finds opportunities, applies for them, follows application progress, and records completed work.
- **Organisation:** Creates and edits opportunities, reviews applications, accepts volunteers, and manages its profile.
- **Admin:** Manages users and organisations and views platform statistics.

Each role has a separate dashboard. A user can only access the features allowed for their role.

## Main features

- Volunteer, organisation, and admin registration and login
- Passwords protected with bcrypt hashing
- Optional two-factor authentication
- Forgot-password flow using email and a one-time code
- Role-based dashboards and sidebar navigation
- Opportunity creation, editing, searching, and filtering
- Volunteer application and approval process
- Persistent application and status notifications
- Volunteer history and recorded hours
- Nepal province and district selection
- Smart recommendations with match percentages and reasons
- AI Volunteer Guide using Gemini and database information
- Organisation verification and admin management
- Dashboard charts using real database data
- Responsive design for desktop and smaller screens

## Technology used

| Part | Technology | What it does |
| --- | --- | --- |
| Frontend | React, Vite, Tailwind CSS | Builds the pages and user interface |
| Backend | Node.js, Express | Handles API requests and application rules |
| Database | MongoDB, Mongoose | Stores users, opportunities, and applications |
| Security | JWT, bcryptjs | Protects passwords and dashboard routes |
| AI | Google Gemini API | Provides general and database-supported guidance |
| Email | Nodemailer | Sends password reset and 2FA codes |
| Testing | Jest | Tests frontend helpers, backend logic, and API flows |
| Containers | Docker Compose | Runs MongoDB or the complete application locally |

## How the folders are organised

The code is divided into frontend, backend, and evaluation folders. This prevents different parts of the project from becoming mixed together.

    Volunteer/
    |
    |-- client/                       React frontend
    |   |-- src/
    |   |   |-- components/          Reusable interface parts
    |   |   |-- context/             Shared login and application state
    |   |   |-- data/                Frontend reference data
    |   |   |-- lib/                 API and helper functions
    |   |   +-- pages/               Full application pages
    |   +-- vite.config.js           Vite and local API proxy settings
    |
    |-- server/                       Express backend
    |   |-- src/
    |   |   |-- agents/              AI onboarding and assistant logic
    |   |   |-- config/              MongoDB connection settings
    |   |   |-- middleware/          Login and permission checks
    |   |   |-- models/              Mongoose database schemas
    |   |   |-- routes/              Express API endpoints
    |   |   |-- scripts/             One-time maintenance scripts
    |   |   |-- utils/               Shared backend helper functions
    |   |   |-- seed.js              Main demonstration data
    |   |   +-- server.js            Backend starting point
    |   +-- .env.example             Example backend configuration
    |
    |-- evaluation/                   Jest tests and reports
    |   |-- backend/
    |   |   |-- unit/                Small backend tests
    |   |   +-- integration/         Full API and MongoDB tests
    |   |-- frontend/                Frontend data and helper tests
    |   |-- coverage/                Generated HTML coverage report
    |   +-- jest.config.cjs           Shared Jest settings
    |
    |-- docker-compose.yml            Docker services
    |-- package.json                  Commands for the whole project
    +-- README.md                     This guide

For example, a React page belongs in **client/src/pages**, a MongoDB schema belongs in **server/src/models**, and a Jest test belongs in **evaluation**. Following this simple rule makes the code easier to find, explain, and maintain.

## How a request moves through the project

The usual flow is:

    User action in React
            |
            v
    Express API route
            |
            v
    Mongoose model
            |
            v
    MongoDB database
            |
            v
    JSON response shown by React

For example, when a volunteer applies for an opportunity, React sends the form to an Express route. The backend checks the logged-in user, saves the application through Mongoose, and returns the result to the page.

## What is needed before running it?

Install:

- Node.js 20 or another recent LTS version
- npm
- Docker Desktop for local MongoDB, or a MongoDB Atlas account
- VS Code and Git are helpful but not required

If a Docker command mentions **dockerDesktopLinuxEngine**, Docker Desktop is not running. Open Docker Desktop and wait for the engine to finish starting.

## First-time setup

Open the VS Code terminal in the main **Volunteer** folder.

### 1. Install packages

    npm install
    npm run install:all

The first command installs the main project tools. The second installs the packages inside both the client and server.

### 2. Create the backend environment file

    Copy-Item server/.env.example server/.env

Open **server/.env** and enter the correct settings for your computer or online services. The important variables are:

    PORT=5000
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=use_a_long_random_secret
    CLIENT_URL=http://localhost:5173

    GEMINI_API_KEY=your_gemini_key
    GEMINI_MODEL=your_gemini_model

    SMTP_HOST=your_email_host
    SMTP_PORT=587
    SMTP_USER=your_email_address
    SMTP_PASS=your_email_app_password
    MAIL_FROM=your_sender_address

Gemini and email settings are optional for basic development, but the related AI and email features need valid settings to work fully.

Never upload **server/.env** to Git. API keys, passwords, and private connection strings must not be placed in React files.

## Running the project

### Use the MongoDB address from server/.env

Use this when the MongoDB address points to Atlas or another database that is already running:

    npm run dev

### Use local MongoDB with Docker

Start Docker Desktop and run:

    npm run dev:local

This starts the MongoDB container and then starts React and Express together.

Open:

- Frontend: http://localhost:5173
- Backend health check: http://localhost:5000/api/health

The main command starts both applications, so separate frontend and backend terminals are not required.

## Demonstration data

Add the main demonstration accounts and records with:

    npm run seed

Organise demonstration data as two organisations in each province and three opportunities for each organisation with:

    npm run seed:provinces

Read a seed script before running it on an important database because a seed may replace demonstration records.

The standard demonstration accounts use the password **password123**:

| Role | Email |
| --- | --- |
| Volunteer | volunteer@volunterr.test |
| Organisation | organisation@volunterr.test |
| Admin | admin@volunterr.test |

These accounts are only for local development and university demonstrations.

## Testing

All tests are kept inside **evaluation** instead of being mixed with the application code.

### Run the quick unit tests

    npm test

### Run only backend unit tests

    npm run test:backend

### Run only frontend tests

    npm run test:frontend

### Run the API and MongoDB integration tests

    npm run db:up
    npm run test:integration

Integration tests use the separate **volunterr_test** database. They do not clear the normal development database.

### Run every test at once

    npm run db:up
    npm run test:all

### Create a coverage report

    npm run test:coverage

Open **evaluation/coverage/index.html** in a browser to see the report. Coverage shows which code ran during the tests. A low percentage does not automatically mean the code is wrong; it shows where more tests may be useful.

At the time this README was updated, all 22 tests in 4 test suites were passing.

## Running everything with Docker

Docker can run the frontend, backend, and MongoDB together:

    docker compose up --build -d

Open http://localhost:8080 after the containers start.

Stop the containers without deleting the saved MongoDB volume:

    docker compose down

## Common beginner problems

### ECONNREFUSED 127.0.0.1:5000

The frontend cannot reach Express. Check that the backend is running and that port 5000 is not blocked or already being used.

### Docker API or pipe error

Docker Desktop is closed or its Linux engine is not ready. Start Docker Desktop, wait for it to finish loading, and run the command again.

### MongoDB authentication failed

The username, password, database name, or authSource in the MongoDB address does not match the database configuration. Compare **server/.env** with **docker-compose.yml**.

### The chatbot gives a fallback answer

Check the Gemini key and model in **server/.env**, then restart the backend. The fallback keeps the platform usable when Gemini is unavailable.

### An email code does not arrive

Check the SMTP settings and use an email app password if the provider requires one. Also check the spam folder and restart the backend after changing the environment file.

## Simple rules for future work

- Keep React pages and components inside **client**.
- Keep APIs, database models, and server logic inside **server**.
- Keep every test inside **evaluation**.
- Put private values only in **.env**.
- Test a changed feature first, then run **npm run test:all** before a demonstration.
- Write short comments that explain why a function is needed.
- Avoid changing unrelated files when fixing one feature.

