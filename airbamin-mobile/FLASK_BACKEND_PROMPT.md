# Flask Backend API Implementation - Tecbamin Email System

## Context
You are implementing email functionality for **Tecbamin** (formerly Airbamin), a mobile file transfer and screen mirroring application. The backend is Flask-based and currently handles user authentication through the API endpoint `https://tecbamin.com/api`.

## Brand Identity
- **Brand Name**: Tecbamin
- **Domain**: tecbamin.com
- **Colors**: Primary blue gradient theme
- **Logo**: Use Tecbamin logo in emails

## Required API Endpoints

### 1. Forgot Password / Password Reset
**Endpoint**: `POST /api/mobile/forgot-password`

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response** (Success):
```json
{
  "ok": true,
  "message": "Password reset link sent to your email"
}
```

**Response** (Email not found):
```json
{
  "ok": false,
  "error": "email_not_found"
}
```

**Functionality**:
1. Check if email exists in database
2. Generate a secure password reset token (use secrets.token_urlsafe(32))
3. Store token in database with expiration time (30 minutes)
4. Send password reset email with branded template
5. Return success response

### 2. Email Verification (Account Activation)
**Endpoint**: `POST /api/mobile/verify`

**Request**:
```json
{
  "email": "user@example.com",
  "code": "123456",
  "device_id": "android Device",
  "platform": "android"
}
```

**Response** (Success):
```json
{
  "ok": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
    "username": "username",
    "plan": "free"
  }
}
```

**Functionality**:
1. Verify the 6-digit code matches what was sent
2. Check code hasn't expired (15 minutes)
3. Mark email as verified in database
4. Generate JWT token
5. Return user data with token

### 3. Resend Verification Code
**Endpoint**: `POST /api/mobile/resend-verification`

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "ok": true,
  "message": "Verification code sent"
}
```

**Functionality**:
1. Generate new 6-digit verification code
2. Update code in database with new expiration
3. Send verification email
4. Return success

## Email Templates Required

All emails should maintain Tecbamin brand identity with:
- Tecbamin logo at the top
- Blue gradient color scheme
- Clean, professional design
- Mobile-responsive HTML
- Support for both English and Arabic (RTL)

### Template 1: Welcome / Email Verification

**Subject**: Welcome to Tecbamin - Verify Your Email

**Content**:
```
Hi [User Name],

Welcome to Tecbamin! We're excited to have you on board.

To complete your registration, please verify your email address using the code below:

[Verification Code: 123456]

This code will expire in 15 minutes.

If you didn't create a Tecbamin account, you can safely ignore this email.

Best regards,
The Tecbamin Team

[Tecbamin Logo]
© 2024 Tecbamin. All rights reserved.
```

### Template 2: Password Reset

**Subject**: Reset Your Tecbamin Password

**Content**:
```
Hi [User Name],

We received a request to reset your password for your Tecbamin account.

Click the button below to reset your password:

[Reset Password Button → https://tecbamin.com/reset-password?token=TOKEN_HERE]

This link will expire in 30 minutes.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

Best regards,
The Tecbamin Team

[Tecbamin Logo]
© 2024 Tecbamin. All rights reserved.
```

### Template 3: Password Changed Confirmation

**Subject**: Your Tecbamin Password Has Been Changed

**Content**:
```
Hi [User Name],

This email confirms that your Tecbamin account password was successfully changed.

If you made this change, no action is needed.

If you didn't make this change, please contact us immediately at support@tecbamin.com

Best regards,
The Tecbamin Team

[Tecbamin Logo]
© 2024 Tecbamin. All rights reserved.
```

### Template 4: Welcome Email (After Verification)

**Subject**: Welcome to Tecbamin!

**Content**:
```
Hi [User Name],

Thank you for verifying your email! Your Tecbamin account is now active.

Here's what you can do with Tecbamin:
- Transfer files seamlessly between devices
- Mirror your phone screen to desktop
- Connect devices on the same network
- Enjoy fast, secure transfers

Get started by downloading our mobile app and desktop client.

Need help? Visit our help center at https://tecbamin.com/help

Best regards,
The Tecbamin Team

[Tecbamin Logo]
© 2024 Tecbamin. All rights reserved.
```

## Flask Implementation Requirements

### Email Service Setup

```python
from flask import Flask, request, jsonify
from flask_mail import Mail, Message
import secrets
import datetime

app = Flask(__name__)

# Email configuration
app.config['MAIL_SERVER'] = 'smtp.your-provider.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'noreply@tecbamin.com'
app.config['MAIL_PASSWORD'] = 'your-email-password'
app.config['MAIL_DEFAULT_SENDER'] = ('Tecbamin', 'noreply@tecbamin.com')

mail = Mail(app)
```

### Database Models

```python
# Add these fields to your User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    username = db.Column(db.String(80), unique=True)
    email = db.Column(db.String(120), unique=True)
    password_hash = db.Column(db.String(200))
    email_verified = db.Column(db.Boolean, default=False)
    verification_code = db.Column(db.String(6))
    verification_code_expires = db.Column(db.DateTime)
    reset_token = db.Column(db.String(100))
    reset_token_expires = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
```

### Helper Functions

```python
def send_verification_email(user):
    """Send 6-digit verification code to user"""
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    # Store code in database
    user.verification_code = code
    user.verification_code_expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    db.session.commit()

    # Send email using Template 1
    msg = Message(
        subject='Welcome to Tecbamin - Verify Your Email',
        recipients=[user.email],
        html=render_template('emails/verification.html', user=user, code=code)
    )
    mail.send(msg)

def send_password_reset_email(user):
    """Send password reset link to user"""
    token = secrets.token_urlsafe(32)

    # Store token in database
    user.reset_token = token
    user.reset_token_expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
    db.session.commit()

    # Send email using Template 2
    reset_url = f'https://tecbamin.com/reset-password?token={token}'
    msg = Message(
        subject='Reset Your Tecbamin Password',
        recipients=[user.email],
        html=render_template('emails/password_reset.html', user=user, reset_url=reset_url)
    )
    mail.send(msg)
```

### API Route Examples

```python
@app.route('/api/mobile/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'ok': False, 'error': 'email_required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'ok': False, 'error': 'email_not_found'}), 404

    try:
        send_password_reset_email(user)
        return jsonify({
            'ok': True,
            'message': 'Password reset link sent to your email'
        }), 200
    except Exception as e:
        app.logger.error(f'Failed to send password reset email: {str(e)}')
        return jsonify({'ok': False, 'error': 'email_send_failed'}), 500

