/* eslint-disable no-underscore-dangle */
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
const locations = db.get('locations');

app.get('/', async (req, res) => {
  if (req.cookies.playerId === undefined) {
    res.redirect('/signup');
  } else {
    const player = await players.findOne({ _id: req.cookies.playerId });
    const availableLocations = await locations.find({});

    player.locations.forEach((playerLocation) => {
      const objIndex = availableLocations.findIndex(((obj) => obj._id.equals(playerLocation.id)));
      if (objIndex !== undefined) {
        availableLocations[objIndex].found = true;
      }
    });

    console.log(availableLocations);

    res.render('index.mst', { player, locations: availableLocations });
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
      const player = await players.insert({ name, locations: [] });

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

app.get('/location/:id', async (req, res) => {
  if (req.cookies.playerId === undefined) {
    res.redirect('/signup');
  } else {
    const player = await players.findOne({ _id: req.cookies.playerId });
    const location = await locations.findOne({ _id: req.params.id });

    let found = false;
    player.locations.forEach((playerLocation) => {
      if (location._id.equals(playerLocation.id)) {
        found = true;
      }
    });
    console.log(found);

    res.render('location.mst', { player, location, found });
  }
});

app.post('/location/:id', async (req, res) => {
  if (req.cookies.playerId === undefined) {
    res.redirect('/signup');
  } else {
    const player = await players.findOne({ _id: req.cookies.playerId });
    const location = await locations.findOne({ _id: req.params.id });

    if (req.body.code.toLowerCase() === location.code.toLowerCase()) {
      player.locations.push({ id: location._id, found: true });
      await players.update({ _id: player._id }, { $set: { locations: player.locations } });
      res.redirect('/');
    } else {
      res.render('location.mst', { player, location, invalidCode: true });
    }
  }
});

app.listen(port, () => {
  console.log(`The server is listening on port ${port}`);
});
