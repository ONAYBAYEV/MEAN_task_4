const { error } = require('console');
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const port = 3000;
const path = require('path');
const Author = require('./models/author');
const session = require('express-session');
const passport = require('passport');
const methodOverride = require('method-override');
const LocalStrategy = require('passport-local').Strategy; 
const passportLocalMongoose = require('passport-local-mongoose');


mongoose.connect('mongodb://127.0.0.1:27017/mydb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);

app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));


passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));

const db = mongoose.connection;

db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

db.once('open', () => {
  console.log('Connected to MongoDB');
});
//books
const BookSchema = new mongoose.Schema({
  title:{
   type:String,
   required:true,
   trim:true,
 },
 author:{
   type:String,
   required:true,
   trim:true,
 },
 year:{
   type:Number,
   required:true,
   validate:{
     validator:Number.isInteger,
     message:'{VALUE} is not an integer value for year ',
   },
  },
 });

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const newUser = new User({ username });
    User.register(newUser, password, (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка регистрации' });
        }
        console.log('registration succesfull');
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true,
}));

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

app.get('/protected-route', ensureAuthenticated, (req, res) => {
});

app.get('/', (req, res) => {
  res.render('index', { title: 'Книжная' });
});
app.get('/authors/new', (req, res) => {
  res.render('author');
});


//  страницы поиска книг
app.get('/books/search', (req, res) => {
  res.render('bookList', { books: [] });
});


app.get('/books/search_results',ensureAuthenticated, async (req, res) => {
  try {
    const { title, author } = req.query;

    
    const query = {};

    if (title) {
      query.title = { $regex: new RegExp(title, 'i') };
    }

    if (author) {
      query.author = { $regex: new RegExp(author, 'i') };
    }

    const books = await Book.find(query);

    res.render('bookList', { books });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при поиске книг' });
  }
});



 app.get('/books',ensureAuthenticated, async (req, res) => {
  try {
      const books = await Book.find();
      res.json(books);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка при получении студентов' });
  }
});

const Book = mongoose.model('books', BookSchema);
app.use(express.json());

app.post('/books',ensureAuthenticated, async (req, res) => {
  const { title, author, year } = req.body;
  console.log(req.body);
  try{
    const newBook= new Book({title,author,year});
    const validationError=newBook.validateSync();
    if(validationError){
      console.error('Validation error',validationError);
      res.status(400).json({error:'Validation error',details:validationError.errors});
    }else{
      const savedBook = await newBook.save();
      console.log('book created succesfully',savedBook);
      res.status(201).json(savedBook);
    }
  }catch(error){
    console.error('error creating book',error);
    res.status(500).json({error:'INternal server error'});
    }
});





app.get('/authorList', ensureAuthenticated,async (req, res) => {
  const authors = await Author.find();
  res.render('authorList', {authors});
});
app.delete('/books/:id',ensureAuthenticated, async(req,res)=>{
const bookId = req.params.id;
try {
    const deletedBook=await Book.findByIdAndDelete(bookId);
    if(deletedBook){
      console.log('Book with ID ${bookId} deleted succesfully');
      res.status(200).json({message:'book deleted succesfully '});
    }else{
      console.error('$book with ID ${bookId} not found');
      res.status(404).json({error:'Book not found'});
    }
}catch(error){
    console.error('Error deletig book',error);
    res.status(404).json({error:'INternal server error'});
}
});
app.put('/books/:id',ensureAuthenticated, async(req,res)=>{
  const bookId=req.params.id;
  const{title,author,year}= req.body;
  try{
    const updatedBook= await Book.findByIdAndUpdate(
      bookId,
      {title,author,year},
      {new:true}
    );
    if (updatedBook){
      console.log('book with ID ${bookId} updated successfully');
      res.status(200).json({message:'book updated succesfully'});
    }else{
      console.error('book with ID ${bookId} not found');
      res.status(500).json({error:'book not found'});
    }
  }catch(error){
    console.error('Error updating book',error);
    res.status(500).json({error:'INternal server error'});
  }
});
//books
//author
//Создание нового автора 
app.post('/authors',ensureAuthenticated, async(req,res)=>{
  try{
    const author = new Author(req.body);
    await author.save();
    res.status(201).send(author);
  }catch(error){
    res.status(500).send(error);
  }
});
//get all aurhors
app.get('/authors', ensureAuthenticated,async(req,res)=>{
  try{
    const authors=await Author.find();
    res.render('authorList', { authors });
  }catch(error){
    res.status(500).send(error);
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
