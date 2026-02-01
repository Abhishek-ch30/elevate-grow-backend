const { prisma } = require('../db/prisma');
const { logAuthEvent } = require('../utils/logger');

/**
 * User service - Prisma operations with proper access control
 * Users can only access their own data
 */

/**
 * Get user profile
 */
const getUserProfile = async (userId, userRole) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Profile not found or access denied');
    }

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      profession: user.profession,
      college: user.college,
      company: user.company,
      role: user.role,
      is_admin: user.is_admin,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 * Users can only update their own profile and cannot change role/is_admin
 */
const updateUserProfile = async (userId, userRole, updateData) => {
  try {
    const { full_name, phone, profession, college, company } = updateData;

    // Validate profession if provided
    if (profession && !['student', 'professional'].includes(profession)) {
      throw new Error('Profession must be either "student" or "professional"');
    }

    // Build update object with only non-null values
    const updateFields = {};
    if (full_name !== undefined) updateFields.full_name = full_name;
    if (phone !== undefined) updateFields.phone = phone ? phone.toString() : null;
    if (profession !== undefined) updateFields.profession = profession;
    if (college !== undefined) updateFields.college = college;
    if (company !== undefined) updateFields.company = company;
    // updated_at is handled automatically by Prisma @updatedAt

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateFields
    });

    if (!user) {
      throw new Error('Profile not found or access denied');
    }

    logAuthEvent('PROFILE_UPDATED', userId, { fields: Object.keys(updateData) });

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      profession: user.profession,
      college: user.college,
      company: user.company,
      role: user.role,
      is_admin: user.is_admin,
      updated_at: user.updated_at
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Get user's enrollments
 */
const getUserEnrollments = async (userId, userRole) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { user_id: userId },
      include: {
        training_program: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            price: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Get payment information for each enrollment
    const enrollmentsWithPayments = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get the latest payment for this enrollment
        const payment = await prisma.payment.findFirst({
          where: {
            user_id: userId,
            training_id: enrollment.training_id
          },
          orderBy: { created_at: 'desc' }
        });

        return {
          id: enrollment.id,
          status: enrollment.status,
          created_at: enrollment.created_at,
          updated_at: enrollment.updated_at,
          training_id: enrollment.training_program.id,
          training_title: enrollment.training_program.title,
          training_description: enrollment.training_program.description,
          duration: enrollment.training_program.duration,
          price: enrollment.training_program.price,
          payment: payment ? {
            id: payment.id,
            amount: payment.amount,
            payment_method: payment.payment_method,
            transaction_reference: payment.transaction_reference,
            status: payment.status,
            created_at: payment.created_at,
            updated_at: payment.updated_at
          } : null
        };
      })
    );

    return enrollmentsWithPayments;

  } catch (error) {
    throw error;
  }
};

/**
 * Create new enrollment
 */
const createEnrollment = async (userId, userRole, trainingId) => {
  try {
    if (!trainingId) {
      throw new Error('Training ID is required');
    }

    // Check if training program exists and is active
    const training = await prisma.trainingProgram.findFirst({
      where: {
        id: trainingId,
        is_active: true
      }
    });

    if (!training) {
      throw new Error('Training program not found or not active');
    }

    // Check if user is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        user_id_training_id: {
          user_id: userId,
          training_id: trainingId
        }
      }
    });

    if (existingEnrollment) {
      throw new Error('Already enrolled in this training program');
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        user_id: userId,
        training_id: trainingId,
        status: 'pending_payment'
      },
      include: {
        training_program: true
      }
    });

    logAuthEvent('ENROLLMENT_CREATED', userId, {
      enrollmentId: enrollment.id,
      trainingId: trainingId,
      trainingTitle: training.title
    });

    return {
      id: enrollment.id,
      user_id: userId,
      training_id: trainingId,
      status: enrollment.status,
      created_at: enrollment.created_at,
      training: {
        id: training.id,
        title: training.title,
        price: training.price,
        is_active: training.is_active
      }
    };

  } catch (error) {
    if (error.code === 'P2002') {
      throw new Error('Already enrolled in this training program');
    }
    throw error;
  }
};

