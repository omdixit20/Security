const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('./models/User');
const Document = require('./models/Document'); // Assuming you have a Document model

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// MongoDB connection
const mongoURI = 'mongodb://localhost:27017/art-platform'; // Update with your MongoDB URI

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((err) => {
    console.error('Failed to connect to MongoDB', err);
});

// Serve the index page
app.get('/', (req, res) => {
    res.render('index');
});

// Serve security settings page
app.get('/security-settings', async (req, res) => {
    const userId = req.query.userId; // Use query parameters or other methods to get userId
    if (!userId) return res.status(400).send('User ID is required');

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).send('User not found');
        res.render('security-settings', { is2FAEnabled: user.is2FAEnabled });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Handle toggling 2FA
app.post('/security-settings/toggle-2fa', async (req, res) => {
    const userId = req.body.userId; // Assuming userId is sent in the body
    if (!userId) return res.status(400).send('User ID is required');

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).send('User not found');

        if (user.is2FAEnabled) {
            user.is2FAEnabled = false;
            user.twoFA.secret = null;
        } else {
            const secret = speakeasy.generateSecret({ name: 'Art Platform' });
            user.twoFA.secret = secret.base32;
            user.is2FAEnabled = true;
        }
        await user.save();
        const qrCodeUrl = user.is2FAEnabled ? await qrcode.toDataURL(secret.otpauth_url) : null;
        res.render('twofa-setup', { qrCodeUrl: qrCodeUrl, verificationStatus: null });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Serve 2FA setup page
app.get('/twofa-setup', async (req, res) => {
    const userId = req.query.userId; // Use query parameters or other methods to get userId
    if (!userId) return res.status(400).send('User ID is required');

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).send('User not found');
        if (user.is2FAEnabled) {
            const qrCodeUrl = await qrcode.toDataURL(user.twoFA.secret);
            res.render('twofa-setup', { qrCodeUrl: qrCodeUrl, verificationStatus: null });
        } else {
            res.redirect('/security-settings');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Handle 2FA verification
app.post('/verify-2fa', async (req, res) => {
    const { token, userId } = req.body; // Assuming userId is sent in the body
    if (!userId || !token) return res.status(400).send('User ID and token are required');

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).send('User not found');
        if (user.is2FAEnabled) {
            const verified = speakeasy.totp.verify({
                secret: user.twoFA.secret,
                encoding: 'base32',
                token
            });
            const verificationStatus = verified ? '2FA verified successfully' : 'Verification failed';
            res.render('twofa-setup', { qrCodeUrl: null, verificationStatus: verificationStatus });
        } else {
            res.render('twofa-setup', { qrCodeUrl: null, verificationStatus: '2FA not enabled' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Serve compliance documentation page
app.get('/compliance-documents', async (req, res) => {
    try {
        const documents = await Document.find();
        res.render('compliance-documentation', { documents: documents });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
