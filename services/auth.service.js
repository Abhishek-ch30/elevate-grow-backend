const bcrypt = require('bcryptjs');
const { prisma } = require('../db/prisma');
const { generateToken } = require('../utils/jwt');
const { logAuthEvent, logSecurityEvent } = require('../utils/logger');

/**
 * User signup service
 * Creates a regular user with role='user' and is_admin=false
 */
const userSignup = async (userData) => {
  const { full_name, email, phone, profession, college, company, password } = userData;

  try {
    // Validate required fields
    if (!full_name || !email || !password) {
      throw new Error('Full name, email, and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate profession if provided
    if (profession && !['student', 'professional'].includes(profession)) {
      throw new Error('Profession must be either "student" or "professional"');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      logAuthEvent('USER_SIGNUP_FAILED', null, {
        email: email,
        reason: 'email_exists'
      });
      throw new Error('Email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user with strict role controls
    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        phone: phone ? phone.toString() : null, // Ensure string
        profession: profession || null,
        college,
        company,
        role: 'user',
        is_admin: false,
        password: password_hash
      }
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      role: user.role,
      email: user.email,
      is_admin: user.is_admin
    });

    logAuthEvent('USER_SIGNUP_SUCCESS', user.id, {
      email: user.email,
      profession: user.profession
    });

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        profession: user.profession,
        college: user.college,
        company: user.company,
        role: user.role,
        is_admin: user.is_admin,
        created_at: user.created_at
      },
      token
    };

  } catch (error) {
    if (error.code === 'P2002') { // Prisma unique constraint violation
      logAuthEvent('USER_SIGNUP_FAILED', null, {
        email: email,
        reason: 'email_exists'
      });
      throw new Error('Email already exists');
    }

    logAuthEvent('USER_SIGNUP_FAILED', null, {
      email: email,
      error: error.message
    });
    throw error;
  }
};



/**
 * Login service
 * Authenticates user and returns token
 */
const login = async (email, password) => {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logAuthEvent('LOGIN_FAILED', null, {
        email: email,
        reason: 'user_not_found'
      });
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logAuthEvent('LOGIN_FAILED', user.id, {
        email: email,
        reason: 'invalid_password'
      });
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      role: user.role,
      email: user.email,
      is_admin: user.is_admin
    });

    logAuthEvent('LOGIN_SUCCESS', user.id, {
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_admin: user.is_admin
      },
      token
    };

  } catch (error) {
    console.error('LOGIN CONTROLLER ERROR:', error);
    throw error;
  }
};

/**
 * Change password service
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }

    // Get user's current password hash
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      logAuthEvent('PASSWORD_CHANGE_FAILED', userId, {
        reason: 'invalid_current_password'
      });
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const new_password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: new_password_hash
      }
    });

    logAuthEvent('PASSWORD_CHANGE_SUCCESS', userId);

    return { message: 'Password changed successfully' };

  } catch (error) {
    throw error;
  }
};

/**
 * Verify user exists and return basic info
 */
const verifyUser = async (userId) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      is_admin: user.is_admin
    };

  } catch (error) {
    throw error;
  }
};

module.exports = {
  userSignup,

  login,
  changePassword,
  verifyUser
};
