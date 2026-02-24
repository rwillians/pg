FROM oven/bun:1.3.9-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --silent

COPY tsconfig.json .
COPY src/ src/
RUN bun run compile

#

FROM dhi.io/postgres:18.2-alpine3.22 AS runtime

COPY --from=build /app/dist/pg /usr/local/bin/pg
COPY --chown=postgres:postgres ./config/pg_hba.conf.sample /usr/local/share/postgresql/pg_hba.conf.sample

USER postgres
WORKDIR /var/lib/pg

VOLUME /var/lib/pg
VOLUME /var/lib/postgresql/

STOPSIGNAL SIGINT

EXPOSE 5432
EXPOSE 3000

ENTRYPOINT ["pg"]
CMD ["start"]
