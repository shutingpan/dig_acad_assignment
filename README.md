Assignment 3 Notes

Refactoring a monlithic app to Microservices Design

- breaking down app into smaller, independent services
- e.g. Refactoring a c3 controller

What is a good candidate for a Microservice?

1. Performance: which controller has performance issue?
2. Scalability: which controller needs to handle high traffic or variable loads?

Microservices and small form factor

- refer to idea that microservices should be small and lightweight in terms of design and functionality. Each microservice handles a single responsibility or feature of application.
- smaller services are easier to deploy, maintain and scale. They can also spin up/down quickly, making system more responsive to changing workloads.

compile controller into container > small form factor, spin up/down fast

Implementation Approaches of Microservices (approach depends on type of service)

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

Assignment 3
every restapi needs authentication due to no cookie

- pass in login creds for auth.
- specify field type
  -eg. localhost/createTask

- write an interpreter to map db fields to standardised field names. (dont reset db)
- note of case-sensitivity differences
- lowercase in body

- explore how to get code snippets to work on cmd prompt and powershell,
- understand when to use curl commands
  -use postman to see code snippet in
- decide on naming convention (avoid confusing convention, numbering system would be good

URL - handle special characters (not using params), consider all special characters.
