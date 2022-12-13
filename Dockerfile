FROM node:18-alpine as builder

WORKDIR /usr/app

# missing dep for turbo - mentioned by @nathanhammond
# on https://github.com/vercel/turborepo/issues/2293 
RUN apk add --no-cache libc6-compat

RUN npm install -g turbo typescript

COPY package.json .
COPY package-lock.json .
COPY turbo.json .
COPY apps ./apps
COPY packages ./packages

RUN npm install

RUN npm run build

FROM node:18-alpine as production

WORKDIR /usr/app

# missing dep for turbo - mentioned by @nathanhammond
# on https://github.com/vercel/turborepo/issues/2293 
RUN apk add --no-cache libc6-compat

RUN npm install turbo -g

RUN apk add ffmpeg --no-cache

COPY --from=builder /usr/app .

RUN npm install --omit=dev

CMD ["npm", "start"]