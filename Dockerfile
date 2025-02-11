FROM node:23-alpine

RUN apk add git

RUN mkdir -p /home/node/app/node_modules 
RUN mkdir -p /home/node/app/mods 
RUN chown -R node:node /home/node/app

WORKDIR /home/node/app

USER node

COPY --chown=node:node . .

RUN npm install

EXPOSE 8080

CMD ["node", "server.mjs"]
