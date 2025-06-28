const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');
const FirebaseDataService = require('../firebaseDataService');
const admin = require('firebase-admin');
const dataService = new FirebaseDataService(admin);

// ...existing code...
