FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

CMD ["node", "dist/index.ts"]