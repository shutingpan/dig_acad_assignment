## Assignment 3 Background

**Refactoring a monlithic app to Microservices Design**

- breaking down app into smaller, independent services
- e.g. Refactoring a c3 controller

**What is a good candidate for a Microservice?**

1. **Performance**: which controller has performance issue?
2. **Scalability**: which controller needs to handle high traffic or variable loads?

**Microservices has small form factor**

- refer to idea that microservices should be small and lightweight in terms of design and functionality. Each microservice handles a single responsibility or feature of application.
- smaller services are easier to deploy, maintain and scale. They can also spin up/down quickly, making system more responsive to changing workloads.

compile controller into container > small form factor, spin up/down fast

**Implementation Approaches of Microservices (approach depends on type of service)**

1. RestAPI

- stateless (no more use of JWT in Assigment 3, but still feasible to use with RestAPI)
- typically use JSON or XML as payload format to transmit data btwn client and server. This data is in request body. (using http1.1)
  Why not use URL parameters for payload?
  - passing information through URL poses security issue.
  - SSL encrypts the entire request (both URL and body). Data in URL may still get logged by web servers, proxies or browsers.

2. Google RPC (GRPC) (harder to implement than restapi, better in 100K users range)

- can be stateless/bidirection
- used for performance
- GRPC protobuf (body), using http2 (need procy to convert http2 to http1.1)

  3.GraphQL

- require graphQL server
- allow direct query to db
- usually wont use from frontend due to security risk
- better for mission critical use cases (subsecond important)
- relatively slow, can become a chokepoint

4. Websocket

- used for streaming of data

sub listen to different topic in the queue
watch out for queue storage size (dont choke the queue). sub ->

## Assignment 3 notes

- every RestAPI needs authentication due to absence of cookie --> pass in login creds for auth.
- specify field type
- eg. API: localhost/createTask
- DO NOT reset database to edit field names: write an interpreter to map db fields to standardised field names.
- Take note of case sensitivity-related scenarios
- lowercase in body
- explore how to get code snippets to work on cmd prompt and powershell,
- understand when to use curl commands
- use postman to see code snippet in different languages
- decide on custom naming convention for error codes (avoid elaborate ones, numbering system would be good)

**Flow:**  
A | URL/URI - handle special characters (not using params), consider all special characters.

B | Body structure

C | IAM

D | Transaction

## Project Requirements documentation notes

- General
  - approach documentation as an outsider: clear, understandable user stories and UI interactions for code implementation without additional resources
- Data Model Document
  - define tables, column names, data types, field behaviour (Mandatory, Optional, etc.)
- Acceptance Criteria
  - details expected input/output
  - range testing, boundary testing

## Assignment 4 Examples

- Stage A: Prep for Dev Env

```
<!-- Base Image -->
docker pull node:20-alpine
docker save -o node:20-alpine

<!-- App (NodeJS) -->
<!-- Inside dummy folder containing only package.json, may utilize .npmignore -->
npm install
npm pack --pack-destination [destination-folder]

<!-- Security Aspect -->

sha256sum [file] > [file].sha256
sha256sum --check [file].sha256

<!-- Read .sha256 file -->
cat [file].sha256
```
