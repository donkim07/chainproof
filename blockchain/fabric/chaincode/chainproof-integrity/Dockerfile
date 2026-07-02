FROM node:20-alpine
WORKDIR /chaincode
COPY package.json ./
RUN npm install --production
COPY index.js ./
ENV CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999
CMD ["node", "index.js"]
