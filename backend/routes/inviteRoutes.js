const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/adminMiddleware');
const allowedOrigins = require('../config/allowedOrigins');
const { getActor, escapeHtml } = require('../utils/userInfo');
const { logActivity } = require('../controllers/activityController');
const { sendMail } = require('../config/mailer');

const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;

// Invites send real email from our account: keep them scarce
const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user?.uid || ipKeyGenerator(req.ip),
  message: { message: 'Invite limit reached. Try again in an hour.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

// @route   POST /api/invite
// @access  Admin
router.post('/', verifyToken, isAdmin, inviteLimiter, async (req, res) => {
  const toEmail = typeof req.body.to_email === 'string' ? req.body.to_email.trim() : '';
  if (!EMAIL_RE.test(toEmail) || toEmail.length > 254) {
    return res.status(400).json({ message: 'Enter a valid email address' });
  }

  const actor = await getActor(req.user);
  // Link and copy are built server-side so the endpoint can't be used to mail arbitrary content
  const inviteLink = `${allowedOrigins[0]}/signup`;
  const senderName = escapeHtml(actor.name);

  const emailHTML = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1E1F21; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #3E4045;">
      <div style="background-color: #18191B; padding: 20px; border-bottom: 1px solid #2B2D31; text-align: center;">
        <h2 style="margin: 0; color: #a855f7; letter-spacing: 1px;">⚡ PULSE WORKSPACE</h2>
      </div>
      <div style="padding: 30px;">
        <h3 style="font-size: 20px; margin-top: 0;">You've been invited!</h3>
        <p style="color: #cbd5e1; line-height: 1.6;">
          <strong>${senderName}</strong> has invited you to collaborate on their Pulse workspace.
        </p>
        <div style="background-color: #111; border-left: 4px solid #a855f7; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-style: italic; color: #94a3b8;">"I've set up our workspace on Pulse. Join me so we can sync our tasks and start collaborating in real-time!"</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${escapeHtml(inviteLink)}" style="background-color: #9333ea; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Invitation</a>
        </div>
      </div>
      <div style="background-color: #111; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
        This email was sent securely via Pulse.
      </div>
    </div>
  `;

  try {
    await sendMail({
      to: toEmail,
      subject: `${actor.name.replace(/[\r\n]/g, ' ')} invited you to join Pulse`,
      html: emailHTML
    });
    await logActivity(actor, `Invited ${toEmail} to the workspace`, 'user');
    res.status(200).json({ message: 'Invitation sent' });
  } catch (error) {
    console.error('Invite error:', error.message);
    res.status(502).json({ message: 'Failed to send invitation' });
  }
});

module.exports = router;
