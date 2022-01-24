FROM node:12-slim AS build
WORKDIR /usr/app
RUN apt update && apt install -y python3 build-essential
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm ci --production
RUN npm cache clean --force

FROM node:12-slim
WORKDIR /usr/app
COPY --from=build /usr/app/lib ./lib
COPY --from=build /usr/app/node_modules ./node_modules
COPY jobconfig ./jobconfig
ENV NODE_ENV="production"
CMD [ "./node_modules/.bin/probot", "run", "./lib/index.js"]
