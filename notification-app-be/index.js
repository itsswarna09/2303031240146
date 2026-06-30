const express = require('express');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

const PORT = 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));