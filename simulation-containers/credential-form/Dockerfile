# simulation-containers/phishing-recruiter/Dockerfile
#
# Lightweight Node.js simulation container.
# Runs the fake LinkedIn recruiter scenario.
# Provisioned by containers/tasks.py via docker-py SDK.

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm install --production

# Copy source
COPY src/ ./src/

# Simulation containers run on port 3000 (HTTP) and 3001 (browser WS)
EXPOSE 3000 3001

# Environment variables injected at runtime by DockerOrchestrator
ENV SESSION_ID=""
ENV SCENARIO_ID=""
ENV STAGE_ID=""
ENV WS_BACKEND="ws://rasp_backend:8000"

CMD ["node", "src/index.js"]