@app.route('/api/mobile/verify', methods=['POST'])
def verify_email():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')

    if not email or not code:
        return jsonify({'ok': False, 'error': 'missing_fields'}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'ok': False, 'error': 'user_not_found'}), 404

    # Check if code matches and hasn't expired
    if user.verification_code != code:
        return jsonify({'ok': False, 'error': 'invalid_code'}), 400

    if datetime.datetime.utcnow() > user.verification_code_expires:
        return jsonify({'ok': False, 'error': 'code_expired'}), 400

    # Mark email as verified
    user.email_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    db.session.commit()

    # Generate JWT token
    token = generate_jwt_token(user)

    # Send welcome email
    send_welcome_email(user)

    return jsonify({
        'ok': True,
        'token': token,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'username': user.username,
            'plan': user.plan or 'free'
        }
    }), 200
```

## HTML Email Template Structure

Create these files in `templates/emails/`:

1. `base.html` - Base template with Tecbamin branding
2. `verification.html` - Extends base, shows verification code
3. `password_reset.html` - Extends base, shows reset button
4. `password_changed.html` - Extends base, confirmation message
5. `welcome.html` - Extends base, welcome message

### Example Base Template (base.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .logo {
            color: white;
            font-size: 32px;
            font-weight: bold;
        }
        .content {
            background: white;
            padding: 40px 30px;
            border: 1px solid #e0e0e0;
        }
        .code-box {
            background: #f5f5f5;
            border: 2px dashed #667eea;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #667eea;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            background: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-radius: 0 0 10px 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">TECBAMIN</div>
    </div>
    <div class="content">
        {% block content %}{% endblock %}
    </div>
    <div class="footer">
        <p>© 2024 Tecbamin. All rights reserved.</p>
        <p>If you have questions, contact us at support@tecbamin.com</p>
    </div>
</body>
</html>
```

## Mobile App Integration

The mobile app (React Native) expects these API endpoints:

1. `POST /api/mobile/login` - Existing
2. `POST /api/mobile/register` - Existing (should send verification email)
3. `POST /api/mobile/verify` - Email verification with code
4. `POST /api/mobile/forgot-password` - Send reset link
5. `POST /api/mobile/resend-verification` - Resend verification code

All endpoints should return consistent JSON format:
```json
{
  "ok": true/false,
  "error": "error_code",
  "message": "Human readable message",
  "data": {}
}
```

## Security Considerations

1. **Rate Limiting**: Limit password reset and verification requests to 3 per hour per email
2. **Token Expiration**: Verification codes expire in 15 minutes, reset tokens in 30 minutes
3. **Secure Tokens**: Use `secrets.token_urlsafe()` for reset tokens
4. **HTTPS Only**: All API endpoints must use HTTPS
5. **Email Validation**: Validate email format before sending
6. **Logging**: Log all email sends for debugging and security auditing

## Testing Checklist

After implementation, test:

- [ ] User registers → Receives verification email with 6-digit code
- [ ] User enters code → Account activates, receives welcome email
- [ ] User clicks "Forgot Password" → Receives reset email with link
- [ ] User clicks reset link → Can set new password
- [ ] After password change → Receives confirmation email
- [ ] Invalid email → Returns 404 error
- [ ] Expired code/token → Returns appropriate error
- [ ] Email templates look good on mobile and desktop
- [ ] All links in emails work correctly
- [ ] Brand colors and logo display correctly

## Additional Notes

- Use the existing database schema and models
- Integrate with existing authentication system
- Ensure emails are mobile-responsive
- Support both dark and light mode for web views
- Include unsubscribe link if sending marketing emails
- Test with multiple email providers (Gmail, Outlook, etc.)

---

**Implementation Priority**:
1. Password reset endpoint (urgent - mobile app needs this)
2. Email verification improvements
3. Welcome email
4. Password change confirmation

Please implement all endpoints and email templates following Tecbamin's brand identity and ensuring a professional user experience.
