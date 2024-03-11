---
title: Issues When Using Docker MySQL Database with Prisma
category: programming
tags:
  - programming
  - prisma
  - docker
  - mysql
created: 2023-10-28
---

![title](https://melon-sour-blog-images.s3.amazonaws.com/20231028-docker-prisma.jpeg)

I've recently been working on this webapp and I ran into some obstacles when using prisma as my ORM to interact with mysql in the backend. Here's a quick write up that explains how I solved these issues.

## MySQL Privilege Error when Migrating

```shell
$ npx prisma migrate dev

Error: P3014

Prisma Migrate could not create the shadow database. Please make sure the database user has permission to create databases. Read more about the shadow database (and workarounds) at https://pris.ly/d/migrate-shadow

Original error: Eror code: P1010

User `<username>` was denied access on the database `<databasename>`

```

According to the docs, prisma uses this thing called a shadow database when running commands in dev mode to detect schema drift and generate new migrations. Prisma uses the user information in `.env` to connect to the database but by default this user doesn't have the necessary privileges to create and interact with a shadow database.

In order to grant these privileges, I first logged in to the mysql database.

```shell
# adjust information according to setup
$ mysql -h <address> -P <port> -u <username> -p
```

Then ran this command.

```sql
GRANT CREATE, ALTER, DROP, REFERENCES ON *.* TO '<username>'@'%';
```

`CREATE, ALTER, DROP, REFERENCES` refer to privileges to create, modify, delete and create foreign keys respectively. `*.*` refers to all databases and tables (i.e. the shadow database that's about to be made).The `'@%'` after user refers to the host connecting to the db. It could be an ip or name like localhost, but in this case I'm using a wildcard that matches anything.

However this gave the following error since non-root users apparently can't grant privileges freely, makes sense.

```sql
ERROR 1044 (42000): Access denied for user '<username>'@'%' to
```

Logging in as root and then executing the same command finally let me migrate the schema to the database.

```shell
$ mysql -h <address> -P <port> -u root -p
```

```sql
GRANT CREATE, ALTER, DROP, REFERENCES ON *.* TO root@'%';
```

```shell
$ npx prisma migrate dev
```

## Accessing DB in a Container through Prisma

So after configuring the database and posting some simple data I got the following error.

```text
docker Can't reach database server at 127.0.0.1:<port>
```

Which is weird because it matches the values in my Dockerfile which I used in the previous step to log in to the database directly. Turns out localhost is fine when accessing a container from the host machine but not usable when getting one container to talk to another. (In my case Next.js to MySQL). To solve this I modified my docker-compose.yml to include a container_name key.

```yaml
services:
  db:
    container_name: mysql
```

Then I modified `DATABASE_URL` in `.env` (an environment variable used my prisma) to use the container name instead of localhost.

```text
DATABASE_URL="mysql://<username>:<password>@mysql:<port>/<database>"
```

Generating a new client successfully allowed sending data between the two containers.

```shell
$ npx prisma generate
```

Hopefully this post helps anyone in the same situation.