/**
 * Create new enrollment with user details update
 */
const createEnrollmentWithDetails = async (userId, userRole, trainingId, profileData) => {
  try {
    if (!trainingId) {
      throw new Error('Training ID is required');
    }

    // Check if training program exists and is active
    const training = await prisma.trainingProgram.findFirst({
      where: {
        id: trainingId,
        is_active: true
      }
    });

    if (!training) {
      throw new Error('Training program not found or not active');
    }

    // Check if user is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        user_id_training_id: {
          user_id: userId,
          training_id: trainingId
        }
      }
    });

    if (existingEnrollment) {
      // If enrollment exists but payment is still pending, allow retry by returning existing enrollment
      if (existingEnrollment.status === 'pending_payment') {
        // Update user profile with the latest details
        await prisma.user.update({
          where: { id: userId },
          data: {
            full_name: profileData.full_name,
            phone: profileData.phone
          }
        });

        logAuthEvent('ENROLLMENT_RETRY', userId, {
          enrollmentId: existingEnrollment.id,
          trainingId: trainingId,
          trainingTitle: training.title
        });

        return {
          id: existingEnrollment.id,
          user_id: userId,
          training_id: trainingId,
          status: existingEnrollment.status,
          created_at: existingEnrollment.created_at,
          training: {
            id: training.id,
            title: training.title,
            price: training.price,
            is_active: training.is_active
          }
        };
      } else {
        throw new Error('Already enrolled in this training program');
      }
    }

    // Update user profile with provided details and create enrollment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user profile
      await tx.user.update({
        where: { id: userId },
        data: {
          full_name: profileData.full_name,
          phone: profileData.phone
        }
      });

      // Create enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          user_id: userId,
          training_id: trainingId,
          status: 'pending_payment'
        },
        include: {
          training_program: true
        }
      });

      return enrollment;
    });

    logAuthEvent('ENROLLMENT_WITH_DETAILS_CREATED', userId, {
      enrollmentId: result.id,
      trainingId: trainingId,
      trainingTitle: training.title,
      updatedProfile: profileData
    });

    return {
      id: result.id,
      user_id: userId,
      training_id: trainingId,
      status: result.status,
      created_at: result.created_at,
      training: {
        id: training.id,
        title: training.title,
        price: training.price,
        is_active: training.is_active
      }
    };

  } catch (error) {
    if (error.code === 'P2002') {
      throw new Error('Already enrolled in this training program');
    }
    throw error;
  }
};

/**
 * Generate UPI payment link
 */
const generateUpiLink = (upiId, merchantName, amount, transactionNote, transactionRef) => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: merchantName,
    am: amount.toString(),
    tn: transactionNote,
    tr: transactionRef
  });
  
  return `upi://pay?${params.toString()}`;
};

/**
 * Generate QR code data URL
 */
