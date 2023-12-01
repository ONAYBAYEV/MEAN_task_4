const express = require('express');
const passport = require('passport');
const router = express.Router();
const app = express();


app.get('/register', (req, res) => {
    res.render('register', { title: 'REgistration page' });
  });

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login page' });
  });

// Регистрация пользователя
router.post('/auth/register', async (req, res) => {
  try {
    const user = await User.register(new User({ username: req.body.username }), req.body.password);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при регистрации пользователя' });
  }
});

// Вход пользователя
router.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'Неверные учетные данные' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.json({ success: true, user });
    });
  })(req, res, next);
});

// Выход пользователя
router.get('/logout', (req, res) => {
  req.logout();
  res.json({ success: true });
});

module.exports = router;
