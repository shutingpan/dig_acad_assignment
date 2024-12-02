# Selected base image
FROM node:20-alpine

# Set up user and group without a password prompt (-D flag)
RUN addgroup appgroup && adduser appuser -H -D -G appgroup

# Set root directory
WORKDIR /app

# Copy files to container
COPY backend-1.0.0.tgz .

RUN npm install backend-1.0.0.tgz 

COPY . .

# Check valid package.json
# If no differences, bring node_modules 2 levels up and remove nested dir
RUN cmp ./package.json ./node_modules/backend/package.json && \
    rm backend-1.0.0.tgz && rm package-lock.json && \
    mv ./node_modules/backend/node_modules/* ./node_modules && rm -r ./node_modules/backend

# Set file permissions to workdir and inner files/subfolders
RUN chmod -R 755 /app

# Run application as non-system user
USER appuser

# Not necessary to place, instead let release engineer define in config.env file
EXPOSE 3000

CMD ["node", "index.js"]

# --------- Notes ----------------
  # Do not change ownership of app folder 
  # e.g. RUN chown -R appuser:appgroup /app 

# --------- Build and Run ----------------
# docker build -t a4:latest .
# docker run -d -p 3000:3000 --env-file ./config/config.env --name a4-container --rm a4:latest
# docker stop a4-container