const generateQRCode = async (text) => {
  const QRCode = require('qrcode');
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Initiate payment for enrollment
 */
const initiatePaymentForEnrollment = async (userId, userRole, enrollmentId) => {
  try {
    // Get enrollment details
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        user_id: userId
      },
      include: {
        training_program: true,
        user: true
      }
    });

    if (!enrollment) {
      throw new Error('Enrollment not found or access denied');
    }

    if (enrollment.status !== 'pending_payment') {
      throw new Error('Enrollment is not in pending payment status');
    }

    // Check if there's already an active payment session and clean up expired ones
    const existingPayment = await prisma.payment.findFirst({
      where: {
        user_id: userId,
        training_id: enrollment.training_id,
        status: 'pending_verification'
      }
    });

    if (existingPayment) {
      // Check if payment session is still valid (within 5 minutes)
      const sessionAge = Date.now() - new Date(existingPayment.created_at).getTime();
      const FIVE_MINUTES = 5 * 60 * 1000;
      
      if (sessionAge >= FIVE_MINUTES) {
        // Mark expired payment as failed
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: { status: 'failed' }
        });
      } else {
        // Return the existing active payment session instead of throwing error
        const upiLink = generateUpiLink(
          process.env.COMPANY_UPI_ID || 'qthink@paytm',
          process.env.COMPANY_NAME || 'QThink Solutions',
          enrollment.training_program.price || 0,
          `Payment for ${enrollment.training_program.title}`,
          `TXN-${Date.now()}-${enrollmentId.slice(-6)}`
        );

        const qrCodeDataUrl = await generateQRCode(upiLink);
        const remainingTime = Math.max(0, Math.floor((FIVE_MINUTES - sessionAge) / 1000));

        return {
          payment_id: existingPayment.id,
          enrollment_id: enrollmentId,
          training_title: enrollment.training_program.title,
          amount: enrollment.training_program.price || 0,
          upi_link: upiLink,
          qr_code: qrCodeDataUrl,
          payment_reference: `TXN-${Date.now()}-${enrollmentId.slice(-6)}`,
          expires_at: new Date(new Date(existingPayment.created_at).getTime() + FIVE_MINUTES).toISOString(),
          timer_duration: remainingTime
        };
      }
    }

    // Create new payment record
    const paymentReference = `TXN-${Date.now()}-${enrollmentId.slice(-6)}`;
    const payment = await prisma.payment.create({
      data: {
        user_id: userId,
        training_id: enrollment.training_id,
        amount: enrollment.training_program.price || 0,
        payment_method: 'UPI',
        status: 'pending_verification'
      }
    });

    // Generate UPI payment link
    const companyUpiId = process.env.COMPANY_UPI_ID || 'qthink@paytm';
    const companyName = process.env.COMPANY_NAME || 'QThink Solutions';
    const amount = enrollment.training_program.price || 0;
    const transactionNote = `Payment for ${enrollment.training_program.title}`;
    
    const upiLink = generateUpiLink(
      companyUpiId,
      companyName,
      amount,
      transactionNote,
      paymentReference
    );

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(upiLink);

    // Calculate expiry time (5 minutes from now)
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    logAuthEvent('PAYMENT_SESSION_INITIATED', userId, {
      paymentId: payment.id,
      enrollmentId: enrollmentId,
      trainingId: enrollment.training_id,
      amount: amount
    });

    return {
      payment_id: payment.id,
      enrollment_id: enrollmentId,
      training_title: enrollment.training_program.title,
      amount: amount,
      upi_link: upiLink,
      qr_code: qrCodeDataUrl,
      payment_reference: paymentReference,
      expires_at: expiryTime.toISOString(),
      timer_duration: 300 // 5 minutes in seconds
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Confirm payment by user
 */
const confirmPayment = async (userId, userRole, paymentId, transactionReference) => {
  try {
    // Find payment
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        user_id: userId
      }
    });

    if (!payment) {
      throw new Error('Payment not found or access denied');
    }

    if (payment.status !== 'pending_verification') {
      throw new Error('Payment is not in pending verification status');
    }

    // Check if payment session is still valid (within 5 minutes)
    const sessionAge = Date.now() - new Date(payment.created_at).getTime();
    const FIVE_MINUTES = 5 * 60 * 1000;
    
    if (sessionAge >= FIVE_MINUTES) {
      // Mark payment as failed due to timeout
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'failed' }
      });
      throw new Error('Payment session expired. Please retry payment.');
    }

    // Update payment with transaction reference
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        transaction_reference: transactionReference || null,
        updated_at: new Date()
      }
    });

    logAuthEvent('PAYMENT_CONFIRMED_BY_USER', userId, {
      paymentId: paymentId,
      transactionReference: transactionReference
    });

    return {
      id: updatedPayment.id,
      status: updatedPayment.status,
      transaction_reference: updatedPayment.transaction_reference,
      message: 'Your payment is under verification. You will be notified once confirmed.'
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Get payment status
 */
const getPaymentStatus = async (userId, userRole, paymentId) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        user_id: userId
      },
      include: {
        training_program: {
          select: { title: true }
        }
      }
    });

    if (!payment) {
      throw new Error('Payment not found or access denied');
    }

    // Check if payment session is expired
    const sessionAge = Date.now() - new Date(payment.created_at).getTime();
    const FIVE_MINUTES = 5 * 60 * 1000;
    
    let status = payment.status;
    if (status === 'pending_verification' && sessionAge >= FIVE_MINUTES) {
      // Mark as failed and update status
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'failed' }
      });
      status = 'failed';
    }

    return {
      id: payment.id,
      status: status,
      amount: payment.amount,
      training_title: payment.training_program.title,
      transaction_reference: payment.transaction_reference,
      created_at: payment.created_at,
      is_expired: sessionAge >= FIVE_MINUTES && payment.status === 'pending_verification'
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Get user's payments
 */
const getUserPayments = async (userId, userRole) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { user_id: userId },
      include: {
        training_program: {
          select: { title: true, id: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      transaction_reference: payment.transaction_reference,
      status: payment.status,
      created_at: payment.created_at,
      training_id: payment.training_program.id,
      training_title: payment.training_program.title
    }));

  } catch (error) {
    throw error;
  }
};

