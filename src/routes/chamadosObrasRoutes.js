import express from 'express'

const router = express.Router()

router.post('/create', (req, res) => {
    const data = req.body;
    console.log(data);
    res.status(201).json({ message: 'Chamado criado com sucesso!', data });
});

router.get('/get/users')

export default router