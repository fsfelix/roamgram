const validator = (message, adminId) => {
    if (message.from.id == adminId) return true;
    return false;
  };

module.exports = validator;
