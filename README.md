You are building a local microservices-based system in Node.js for in-depth learning. The system consists of:

- A custom **API Gateway** (Node.js + Express) that uses **DNS-based service discovery** and validates **JWT tokens** to route requests to services like `task-service.local`.

- A self-built **Service Registry** that supports:
  - `POST /register` for service registration
  - `POST /heartbeat` for liveness signals
  - `GET /resolve/:name` to return a list of live service instances

- A custom **DNS Server** built with `dns2`, that resolves domain names like `user-service.local` into healthy IPs from the Service Registry.

- Multiple **stateless microservices**:
  - `user-service` (auth, register, login)
  - `task-service` (CRUD to-do tasks)
  - `reminder-service` (schedule reminders)
  - `notification-service` (send messages)

Each service will:
- Be an independent Express app
- Register with the registry at startup
- Send periodic heartbeat
- Be resolvable by DNS server
- Expose RESTful HTTP APIs on different localhost ports

All components must work together locally via `localhost`, using direct IPs and ports. No Docker yet.

Test everything with Postman or `curl`. System should be modular, observable, and production-inspired.
