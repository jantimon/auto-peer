var util = {
  extend: function (dest, source) {
    source = source || {};
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        dest[key] = source[key];
      }
    }
    return dest;
  }
};

module.exports = util;