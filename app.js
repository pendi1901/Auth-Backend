require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config({ path: '../.env' });
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



const connection = mysql.createConnection(process.env.DATABASE_URL);

connection.connect((error) => {
    if (error) {
        console.log(error);
    }
    else {
        console.log('Connected to PlanetScale!');
    }

});
connection.end();

// app.use('/', require('./routes/server'))

async function hashPassword(password) {
    const saltRounds = 10;
    try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      // Store the hashed password in the database
      return hashedPassword;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw error;
    }
  }


app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    // Validate the request body
    if (!email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Connect to the MySQL database
    const connection = mysql.createConnection(process.env.DATABASE_URL);

    // Check if the user already exists
    connection.query('SELECT * FROM users WHERE email = ?', email, (err, results) => {
        if (err) {
            connection.end();
            return res.status(500).json({ error: 'Failed to check user existence' });
        }

        if (results.length > 0) {
            connection.end();
            return res.status(409).json({ error: 'User already exists' });
        }
    });

    // User does not exist, create a new entry
    const user = { email, password };

    // hashing the password 
    const saltRounds = 10; // Number of salt rounds for bcrypt

    // Hash the password


    const hashedPassword = await hashPassword(password);
    console.log(hashedPassword);    
    // password = hashPassword
    const user1 ={email: email, password: hashedPassword};


    connection.query('INSERT INTO users SET ?', user1, (err, results) => {
        if (err) {
            // connection.end();
            console.log(err);
            return res.status(500).json({ error: 'Failed to create user' });
            // connection.end();

        }

        connection.end();
    });

    return res.status(200).json({ error: 'User registered Successfully ' });

});

// app.post('/login', (req, res)=> {
//     const { email, password } = req.body;

//     // Validate the request body
//     if (!email || !password) {
//         return res.status(400).json({ error: 'Missing required fields' });
//     }

//     // Connect to the MySQL database
//     const connection = mysql.createConnection(process.env.DATABASE_URL);

//     // Check if the user exists
//     connection.query('SELECT * FROM users WHERE email = ?', email, (err, results) => {

//         if (err) {
//             connection.end();
//             return res.status(500).json({ error: 'Internal Server Error' });
//         }

//         if (results.length === 0) {
//             connection.end();
//             return res.status(404).json({ error: 'User not found. Please sign up.' });
//         }

//         console.log("Debugging output starts here");
//         const user = results[0];
//         console.log(results);
//         console.log(user.uid);
//         console.log(password);
//         const newpassword  =bcrypt.hash(password, 10);
//         console.log(newpassword);
//         console.log(user.password);
//         console.log( bcrypt.compare(password, user.password));
        
//         console.log("Debugging output ends here");


//         const passwordMatches = bcrypt.compare(password, user.password);
//         console.log(passwordMatches);

//         if (passwordMatches) {
//             const jwtSecretKey = crypto.randomBytes(32).toString('hex');
//             const token = jwt.sign({ userId: user.uid },jwtSecretKey, { expiresIn: '1h' });
//             console.log(jwtSecretKey);
//             return res.status(200).json({ message: 'Login successful', token });
            
//         } 
//         else {
//             connection.end();
//             return res.status(401).json({ error: 'Invalid credentials' });
//         }
//     });
// });

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    // Validate the request body
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    // Connect to the MySQL database
    const connection = mysql.createConnection(process.env.DATABASE_URL);
  
    try {
      // Check if the user exists
      const results = await new Promise((resolve, reject) => {
        connection.query('SELECT * FROM users WHERE email = ?', email, (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      });
  
      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found. Please sign up.' });
      }
  
      const user = results[0];
  
      // Compare the provided password with the hashed password stored in the database
      const passwordMatches = await bcrypt.compare(password, user.password);
  
      if (passwordMatches) {
        const jwtSecretKey = crypto.randomBytes(32).toString('hex');
        const token = jwt.sign({ userId: user.uid }, jwtSecretKey, { expiresIn: '1h' });
  
        return res.status(200).json({ message: 'Login successful', token });
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      connection.end(); // Make sure to close the connection after use
    }
  });


const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    debug: true,
    auth: {
        user: 'ritvikpendyala19@gmail.com',
        pass: process.env.PASS,
    },
});


app.post('/sendOTP', (req, res) => {
    const { email } = req.body;

    // Generate an OTP (e.g., a 6-digit number)
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Read the email template file
    const templateFile = fs.readFileSync('./email-template.html', 'utf-8');

    // Compile the template using Handlebars
    const template = handlebars.compile(templateFile);

    // Render the email template with OTP data
    const emailContent = template({ otp });

    // Configure the email message
    const mailOptions = {
        from: 'pendyala20096@iiitd.ac.in',
        to: email,
        subject: 'OTP Verification',
        html: emailContent,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            console.log(error)
            return res.status(500).json({ error: 'Failed to send OTP' });
        }

        storeOTPInDatabase(email, otp);
        return res.status(200).json({ message: 'OTP sent successfully' });
    });
});


