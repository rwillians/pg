FROM oven/bun:1.2.18-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --silent

COPY tsconfig.json .
COPY src/ src/
RUN bun run compile

#

FROM postgres:17.5-alpine3.22 AS runtime

RUN apk add --no-cache openssl
RUN mkdir -p /certs \
    && mkdir -p /downloads \
    && chown postgres:postgres /certs \
    && chown postgres:postgres /downloads

COPY --from=build /app/dist/pg /usr/local/bin/pg
COPY --chown=postgres:postgres ./config/pg_hba.conf.sample /usr/local/share/postgresql/pg_hba.conf.sample

USER postgres
WORKDIR /var/lib/postgresql

VOLUME /certs
VOLUME /downloads

ENTRYPOINT ["pg"]
CMD ["start"]
