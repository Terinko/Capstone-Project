import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World with Express and TypeScript (ES2022)!');
});

app.get('/courses', (req, res) => {
  res.send('Loading courses');
});

app.post('/courses', (req, res) => {
  res.send('Adding course');
});

app.put('/courses', (req, res) => {
  res.send('Editing course');
});

app.post('/login', (req, res) => {
  res.send('Error logging in');
});

app.post('/skills', (req, res) => {
  res.send('Error logging in');
});

app.get('/profile', (req, res) => {
  res.send('Loading courses');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});