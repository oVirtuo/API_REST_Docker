const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Firebase Admin SDK setup
const serviceAccount = require('./todolist-30df2-firebase-adminsdk-1v15z-4708547403.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// JWT secret
const JWT_SECRET = "your_secret_key";

// Middleware para verificar JWT
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send('Access denied.');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).send('Invalid token.');
    }
}

// Rotas

// Autenticação
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await admin.auth().getUserByEmail(email);
        // Simulação de verificação (use um sistema adequado para senhas)
        if (password === "password123") {
            const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
            return res.status(200).json({ token });
        }
        res.status(403).send("Invalid credentials");
    } catch (err) {
        res.status(500).send("Error logging in.");
    }
});

// Listar todos os itens
app.get('/items', verifyToken, async (req, res) => {
    const db = admin.firestore();
    const snapshot = await db.collection('items').get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
});

// Obter item por ID
app.get('/items/:id', verifyToken, async (req, res) => {
    const db = admin.firestore();
    const item = await db.collection('items').doc(req.params.id).get();
    if (!item.exists) return res.status(404).send("Item not found");
    res.json({ id: item.id, ...item.data() });
});

// Criar novo item
app.post('/items', verifyToken, async (req, res) => {
    const db = admin.firestore();
    const newItem = req.body;
    const docRef = await db.collection('items').add(newItem);
    res.status(201).send({ id: docRef.id });
});

// Atualizar item
app.put('/items/:id', verifyToken, async (req, res) => {
    const db = admin.firestore();
    const updatedItem = req.body;
    await db.collection('items').doc(req.params.id).set(updatedItem, { merge: true });
    res.send("Item updated successfully.");
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
