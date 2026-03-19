import sgMail from '@sendgrid/mail';

const EMAIL_FROM = process.env.EMAIL_USER;
const EMAIL_FROM_NAME =
  process.env.EMAIL_FROM_NAME || process.env.BLOG_NAME || "Your Blog Name";
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || EMAIL_FROM;
const FRONTEND_BASE_URL = (process.env.FRONTEND_URL || "https://your-blog.vercel.app").replace(
  /\/+$/,
  ""
);

const EMAIL_DEBUG = process.env.EMAIL_DEBUG === "true";
if (EMAIL_DEBUG) {
  console.log("🔑 SENDGRID_API_KEY exists:", !!process.env.SENDGRID_API_KEY);
  console.log("🔑 SENDGRID_API_KEY length:", process.env.SENDGRID_API_KEY?.length);
}

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sanitizeHeader = (value = "") =>
  String(value).replace(/[\r\n]+/g, " ").trim();

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildUnsubscribeUrl = (email) =>
  `${FRONTEND_BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

const buildPostUrl = (slug) =>
  `${FRONTEND_BASE_URL}/posts/${encodeURIComponent(slug)}`;

// Set API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send welcome email to new subscriber
 * @param {string} email - Subscriber's email address
 */
export const sendWelcomeEmail = async (email) => {
  console.log("📤 Sending welcome email to:", email);

  const safeFromName = sanitizeHeader(EMAIL_FROM_NAME);
  const homeUrl = FRONTEND_BASE_URL;
  const unsubscribeUrl = buildUnsubscribeUrl(email);

  const msg = {
    to: email,
    from: {
      email: EMAIL_FROM,
      name: safeFromName, // ← Add sender name
    },
    replyTo: EMAIL_REPLY_TO, // ← Add reply-to
    subject: `✅ Welcome to ${safeFromName}`,
    text: `Welcome to ${safeFromName}!\n\nThanks for subscribing.\n\nVisit: ${homeUrl}\nUnsubscribe: ${unsubscribeUrl}\n`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .benefits { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .benefits li { margin: 10px 0; }
          .button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .footer a { color: #667eea; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome Aboard!</h1>
          </div>
          <div class="content">
            <h2>Hey there! 👋</h2>
            <p>Thanks for joining our community! We're excited to have you.</p>
            
            <div class="benefits">
              <strong>Here's what you'll get:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>📬 Weekly roundup of our best content</li>
                <li>💡 Exclusive tips and tutorials</li>
                <li>🎯 Early access to new features</li>
                <li>🚀 No spam, just quality content</li>
              </ul>
            </div>
            
            <p><strong>Pro tip:</strong> Add <code>${escapeHtml(EMAIL_FROM || "our email")}</code> to your contacts so our emails always reach your inbox!</p>
            
            <center>
              <a href="${homeUrl}" class="button">Visit Our Blog →</a>
            </center>
          </div>
          <div class="footer">
            <p>You're receiving this because you subscribed at ${escapeHtml(homeUrl)}</p>
            <p><a href="${unsubscribeUrl}">Unsubscribe</a> | <a href="${homeUrl}">View in Browser</a></p>
            <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} ${escapeHtml(safeFromName)}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("✅ Email sent successfully via SendGrid");
  } catch (error) {
    console.error("❌ SendGrid error:", error.response?.body || error.message);
    throw error;
  }
};

/**
 * Send notification email about new blog post
 * @param {string} email - Subscriber's email address
 * @param {Object} post - Post details
 */
export const sendNewPostNotification = async (email, post) => {
  const safeFromName = sanitizeHeader(EMAIL_FROM_NAME);
  const safeTitleHeader = sanitizeHeader(post?.title || "New post");
  const safeTitle = escapeHtml(post?.title || "New post");
  const excerptText = stripHtml(post?.excerpt) || "Check out our latest post!";
  const safeExcerpt = escapeHtml(excerptText);
  const postUrl = buildPostUrl(post?.slug || "");
  const unsubscribeUrl = buildUnsubscribeUrl(email);
  const preheader = escapeHtml(`New post: ${safeTitleHeader}`);

  const msg = {
    to: email,
    from: { email: EMAIL_FROM, name: safeFromName },
    replyTo: EMAIL_REPLY_TO,
    subject: `New Post: ${safeTitleHeader}`,
    text: `New post on ${safeFromName}\n\n${safeTitleHeader}\n\n${excerptText}\n\nRead: ${postUrl}\nUnsubscribe: ${unsubscribeUrl}\n`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 28px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; }
          .content { padding: 26px; }
          .content h2 { margin: 0 0 10px; color: #111; }
          .button { display: inline-block; padding: 14px 22px; background: #667eea; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .footer { background: #f8f9fa; text-align: center; padding: 18px; font-size: 12px; color: #666; }
          .footer a { color: #667eea; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">${preheader}</div>
          <div class="header">
            <h1>📝 New post on ${escapeHtml(safeFromName)}</h1>
          </div>
          <div class="content">
            <h2>${safeTitle}</h2>
            <p>${safeExcerpt}</p>
            <center>
              <a href="${postUrl}" class="button">Read the post →</a>
            </center>
          </div>
          <div class="footer">
            <p>You're receiving this because you subscribed to our newsletter.</p>
            <p><a href="${unsubscribeUrl}">Unsubscribe</a> | <a href="${postUrl}">View in Browser</a></p>
            <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} ${escapeHtml(safeFromName)}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await sgMail.send(msg);
};

/**
 * Send notification to all subscribers
 * @param {Object} post - Post details
 * @param {Array} subscribers - Array of subscriber emails
 */
export const notifySubscribers = async (post, subscribers) => {
  const emailPromises = subscribers.map((email) =>
    sendNewPostNotification(email, post)
  );

  await Promise.allSettled(emailPromises);
};
