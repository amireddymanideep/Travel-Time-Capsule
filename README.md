# Travel Time Capsule

A travel-memory application with a React/Vite frontend and a Java 21 Spring Boot
REST API. Users can create private trip capsules, preserve notes and photos,
record locations and expenses, and lock each capsule until its unlock date.
User accounts are protected with Spring Security, JWT authentication, and
BCrypt password hashing. PostgreSQL stores all application data, including
uploaded photo data.

## Project structure

```text
.
├── backend/                  # Java 21, Spring Boot, PostgreSQL API
│   ├── src/main/java/        # Controllers, entities, JWT security
│   ├── src/main/resources/   # Application configuration and SQL migrations
│   └── pom.xml
├── src/                      # React frontend
├── public/
├── Dockerfile                # Multi-stage Java 21 container build
├── netlify.toml
└── .env.example
```

## Run locally

Requirements: Java 21, Maven 3.9+, Node.js 22+, npm, and PostgreSQL.

1. Create a PostgreSQL database named `travel_capsule`.
2. Start the API from the project root:

   ```powershell
   $env:DATABASE_URL="jdbc:postgresql://localhost:5432/travel_capsule"
   $env:DATABASE_USERNAME="postgres"
   $env:DATABASE_PASSWORD="your-local-password"
   $env:JWT_SECRET="use-a-random-secret-at-least-32-characters-long"
   mvn -f backend/pom.xml spring-boot:run
   ```

3. In another terminal, start the frontend:

   ```powershell
   npm ci
   npm run dev
   ```

The Vite development server proxies `/api` to `http://localhost:8080`. The
database schema is applied by Flyway at startup. The development JWT secret in
`application.properties` is only a local fallback; always configure a unique
`JWT_SECRET` in a deployed environment. To test the memory assistant locally,
also set `OPENAI_API_KEY` in the backend terminal; never put it in a `VITE_`
variable or commit it.

## API overview

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/users/register` | No | Create an account |
| `POST` | `/api/users/login` | No | Authenticate and receive a JWT |
| `GET` | `/api/health` | No | Health check |
| `GET` | `/api/capsules` | Bearer token | List the signed-in user's capsules |
| `GET` | `/api/capsules/timeline` | Bearer token | List capsules for the timeline |
| `GET` | `/api/capsules/stats` | Bearer token | Return the user's capsule totals |
| `GET` | `/api/capsules/{id}` | Bearer token | Read one owned capsule |
| `POST` | `/api/capsules` | Bearer token | Create a capsule |
| `DELETE` | `/api/capsules/{id}` | Bearer token | Delete one owned capsule |
| `POST` | `/api/capsules/upload` | Bearer token | Stage an image for a capsule |
| `POST` | `/api/assistant/chat` | Bearer token | Ask about retrieved unlocked memories |

The API derives ownership from the verified JWT, not from the submitted
`userId`. Locked responses include trip title, destination, and dates, but omit
photos, notes, expenses, companions, and other private memories until unlock.
Image uploads return a data URL; the image is persisted in PostgreSQL with its
capsule when the capsule is created. Keep image sizes small because PostgreSQL
is being used for media as well as relational data.

The memory assistant uses PostgreSQL full-text search to retrieve up to five
relevant unlocked capsules for the authenticated user, then uses the OpenAI
Chat Completions API to answer from those snippets. Locked capsules, photos,
and account details are never sent. Since unlocked memory text is sent to
OpenAI when the assistant is used, configure `OPENAI_API_KEY` privately in
Render only if you want to enable the assistant. Without it, capsule features
continue to work and the assistant endpoint reports that it is unavailable.
`OPENAI_MODEL` is optional and defaults to `gpt-4o-mini`.

## Deployment

Do not put Aiven database credentials, a JWT signing secret, or any other
private value in source code, frontend environment variables, or Git. Set them
as private environment variables in Render. The frontend only needs the public
Render API URL.

### 1. Create the Aiven PostgreSQL database

Create a PostgreSQL service in Aiven and note its database name, host, port,
username, and password from the Aiven console. Do not paste credentials into
the repository. Construct the JDBC URL using the values Aiven provides:

```text
jdbc:postgresql://HOST:PORT/DATABASE?sslmode=require
```

The API runs Flyway migrations automatically on startup.

### 2. Configure the backend port

The application listens on Render's `PORT` environment variable and falls back
to port `8080` locally. No frontend URL should be used as the backend port.

### 3. Build and optionally smoke-test the Docker image

From the repository root:

```powershell
docker build -t travel-time-capsule .
```

The root [`Dockerfile`](./Dockerfile) builds with Maven and Java 21, then
packages the application in a smaller Java 21 runtime image.

### 4. Push the source to GitHub

Create a GitHub repository if needed, add it as the `origin` remote, then push
the project branch:

```powershell
git add .
git commit -m "Build Travel Time Capsule full-stack app"
git push -u origin main
```

### 5. Deploy the backend to Render

Create a **Web Service** connected to the GitHub repository and choose
**Docker** as the runtime. Set the Dockerfile path to `./Dockerfile` and the
Docker build context to the repository root.

Add these environment variables under the Render service settings:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | Aiven JDBC URL from step 1, including `?sslmode=require` |
| `DATABASE_USERNAME` | Aiven database username |
| `DATABASE_PASSWORD` | Aiven database password |
| `JWT_SECRET` | A unique random secret of at least 32 UTF-8 bytes |
| `CORS_ALLOWED_ORIGINS` | Exact Netlify site origin, e.g. `https://your-site.netlify.app` |
| `OPENAI_API_KEY` | OpenAI API key; required only for the memory assistant |
| `OPENAI_MODEL` | Optional model name; defaults to `gpt-4o-mini` |

Render supplies `PORT`. Deploy and verify
`https://YOUR-RENDER-SERVICE.onrender.com/api/health` returns
`{"status":"ok"}`.

### 6. Deploy the frontend to Netlify

Create a Netlify site from the same GitHub repository. The included
[`netlify.toml`](./netlify.toml) sets the build command to `npm run build` and
the publish directory to `dist`. Set this site environment variable in Netlify:

| Key | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://YOUR-RENDER-SERVICE.onrender.com` (no trailing slash) |

Trigger a new Netlify deploy after changing the variable. For a manual deploy,
run `npm ci` and `npm run build`, then drag the generated `dist` folder into
Netlify Drop. The frontend reads the Render URL from `VITE_API_BASE_URL`; there
is no hard-coded localhost URL to replace.

### 7. Confirm the deployed origins

Use the exact deployed Netlify site origin in Render's
`CORS_ALLOWED_ORIGINS` setting. If the Netlify site name or domain changes,
update that Render variable and redeploy. The backend service's name does not
need to match the Netlify site name.
