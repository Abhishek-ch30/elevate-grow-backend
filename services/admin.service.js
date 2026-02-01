const { prisma } = require('../db/prisma');
const { logAuthEvent } = require('../utils/logger');

/**
 * Admin service - Prisma operations with full access
 * Admins can access and modify all data
 */

/**
 * Get all users (admin only)
 */
const getAllUsers = async (adminId, adminRole, filters = {}) => {
  try {
    const where = {};

    // Apply filters
    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.profession) {
      where.profession = filters.profession;
    }

    if (filters.search) {
      where.OR = [
        { full_name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100
    });

    return users.map(user => ({
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
    }));

  } catch (error) {
    throw error;
  }
};

/**
 * Get user details by ID (admin only)
 */
const getUserById = async (adminId, adminRole, userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
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
 * Update user role/admin status (admin only)
 */
const updateUserRole = async (adminId, adminRole, userId, roleData) => {
  try {
    const { role, is_admin } = roleData;

    if (role && !['user', 'admin'].includes(role)) {
      throw new Error('Invalid role');
    }

    const updateFields = {};
    if (role !== undefined) updateFields.role = role;
    if (is_admin !== undefined) updateFields.is_admin = is_admin;
    // updated_at handled automatically

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateFields
    });

    if (!user) {
      throw new Error('User not found');
    }

    logAuthEvent('USER_ROLE_UPDATED', adminId, {
      targetUserId: userId,
      newRole: role,
      newIsAdmin: is_admin
    });

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      is_admin: user.is_admin,
      updated_at: user.updated_at
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Get all training programs (admin only)
 */
const getAllTrainingPrograms = async (adminId, adminRole) => {
  try {
    const programs = await prisma.trainingProgram.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        price: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return programs.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description,
      duration: program.duration,
      price: program.price,
      is_active: program.is_active,
      created_at: program.created_at,
      updated_at: program.updated_at,
      enrolled_count: program._count.enrollments
    }));

  } catch (error) {
    throw error;
  }
};

/**
 * Create training program (admin only)
 */
