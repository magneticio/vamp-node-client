'use strict';

module.exports = function () {
  return {
    boolean: function (string) {
      if (string == null) {
        return false;
      }
      string += '';
      switch (string.toLowerCase().trim()) {
        case "true":
        case "yes":
        case "1":
          return true;
        default:
          return false;
      }
    }
  };
};