// Function to store the OTP with timestamp in the 'otps' table
function storeOTPInDatabase(email, otp) {
    // Generate a timestamp for the OTP expiration (5 minutes from now)
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);

    // Connect to the MySQL database
    const connection = mysql.createConnection(process.env.DATABASE_URL);

    // Insert the OTP record into the 'otps' table along with the expiration timestamp
    connection.query('INSERT INTO otps (email, otp, expiration_time) VALUES (?, ?, ?)', [email, otp, expirationTime], (err, result) => {
        if (err) {
            console.error('Error storing OTP in database:', err);
        } else {
            console.log('OTP stored in database:', result.insertId);
        }

        // Close the database connection
        connection.end();
    });
}


// Function to update user verification status in the database
function updateUserVerificationStatusInDatabase(email) {
    // Connect to the MySQL database
    const connection = mysql.createConnection(process.env.DATABASE_URL);

    // Update the 'isVerified' field in the 'users' table for the given email
    connection.query('UPDATE users SET isVerified = ? WHERE email = ?', [true, email], (err, result) => {
        if (err) {
            console.error('Error updating user verification status:', err);
        } else {
            console.log('User verification status updated for email:', email);
        }

        // Close the database connection
        connection.end();
    });


}

// Function to delete OTP from the database based on email and OTP
function deleteOTPFromDatabase(email, otp) {
    // Connect to the MySQL database
    const connection = mysql.createConnection(process.env.DATABASE_URL);

    // Delete the OTP entry from the 'otps' table based on email and OTP
    connection.query('DELETE FROM otps WHERE email = ? AND otp = ?', [email, otp], (err, result) => {
        if (err) {
            console.error('Error deleting OTP from database:', err);
        } else {
            console.log('OTP deleted from database for email:', email);
        }

        // Close the database connection
        connection.end();
    });
};

// Function to get the userID based on email
function getUserIdFromDatabase(email) {
    // Connect to the MySQL database
    const connection = mysql.createConnection(process.env.DATABASE_URL);

    return new Promise((resolve, reject) => {
        // Query the 'users' table to fetch the userID for the given email
        connection.query('SELECT uid FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                console.error('Error getting userID from database:', err);
                reject(err);
            } else {
                if (results.length === 0) {
                    resolve(null); // No user found with the given email
                } else {
                    const userID = parseInt(results[0].userID, 10); // Convert userID to integer
                    resolve(userID); // User found, resolve with the userID
                }
            }

            // Close the database connection
            connection.end();
        });
    });
};






app.post('/verifyOTP', (req, res) => {
    const { email, otp } = req.body;

    // Connect to the MySQL database
    const connection = mysql.createConnection(process.env.DATABASE_URL);

    // Query the 'otps' table to fetch the OTP record for the given email
    connection.query('SELECT * FROM otps WHERE email = ? AND otp = ?', [email, otp], (err, results) => {
        if (err) {
            console.error('Error verifying OTP:', err);
            return res.status(500).json({ error: 'Failed to verify OTP' });
        }

        // Check if an OTP record was found for the given email and OTP
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid OTP' });
        }

        const otpRecord = results[0];
        const expirationTime = new Date(otpRecord.expiration_time);

        // Compare the current time with the expiration time
        if (new Date() > expirationTime) {
            return res.status(401).json({ error: 'OTP has expired' });
        }
        updateUserVerificationStatusInDatabase(email); // Replace this with your database update logic
        deleteOTPFromDatabase(email, otp);
        // Check if the user exists
        connection.query('SELECT * FROM users WHERE email = ?', email, (err, results) => {

            if (err) {
                connection.end();
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.length === 0) {
                connection.end();
                return res.status(404).json({ error: 'User not found. Please sign up.' });
            }


            const user = results[0];
            console.log(user.uid);
            const jwtSecretKey = crypto.randomBytes(32).toString('hex');
            const token = jwt.sign({ userId: user.uid },jwtSecretKey, { expiresIn: '1h' });
            console.log(jwtSecretKey);
            return res.status(200).json({ message: 'Verification successful', token });
        });
        connection.end();
    });

});

app.post('/loginWithOTP', async (req, res) => {
    const { phoneNumber } = req.body;
  
    try {
      // Generate a random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000);
  
      // Send the OTP via SMS
      await client.messages.create({
        body: `The OTP to authenticate yourself to Pendi is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
  
      return res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Error sending OTP:', error);
      return res.status(500).json({ error: 'Failed to send OTP' });
    }
  });
  

app.listen(6969, () => {
    console.log("Server started on 6969...")
});


// Alarm stuff


