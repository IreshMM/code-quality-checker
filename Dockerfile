FROM node:12-slim
WORKDIR /usr/app
RUN apt update && apt install -y python3 build-essential
COPY package.json package-lock.json ./
RUN npm ci --production
RUN npm cache clean --force
ENV NODE_ENV="production"
COPY lib ./lib
COPY jobconfig ./jobconfig
CMD [ "npm", "start" ]
