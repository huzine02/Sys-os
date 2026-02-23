FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_KEY
ARG VITE_GIST_ID
ARG VITE_GIST_TOKEN
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_GIST_ID=$VITE_GIST_ID
ENV VITE_GIST_TOKEN=$VITE_GIST_TOKEN
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
