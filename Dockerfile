FROM oven/bun:1.3.9-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --silent

COPY tsconfig.json .
COPY src/ src/
RUN bun run compile

#

FROM postgres:18.2-alpine3.23 AS runtime

RUN apk add --no-cache tini

COPY --from=build /app/dist/pg /usr/local/bin/pg

USER postgres
ENV USER=postgres

WORKDIR /var/lib/pg

VOLUME /var/lib/pg
VOLUME /var/lib/postgresql/

STOPSIGNAL SIGINT

EXPOSE 5432
EXPOSE 3000

ENTRYPOINT ["tini", "--", "pg"]
CMD ["start"]
