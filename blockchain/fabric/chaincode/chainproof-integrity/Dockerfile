FROM node:20-alpine

WORKDIR /opt/chaincode

COPY package.json ./
RUN npm install --omit=dev

COPY index.js ./

ENV CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999
ENV CHAINCODE_ID=unset

EXPOSE 9999

CMD ["sh", "-c", "npx fabric-chaincode-node server --chaincode-address=${CHAINCODE_SERVER_ADDRESS} --chaincode-id=${CHAINCODE_ID}"]
