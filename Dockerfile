FROM node:alpine

# implementation specific environment variables
ENV FLOW_LOCATION=undefined


# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run everything after as non-privileged user.
USER pptruser

WORKDIR /app
COPY --chown=pptruser:pptruser ["package.json","./"]
COPY --chown=pptruser:pptruser ["src","./src"]

RUN npm install
EXPOSE 8080
ENTRYPOINT npm start