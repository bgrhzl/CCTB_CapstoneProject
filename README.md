# CCTB Capstone Project

## Features

- Node.js + Express backend
- Firebase Firestore integration (CRUD endpoints)
- Test endpoints for GET, POST, DELETE
- Ready for Postman API testing
- Clean commit history and regular pushes to GitHub

## Backend Setup

- The backend uses Firebase Admin SDK for Firestore operations.
- All sensitive credentials (such as `serviceAccountKey.json`) are **excluded** from the repository for security.
- To run locally, place your own `serviceAccountKey.json` in the `backend/` directory (never commit this file).

## API Endpoints

- `POST /firebase-user` – Add a user to Firestore
- `GET /firebase-user/:uid` – Get a user from Firestore
- `DELETE /firebase-user/:uid` – Delete a user from Firestore
- `GET /health` – Health check endpoint

## Security Notice

**Never commit your `serviceAccountKey.json` or any other secrets to the repository.**  
This file is required for local development only and must be kept private.

## Postman

- A Postman collection is available for testing all endpoints.
- All endpoints return JSON responses and are ready for integration.

---

## How to Run

1. Clone the repository.
2. Place your `serviceAccountKey.json` in the `backend/` folder.
3. Run `npm install` in both root and `backend/` folders.
4. Start the backend with `npm run dev` or `npm start` inside `backend/`.
5. Use Postman to test the endpoints.

---

## Commit & Push

- Commit your changes regularly with clear messages.
- Push to GitHub for version control and collaboration.