/**
 * Create payment record
 */
const createPayment = async (userId, userRole, paymentData) => {
  try {
    const { training_id, amount, payment_method, transaction_reference } = paymentData;

    if (!training_id || !amount || !payment_method) {
      throw new Error('Training ID, amount, and payment method are required');
    }

    // Verify user has enrollment for this training
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        user_id_training_id: {
          user_id: userId,
          training_id: training_id
        }
      }
    });

    if (!enrollment) {
      throw new Error('No enrollment found for this training program');
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        user_id: userId,
        training_id: training_id,
        amount: parseFloat(amount),
        payment_method,
        transaction_reference,
        status: 'pending_verification'
      }
    });

    logAuthEvent('PAYMENT_CREATED', userId, {
      paymentId: payment.id,
      trainingId: training_id,
      amount: amount,
      method: payment_method
    });

    return {
      id: payment.id,
      user_id: userId,
      training_id: training_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      transaction_reference: payment.transaction_reference,
      status: payment.status,
      created_at: payment.created_at
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Get user's certificates
 */
const getUserCertificates = async (userId, userRole) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { user_id: userId },
      include: {
        training_program: {
          select: { title: true, id: true }
        }
      },
      orderBy: { issue_date: 'desc' }
    });

    return certificates.map(certificate => ({
      id: certificate.id,
      certificate_id: certificate.certificate_id,
      issue_date: certificate.issue_date,
      file_url: certificate.file_url,
      created_at: certificate.created_at,
      training_id: certificate.training_program.id,
      training_title: certificate.training_program.title
    }));

  } catch (error) {
    throw error;
  }
};

/**
 * Get available training programs
 * Users can only see active programs
 */
const getAvailableTrainingPrograms = async (userId, userRole) => {
  try {
    const programs = await prisma.trainingProgram.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' }
    });

    return programs.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description,
      duration: program.duration,
      price: program.price,
      created_at: program.created_at
    }));

  } catch (error) {
    throw error;
  }
};

/**
 * Get single training program details
 */
const getTrainingProgramDetails = async (userId, userRole, trainingId) => {
  try {
    const program = await prisma.trainingProgram.findFirst({
      where: {
        id: trainingId,
        is_active: true
      }
    });

    if (!program) {
      throw new Error('Training program not found or not active');
    }

    return {
      id: program.id,
      title: program.title,
      description: program.description,
      duration: program.duration,
      price: program.price,
      created_at: program.created_at
    };

  } catch (error) {
    throw error;
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserEnrollments,
  createEnrollment,
  createEnrollmentWithDetails,
  initiatePaymentForEnrollment,
  confirmPayment,
  getPaymentStatus,
  getUserPayments,
  createPayment,
  getUserCertificates,
  getAvailableTrainingPrograms,
  getTrainingProgramDetails
};
