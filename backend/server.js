// server.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'karthickashwin423@gmail.com',
    pass: 'uxgp zcte moyn rsjf'
  }
});


const app = express();
app.use(morgan('tiny'))
app.use(cors())

// PostgreSQL connection pool
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'my_database',
  password: 'admin123',
  port: 5400,
});

app.use(bodyParser.json());
app.get('/', async (req, res) => { res.send('database connected') })


// Endpoint for admin login
app.post('/login', async (req, res) => {
  console.log(req.body);
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM accounts WHERE username = $1', [username]);
    if (result.rows.length === 1) {
      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        // Generate JWT token
        const token = jwt.sign({ username: user.username, user_type: user.user_type }, 'your_secret_key', { expiresIn: '1h' });
        res.status(200).json({ message: 'Login Successful', token });
      } else {
        res.status(401).json({ message: 'Invalid username or password' });
      }
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


//Create middleware to verify the JWT token and extract user information:
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Missing token' });
  }
  jwt.verify(token, 'your_secret_key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

// Assuming you have an Express.js app

const port = 5000;

app.use(bodyParser.json());

// Endpoint to save user details
app.post('/user-details', (req, res) => {
  const { skills, certifications, projects } = req.body;
  // Process and save user details here
  console.log('Received user details:', { skills, certifications, projects });
  res.status(200).json({ message: 'User details saved successfully' });
});



// Admin route
app.get('/admin', verifyToken, (req, res) => {
  if (req.user && req.user.user_type === 'admin') {
    res.json({ message: 'Welcome to the admin dashboard' });
  } else {
    res.status(403).json({ message: 'Forbidden: Access denied' });
  }
});

// User route
app.get('/user', verifyToken, (req, res) => {
  if (req.user && req.user.user_type === 'user') {
    res.json({ message: 'Welcome to the user dashboard' });
  } else {
    res.status(403).json({ message: 'Forbidden: Access denied' });
  }
});




app.post('/createUser', async (req, res) => {
  console.log(req.body);
  const { newUsername, newEmail, newPassword } = req.body;
  try {

    const mailOptions = {
      from: 'karthickashwin423@gmail.com',
      to: req.body.newEmail,
      subject: 'Registered',
      html: `<p>Thank you for registering!</p><p>Click <a href="http://localhost:3000/login">here</a>.</p><p>Password: ${newPassword}</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.status(500).send('Error sending email');
      } else {
        console.log('Email sent: ' + info.response);
        res.status(200).send('Registration email sent');
      }
    });

    const result = await pool.query('insert into accounts (username,email,password,user_type) values ($1, $2, $3, $4)', [newUsername, newEmail, newPassword, 'user']);
    res.status(201).json({ message: 'Data inserted successfully' });
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ message: 'Error inserting data' });
  }
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


