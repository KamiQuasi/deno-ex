FROM quay.io/ldary/deno:1.9.0
RUN mkdir -p /projects
WORKDIR /projects
COPY assets /projects/assets/
COPY *.ts /projects
EXPOSE 8080/tcp
ENTRYPOINT [ "deno", "run", "--unstable", "--allow-env", "--allow-read", "--allow-net=0.0.0.0:8080", "app.ts" ]