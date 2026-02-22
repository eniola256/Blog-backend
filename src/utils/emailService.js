import sgMail from '@sendgrid/mail';

// Debug: Log the API key (first 10 chars only for security)
console.log("🔑 SENDGRID_API_KEY exists:", !!process.env.SENDGRID_API_KEY);
console.log("🔑 SENDGRID_API_KEY starts with:", process.env.SENDGRID_API_KEY?.substring(0, 10));
console.log("🔑 SENDGRID_API_KEY length:", process.env.SENDGRID_API_KEY?.length);


// Set API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send welcome email to new subscriber
 * @param {string} email - Subscriber's email address
 */
export const sendWelcomeEmail = async (email) => {
  console.log("📤 Sending welcome email to:", email);
  
  const msg = {
    to: email,
    from: process.env.EMAIL_USER, // Must be verified in SendGrid!
    subject: "Welcome to Our Newsletter!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Our Newsletter!</h1>
          </div>
          <div class="content">
            <p>Thank you for subscribing to our blog newsletter!</p>
            <p>You'll now receive updates about our latest posts, news, and exclusive content directly in your inbox.</p>
            <p>Stay tuned for exciting updates!</p>
          </div>
          <div class="footer">
            <p>If you didn't subscribe, you can safely ignore this email.</p>
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
  const msg = {
    to: email,
    from: process.env.EMAIL_USER,
    subject: `New Post: ${post.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Blog Post!</h1>
          </div>
          <div class="content">
            <h2>${post.title}</h2>
            <p>${post.excerpt || "Check out our latest post!"}</p>
            <a href="${process.env.FRONTEND_URL}/posts/${post.slug}" class="button">Read More</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you subscribed to our newsletter.</p>
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