import app from './src/app.js';

const PORT = process.env.PORT || 5000;

const server = app;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});