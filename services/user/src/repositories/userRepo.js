const { User } = require('../models');
const { Op } = require('sequelize');

class UserRepository {
  async create(userData) {
    return User.create({
      email: userData.email.toLowerCase(),
      password_hash: userData.password,
      full_name: userData.full_name,
      roles: userData.roles || ['member']
    });
  }

  async findById(id) {
    return User.findByPk(id);
  }

  async findByEmail(email) {
    return User.findOne({
      where: {
        email: email.toLowerCase()
      }
    });
  }

  async findActiveByEmail(email) {
    return User.findOne({
      where: {
        email: email.toLowerCase(),
        is_active: true
      }
    });
  }

  async update(id, updateData) {
    const [updatedRowsCount] = await User.update(updateData, {
      where: { id }
    });
    
    if (updatedRowsCount === 0) {
      return null;
    }
    
    return this.findById(id);
  }

  async updateLastLogin(id) {
    return User.update(
      { last_login: new Date() },
      { where: { id } }
    );
  }

  async delete(id) {
    return User.destroy({
      where: { id }
    });
  }

  async deactivate(id) {
    return this.update(id, { is_active: false });
  }

  async activate(id) {
    return this.update(id, { is_active: true });
  }

  async verifyEmail(id) {
    return this.update(id, { email_verified: true });
  }

  async findAll(options = {}) {
    const {
      limit = 50,
      offset = 0,
      order = [['created_at', 'DESC']],
      where = {}
    } = options;

    return User.findAndCountAll({
      where,
      limit,
      offset,
      order
    });
  }

  async searchByName(searchTerm, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    return User.findAndCountAll({
      where: {
        full_name: {
          [Op.iLike]: `%${searchTerm}%`
        },
        is_active: true
      },
      limit,
      offset,
      order: [['full_name', 'ASC']]
    });
  }

  async countByRole(role) {
    return User.count({
      where: {
        roles: {
          [Op.contains]: [role]
        },
        is_active: true
      }
    });
  }

  async findByRole(role, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    return User.findAndCountAll({
      where: {
        roles: {
          [Op.contains]: [role]
        },
        is_active: true
      },
      limit,
      offset,
      order: [['full_name', 'ASC']]
    });
  }
}

module.exports = new UserRepository(); 