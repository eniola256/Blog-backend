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
    from: {
      email: process.env.EMAIL_USER,
      name: "Your Blog Name" // ← Add sender name
    },
    replyTo: process.env.EMAIL_USER, // ← Add reply-to
    subject: "✅ Welcome to [Your Blog Name]",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
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
            
            <p><strong>Pro tip:</strong> Add <code>${process.env.EMAIL_USER}</code> to your contacts so our emails always reach your inbox!</p>
            
            <center>
              <a href="${process.env.FRONTEND_URL || 'https://your-blog.vercel.app'}" class="button">Visit Our Blog →</a>
            </center>
          </div>
          <div class="footer">
            <p>You're receiving this because you subscribed at ${process.env.FRONTEND_URL || 'our blog'}</p>
            <p><a href="${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a> | <a href="${process.env.FRONTEND_URL}">View in Browser</a></p>
            <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} Your Blog. All rights reserved.</p>
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