const createTrainingProgram = async (adminId, adminRole, programData) => {
  try {
    const { title, description, duration, price, is_active } = programData;

    if (!title) {
      throw new Error('Title is required');
    }

    const program = await prisma.trainingProgram.create({
      data: {
        title,
        description,
        duration,
        price,
        is_active: is_active !== false
      }
    });

    logAuthEvent('TRAINING_PROGRAM_CREATED', adminId, {
      programId: program.id,
      title: title
    });

    return {
      id: program.id,
      title: program.title,
      description: program.description,
      duration: program.duration,
      price: program.price,
      is_active: program.is_active,
      created_at: program.created_at
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Update training program (admin only)
 */
const updateTrainingProgram = async (adminId, adminRole, programId, updateData) => {
  try {
    const { title, description, duration, price, is_active } = updateData;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (duration !== undefined) updateFields.duration = duration;
    if (price !== undefined) updateFields.price = price;
    if (is_active !== undefined) updateFields.is_active = is_active;

    const program = await prisma.trainingProgram.update({
      where: { id: programId },
      data: updateFields
    });

    if (!program) {
      throw new Error('Training program not found');
    }

    logAuthEvent('TRAINING_PROGRAM_UPDATED', adminId, {
      programId: programId,
      fields: Object.keys(updateData)
    });

    return {
      id: program.id,
      title: program.title,
      description: program.description,
      duration: program.duration,
      price: program.price,
      is_active: program.is_active,
      updated_at: program.updated_at
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Delete training program (admin only)
 */
const deleteTrainingProgram = async (adminId, adminRole, programId) => {
  try {
    // Check if program exists
    const existingProgram = await prisma.trainingProgram.findUnique({
      where: { id: programId }
    });

    if (!existingProgram) {
      throw new Error('Training program not found');
    }

    // Check if there are any enrollments for this program
    const enrollmentCount = await prisma.enrollment.count({
      where: { training_id: programId }
    });

    if (enrollmentCount > 0) {
      throw new Error('Cannot delete training program with existing enrollments');
    }

    const deletedProgram = await prisma.trainingProgram.delete({
      where: { id: programId }
    });

    logAuthEvent('TRAINING_PROGRAM_DELETED', adminId, {
      programId: programId,
      title: existingProgram.title
    });

    return {
      id: deletedProgram.id,
      title: deletedProgram.title,
      message: 'Training program deleted successfully'
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Get all enrollments (admin only)
 */
const getAllEnrollments = async (adminId, adminRole, filters = {}) => {
  try {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.userId) {
      where.user_id = filters.userId;
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        user: {
          select: { full_name: true, email: true }
        },
        training_program: {
          select: { title: true, price: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 200
    });

    return enrollments.map(enrollment => ({
      id: enrollment.id,
      status: enrollment.status,
      created_at: enrollment.created_at,
      updated_at: enrollment.updated_at,
      user_id: enrollment.user_id,
      full_name: enrollment.user.full_name,
      email: enrollment.user.email,
      training_id: enrollment.training_id,
      training_title: enrollment.training_program.title,
      price: enrollment.training_program.price
    }));

  } catch (error) {
    throw error;
  }
};

/**
 * Update enrollment status (admin only)
 */
const updateEnrollmentStatus = async (adminId, adminRole, enrollmentId, status) => {
  try {
    if (!['pending_payment', 'enrolled', 'completed'].includes(status)) {
      throw new Error('Invalid status');
    }

    const enrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: status }
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    logAuthEvent('ENROLLMENT_STATUS_UPDATED', adminId, {
      enrollmentId: enrollmentId,
      newStatus: status
    });

    return {
      id: enrollment.id,
      user_id: enrollment.user_id,
      training_id: enrollment.training_id,
      status: enrollment.status,
      updated_at: enrollment.updated_at
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Get all payments (admin only)
 */
const getAllPayments = async (adminId, adminRole, filters = {}) => {
  try {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.userId) {
      where.user_id = filters.userId;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: { select: { full_name: true, email: true } },
        training_program: { select: { title: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 200
    });

    return payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      transaction_reference: payment.transaction_reference,
      status: payment.status,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      user_id: payment.user_id,
      full_name: payment.user.full_name,
      email: payment.user.email,
      training_id: payment.training_id,
      training_title: payment.training_program.title
    }));

  } catch (error) {
    throw error;
  }
};

/**
 * Update payment status (admin only)
 */
const updatePaymentStatus = async (adminId, adminRole, paymentId, status) => {
  try {
    if (!['pending_verification', 'verified', 'failed', 'refunded'].includes(status)) {
      throw new Error('Invalid payment status');
    }

    // Use transaction to update both payment and enrollment status
    const result = await prisma.$transaction(async (tx) => {
      // Update payment status
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: status }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // If payment is verified, update enrollment status to 'enrolled'
      if (status === 'verified') {
        await tx.enrollment.updateMany({
          where: {
            user_id: payment.user_id,
            training_id: payment.training_id,
            status: 'pending_payment'
          },
          data: {
            status: 'enrolled'
          }
        });
      }
      // If payment is failed/rejected, keep enrollment as 'pending_payment' so user can retry
      else if (status === 'failed') {
        await tx.enrollment.updateMany({
          where: {
            user_id: payment.user_id,
            training_id: payment.training_id,
            status: 'enrolled'
          },
          data: {
            status: 'pending_payment'
          }
        });
      }

      return payment;
    });

    logAuthEvent('PAYMENT_STATUS_UPDATED', adminId, {
      paymentId: paymentId,
      newStatus: status,
      enrollmentUpdated: status === 'verified' || status === 'failed'
    });

    return {
      id: result.id,
      user_id: result.user_id,
      training_id: result.training_id,
      amount: result.amount,
      status: result.status,
      updated_at: result.updated_at
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Create certificate (admin only)
 */
const createCertificate = async (adminId, adminRole, certificateData) => {
  try {
    const { user_id, training_id, issue_date, file_url } = certificateData;

    if (!user_id || !training_id || !issue_date) {
      throw new Error('User ID, training ID, and issue date are required');
    }

    // Generate unique certificate ID
    const certificate_id = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const certificate = await prisma.certificate.create({
      data: {
        user_id,
        training_id,
        certificate_id,
        issue_date: new Date(issue_date),
        file_url
      }
    });

    logAuthEvent('CERTIFICATE_CREATED', adminId, {
      certificateId: certificate.id,
      userId: user_id,
      trainingId: training_id
    });

    return {
      id: certificate.id,
      user_id: certificate.user_id,
      training_id: certificate.training_id,
      certificate_id: certificate.certificate_id,
      issue_date: certificate.issue_date,
      file_url: certificate.file_url,
      created_at: certificate.created_at
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Get all certificates (admin only)
 */
const getAllCertificates = async (adminId, adminRole, filters = {}) => {
  try {
    const where = {};

    if (filters.userId) {
      where.user_id = filters.userId;
    }

    if (filters.trainingId) {
      where.training_id = filters.trainingId;
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        user: { select: { full_name: true, email: true } },
        training_program: { select: { title: true } }
      },
      orderBy: { issue_date: 'desc' },
      take: 200
    });

    return certificates.map(certificate => ({
      id: certificate.id,
      certificate_id: certificate.certificate_id,
      issue_date: certificate.issue_date,
      file_url: certificate.file_url,
      created_at: certificate.created_at,
      user_id: certificate.user_id,
      full_name: certificate.user.full_name,
      email: certificate.user.email,
      training_id: certificate.training_id,
      training_title: certificate.training_program.title
    }));

  } catch (error) {
    throw error;
  }
};

/**
 * Get admin activity logs (admin only)
 */
const getAdminActivityLogs = async (adminId, adminRole, filters = {}) => {
  try {
    const where = {};

    if (filters.adminId) {
      where.admin_id = filters.adminId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    const logs = await prisma.adminActivityLog.findMany({
      where,
      include: {
        admin: { select: { full_name: true, email: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    return logs.map(log => ({
      id: log.id,
      action: log.action,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      details: log.details,
      ip_address: log.ip_address,
      created_at: log.created_at,
      admin_name: log.admin.full_name,
      admin_email: log.admin.email
    }));

  } catch (error) {
    throw error;
  }
};

/**
 * Get all contact messages (admin only)
 */
const getAllContactMessages = async (adminId, adminRole, filters = {}) => {
  try {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { full_name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const messages = await prisma.contactMessage.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100
    });

    return messages.map(message => ({
      id: message.id,
      full_name: message.full_name,
      email: message.email,
      subject: message.subject,
      message: message.message,
      status: message.status,
      created_at: message.created_at,
      updated_at: message.updated_at
    }));

  } catch (error) {
    throw error;
  }
};

/**
 * Update contact message status (admin only)
 */
const updateContactMessageStatus = async (adminId, adminRole, messageId, status) => {
  try {
    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      throw new Error('Invalid message status');
    }

    const message = await prisma.contactMessage.update({
      where: { id: messageId },
      data: { status: status }
    });

    if (!message) {
      throw new Error('Contact message not found');
    }

    logAuthEvent('CONTACT_MESSAGE_STATUS_UPDATED', adminId, {
      messageId: messageId,
      newStatus: status
    });

    return {
      id: message.id,
      full_name: message.full_name,
      email: message.email,
      subject: message.subject,
      status: message.status,
      updated_at: message.updated_at
    };

  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  getAllTrainingPrograms,
  createTrainingProgram,
  updateTrainingProgram,
  deleteTrainingProgram,
  getAllEnrollments,
  updateEnrollmentStatus,
  getAllPayments,
  updatePaymentStatus,
  createCertificate,
  getAllCertificates,
  getAdminActivityLogs,
  getAllContactMessages,
  updateContactMessageStatus
};
