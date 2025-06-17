const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      defaultValue: () => uuidv4()
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'refresh_tokens',
    underscored: true,
    hooks: {
      beforeCreate: (token) => {
        if (!token.token) {
          token.token = uuidv4();
        }
        // Set expiration to 7 days from now
        if (!token.expires_at) {
          token.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
      }
    }
  });

  RefreshToken.associate = function(models) {
    RefreshToken.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });
  };

  // Instance methods
  RefreshToken.prototype.isExpired = function() {
    return new Date() > this.expires_at;
  };

  RefreshToken.prototype.isValid = function() {
    return this.is_active && !this.isExpired() && !this.revoked_at;
  };

  RefreshToken.prototype.revoke = function() {
    this.is_active = false;
    this.revoked_at = new Date();
    return this.save();
  };

  // Class methods
  RefreshToken.findValidToken = function(token) {
    return this.findOne({
      where: {
        token,
        is_active: true,
        expires_at: {
          [sequelize.Sequelize.Op.gt]: new Date()
        },
        revoked_at: null
      },
      include: [{
        model: sequelize.models.User,
        as: 'user'
      }]
    });
  };

  RefreshToken.revokeAllUserTokens = async function(userId) {
    return this.update(
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
  };

  RefreshToken.cleanupExpired = async function() {
    return this.destroy({
      where: {
        expires_at: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  return RefreshToken;
}; 