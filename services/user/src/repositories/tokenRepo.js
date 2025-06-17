const { RefreshToken } = require('../models');
const { Op } = require('sequelize');

class TokenRepository {
  async create(tokenData) {
    return RefreshToken.create({
      user_id: tokenData.user_id,
      user_agent: tokenData.user_agent,
      ip_address: tokenData.ip_address,
      expires_at: tokenData.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
  }

  async findByToken(token) {
    return RefreshToken.findOne({
      where: { token },
      include: [{
        model: require('../models').User,
        as: 'user'
      }]
    });
  }

  async findValidToken(token) {
    return RefreshToken.findOne({
      where: {
        token,
        is_active: true,
        expires_at: {
          [Op.gt]: new Date()
        },
        revoked_at: null
      },
      include: [{
        model: require('../models').User,
        as: 'user'
      }]
    });
  }

  async findByUserId(userId, options = {}) {
    const {
      limit = 10,
      offset = 0,
      includeExpired = false
    } = options;

    const whereClause = {
      user_id: userId
    };

    if (!includeExpired) {
      whereClause.expires_at = {
        [Op.gt]: new Date()
      };
      whereClause.is_active = true;
    }

    return RefreshToken.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });
  }

  async revokeToken(token) {
    const refreshToken = await this.findByToken(token);
    if (!refreshToken) {
      return null;
    }

    refreshToken.is_active = false;
    refreshToken.revoked_at = new Date();
    return refreshToken.save();
  }

  async revokeAllUserTokens(userId) {
    return RefreshToken.update(
      { 
        is_active: false,
        revoked_at: new Date()
      },
      {
        where: {
          user_id: userId,
          is_active: true
        }
      }
    );
  }

  async revokeAllTokensExcept(userId, currentToken) {
    return RefreshToken.update(
      { 
        is_active: false,
        revoked_at: new Date()
      },
      {
        where: {
          user_id: userId,
          token: {
            [Op.ne]: currentToken
          },
          is_active: true
        }
      }
    );
  }

  async deleteToken(token) {
    return RefreshToken.destroy({
      where: { token }
    });
  }

  async cleanupExpiredTokens() {
    return RefreshToken.destroy({
      where: {
        expires_at: {
          [Op.lt]: new Date()
        }
      }
    });
  }

  async cleanupRevokedTokens(olderThanDays = 30) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    return RefreshToken.destroy({
      where: {
        is_active: false,
        revoked_at: {
          [Op.lt]: cutoffDate
        }
      }
    });
  }

  async countActiveTokensByUser(userId) {
    return RefreshToken.count({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: {
          [Op.gt]: new Date()
        }
      }
    });
  }

  async getTokenStats() {
    const totalActive = await RefreshToken.count({
      where: {
        is_active: true,
        expires_at: {
          [Op.gt]: new Date()
        }
      }
    });

    const totalExpired = await RefreshToken.count({
      where: {
        expires_at: {
          [Op.lt]: new Date()
        }
      }
    });

    const totalRevoked = await RefreshToken.count({
      where: {
        is_active: false,
        revoked_at: {
          [Op.ne]: null
        }
      }
    });

    return {
      active: totalActive,
      expired: totalExpired,
      revoked: totalRevoked,
      total: totalActive + totalExpired + totalRevoked
    };
  }

  async findTokensExpiringIn(hours = 24) {
    const expiryThreshold = new Date(Date.now() + hours * 60 * 60 * 1000);
    
    return RefreshToken.findAll({
      where: {
        is_active: true,
        expires_at: {
          [Op.between]: [new Date(), expiryThreshold]
        }
      },
      include: [{
        model: require('../models').User,
        as: 'user'
      }]
    });
  }
}

module.exports = new TokenRepository(); 