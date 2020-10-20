require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mustache = require('mustache-express');
const db = require('monk')(process.env.DB_HOST);
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const VIEWS_PATH = path.join(__dirname, '/views');

app.use(cookieParser());
app.use(express.static(`${__dirname}/public`));
app.engine('mustache', mustache());
app.engine('mst', mustache(`${VIEWS_PATH}/partials`, '.mst'));
app.set('view engine', 'mustache');
app.set('views', `${__dirname}/views`);

app.use(bodyParser.urlencoded({
  extended: true,
}));

const players = db.get('players');

app.get('/', async (req, res) => {
  if (req.cookies.playerId === undefined) {
    res.render('signup.mst');
  } else {
    const player = await players.find({ _id: req.cookies.playerId });
    res.render('index.mst', { player });
  }
});

app.get('/signup', async (req, res) => {
  if (req.cookies.playerId === undefined) {
    res.render('signup.mst');
  } else {
    res.redirect('/');
  }
});

app.post('/signup', async (req, res) => {
  if (req.body.name !== undefined) {
    const name = req.body.name.toLowerCase();
    if (await players.count({ name }) === 0) {
      const player = await players.insert({ name });

      res
        .cookie('playerId', player._id)
        .redirect('/');
    } else {
      res.render('signup.mst', { nameExists: true });
    }
  }
});

app.get('/logout', async (req, res) => {
  res.clearCookie('playerId');
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`The server is listening on port ${port}`);
});
