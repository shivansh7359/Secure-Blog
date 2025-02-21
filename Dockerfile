FROM node:20-alpine

WORKDIR /app

ENV ARCJET_KEY=
ENV JWT_SECRET=
ENV ENV=
ENV SECRET_KEY=
ENV DB_URL=
ENV UPLOADTHING_TOKEN=
ENV PAYPAL_CLIENT_ID=

COPY package*.json .

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD [ "npm", "start" ]


