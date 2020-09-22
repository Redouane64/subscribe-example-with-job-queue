# subscribe-example-with-job-queue

Express example app with job queue that handles e-mail subscription requests.

# Why

The goal of this express application is to demonstrate job queueing on server. It uses `Bull` library for job queues with `Redis` for messages persistance.

# Docker

Run docker image with commmand `docker-compose up -d`

# How it works

- Send `POST` request to ```http://host:port/subscribe?email=<e-mail-address>```
- Server will return immediatly with message `{ message: "You've subscribed successfully."`
- Subscription jobs queued to `Bull` queue for processing one by one.
